"""Command Center's local Microsoft server (MCP over stdio).

Gives the Command Center page Outlook mail and calendar and Microsoft To Do through Microsoft Graph,
for personal Microsoft accounts (Outlook.com) and, where the school allows it, school or work accounts.

Safety by design:
- It never asks Microsoft for permission to send mail (no Mail.Send scope), so it can't send, even by mistake.
  Mail tools are search, read, save a draft, and archive (move to the Archive folder) with undo.
- No delete tools of any kind. Calendar writes never add attendees, so creating or moving an event invites no one.
- Answering an invite (accept / maybe / decline) tells the organizer, like the Google version; the page asks first.

Times: events come back in UTC ("...Z"); all-day events come back as plain dates. New events are sent in UTC.

Commands:
  cc-microsoft-mcp          run the MCP server (what the Claude desktop app starts)
  cc-microsoft-mcp login    sign in through the browser and cache the login
  cc-microsoft-mcp check    confirm the cached login works
"""

from __future__ import annotations

import asyncio
import datetime as dt
import logging
import os
import re
import sys
from pathlib import Path
from typing import Any, Literal
from urllib.parse import quote

import httpx
from azure.identity import (
    AuthenticationRecord,
    AuthenticationRequiredError,
    InteractiveBrowserCredential,
    TokenCachePersistenceOptions,
)
from mcp.server.fastmcp import FastMCP
from mcp.types import ToolAnnotations

for _name in ("azure", "msal", "httpx"):
    logging.getLogger(_name).setLevel(logging.WARNING)

GRAPH = "https://graph.microsoft.com/v1.0"
# Microsoft's first-party "Microsoft Graph Command Line Tools" public client (no app registration needed).
CLIENT_ID = "14d82eec-204b-4c2f-b7e8-296a70dab67e"
# Deliberately NO Mail.Send: this server can save drafts but cannot send.
SCOPES = (
    "https://graph.microsoft.com/User.Read",
    "https://graph.microsoft.com/Tasks.ReadWrite",
    "https://graph.microsoft.com/Mail.ReadWrite",
    "https://graph.microsoft.com/Calendars.ReadWrite",
)
# "common" = personal and school/work accounts. Set CC_MS_TENANT=consumers for personal only.
TENANT = os.environ.get("CC_MS_TENANT", "common")
CONFIG_DIR = Path(os.environ.get("APPDATA") or Path.home()) / "cc-microsoft-mcp"
RECORD_PATH = CONFIG_DIR / "auth-record.json"
CACHE_NAME = "cc-microsoft-mcp"
SIGN_IN_MSG = "Microsoft sign-in needed. In a terminal run: cc-microsoft-mcp login"

IMPORTANCE = ("low", "normal", "high")
STATUSES = ("notStarted", "inProgress", "completed", "waitingOnOthers", "deferred")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
DATETIME_RE = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$")
UTC_RE = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?Z$")
TODO_TZ = os.environ.get("CC_TODO_TIME_ZONE", "UTC")

READ = ToolAnnotations(readOnlyHint=True, destructiveHint=False, idempotentHint=True, openWorldHint=False)
WRITE = ToolAnnotations(readOnlyHint=False, destructiveHint=False, idempotentHint=False, openWorldHint=False)
EDIT = ToolAnnotations(readOnlyHint=False, destructiveHint=False, idempotentHint=True, openWorldHint=False)


# ---------------------------------------------------------------- auth

def _load_record() -> AuthenticationRecord | None:
    try:
        return AuthenticationRecord.deserialize(RECORD_PATH.read_text(encoding="utf-8"))
    except (FileNotFoundError, ValueError):
        return None


def _make_credential(record: AuthenticationRecord | None, interactive: bool) -> InteractiveBrowserCredential:
    return InteractiveBrowserCredential(
        tenant_id=TENANT,
        client_id=CLIENT_ID,
        authentication_record=record,
        cache_persistence_options=TokenCachePersistenceOptions(name=CACHE_NAME),  # OS-encrypted token cache
        disable_automatic_authentication=not interactive,  # never pop a browser from server mode
    )


_credential: InteractiveBrowserCredential | None = None


def _server_credential() -> InteractiveBrowserCredential:
    global _credential
    if _credential is None:
        record = _load_record()
        if record is None:
            raise RuntimeError(SIGN_IN_MSG)
        _credential = _make_credential(record, interactive=False)
    return _credential


async def _token() -> str:
    try:
        tok = await asyncio.to_thread(_server_credential().get_token, *SCOPES)
    except AuthenticationRequiredError as e:
        raise RuntimeError(SIGN_IN_MSG) from e
    return tok.token


# ---------------------------------------------------------------- graph

async def _graph(method: str, path: str, *, params: dict | None = None, body: dict | None = None,
                 text_bodies: bool = False) -> dict:
    headers = {"Authorization": f"Bearer {await _token()}"}
    if text_bodies:
        headers["Prefer"] = 'outlook.body-content-type="text"'
    url = path if path.startswith("https://") else GRAPH + path
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.request(method, url, params=params, json=body, headers=headers)
    if r.status_code >= 400:
        try:
            err = r.json().get("error", {})
            msg = f"{err.get('code', 'error')}: {err.get('message', '')}"
        except ValueError:
            msg = r.text[:300]
        raise RuntimeError(f"Microsoft Graph {r.status_code} {msg}")
    return r.json() if r.content else {}


def _id(value: str, name: str) -> str:
    """Graph ids go into URL paths: allow only id characters, then percent-encode."""
    if not value or len(value) > 512 or not re.fullmatch(r"[A-Za-z0-9_\-=+/.]+", value):
        raise ValueError(f"Invalid {name}.")
    return quote(value, safe="")


def _odata_str(value: str) -> str:
    if not value or len(value) > 512:
        raise ValueError("Invalid id.")
    return value.replace("'", "''")


def _utc(value: str, name: str) -> str:
    if not UTC_RE.match(value or ""):
        raise ValueError(f"{name} must be UTC ISO time ending in Z, e.g. 2026-12-01T15:00:00Z.")
    return value


def _parse_utc(s: str) -> dt.datetime:
    return dt.datetime.fromisoformat(s.replace("Z", "+00:00"))


def _iso_z(d: dt.datetime) -> str:
    return d.astimezone(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


# ---------------------------------------------------------------- shaping (Graph → simple, page-friendly)

def _addr(x: dict | None) -> str:
    e = (x or {}).get("emailAddress") or {}
    name, mail = e.get("name") or "", e.get("address") or ""
    return f"{name} <{mail}>" if name and mail else (mail or name)


def _when(v: dict | None, all_day: bool) -> str | None:
    """Graph returns UTC (no Prefer header). All-day events: the plain date. Timed: ISO with Z."""
    if not v or not v.get("dateTime"):
        return None
    raw = v["dateTime"]
    if all_day:
        return raw[:10]
    return raw[:19] + "Z"


RESPONSE = {"none": "needsAction", "notResponded": "needsAction", "accepted": "accepted",
            "tentativelyAccepted": "tentative", "declined": "declined", "organizer": "accepted"}


def shape_event(e: dict) -> dict:
    all_day = bool(e.get("isAllDay"))
    org = (e.get("organizer") or {}).get("emailAddress") or {}
    return {
        "id": e.get("id", ""),
        "title": e.get("subject") or "(no title)",
        "start": _when(e.get("start"), all_day),
        "end": _when(e.get("end"), all_day),
        "all_day": all_day,
        "web_link": e.get("webLink") or "",
        "location": (e.get("location") or {}).get("displayName") or "",
        "description": (e.get("bodyPreview") or "")[:1000],
        "organizer": {"name": org.get("name") or "", "email": org.get("address") or ""},
        "is_organizer": bool(e.get("isOrganizer")),
        "my_response": RESPONSE.get(((e.get("responseStatus") or {}).get("response")) or "none", "needsAction"),
        "cancelled": bool(e.get("isCancelled")),
        "show_as": e.get("showAs") or "busy",
    }


def shape_message(m: dict) -> dict:
    return {
        "id": m.get("id", ""),
        "conversation_id": m.get("conversationId", ""),
        "subject": m.get("subject") or "(no subject)",
        "sender": _addr(m.get("from")),
        "date": m.get("receivedDateTime"),
        "snippet": (m.get("bodyPreview") or "")[:300],
        "web_link": m.get("webLink") or "",
        "is_read": bool(m.get("isRead")),
    }


def free_slots(busy: list[tuple[dt.datetime, dt.datetime]], start: dt.datetime, end: dt.datetime, minutes: int,
               day_start_hour: int, day_end_hour: int, utc_offset_minutes: int, limit: int = 6) -> list[dict]:
    """Gaps of at least `minutes` inside each local day's [day_start_hour, day_end_hour] window, between start and end.

    utc_offset_minutes is local time minus UTC (e.g. -360 for US Central in winter)."""
    off = dt.timedelta(minutes=utc_offset_minutes)
    need = dt.timedelta(minutes=minutes)
    busy = sorted((max(a, start), min(b, end)) for a, b in busy if b > start and a < end)
    out: list[dict] = []
    day = (start + off).date()
    while len(out) < limit:
        lo = dt.datetime.combine(day, dt.time(day_start_hour), dt.timezone.utc) - off
        hi = dt.datetime.combine(day, dt.time(min(day_end_hour, 23), 59 if day_end_hour >= 24 else 0), dt.timezone.utc) - off
        if lo >= end:
            break
        cur = max(lo, start)
        for a, b in busy + [(hi, hi)]:
            if b <= cur:
                continue
            gap_end = min(a, hi)
            if gap_end - cur >= need:
                out.append({"start": _iso_z(cur), "end": _iso_z(gap_end)})
                if len(out) >= limit:
                    break
            cur = max(cur, b)
            if cur >= hi:
                break
        day += dt.timedelta(days=1)
    return out


# ---------------------------------------------------------------- To Do (same tool names and arguments as the earlier To Do-only server)

def _tdt(v: dict | None) -> dict | None:
    if not v or not v.get("dateTime"):
        return None
    return {"date_time": v["dateTime"][:19], "time_zone": v.get("timeZone") or TODO_TZ}


def shape_task(t: dict) -> dict:
    due = _tdt(t.get("dueDateTime"))
    return {
        "id": t.get("id", ""), "title": t.get("title", ""), "status": t.get("status", "notStarted"),
        "importance": t.get("importance", "normal"), "categories": list(t.get("categories") or []),
        "due_date": due["date_time"][:10] if due else None,
        "reminder": _tdt(t.get("reminderDateTime")) if t.get("isReminderOn") else None,
        "body": (t.get("body") or {}).get("content") or "", "body_type": (t.get("body") or {}).get("contentType") or "text",
        "links": [{"id": l.get("id"), "web_url": l.get("webUrl"), "application_name": l.get("applicationName"),
                   "display_name": l.get("displayName"), "external_id": l.get("externalId")} for l in (t.get("linkedResources") or [])],
    }


def build_task_body(*, title=None, body=None, due_date=None, clear_due_date=False, importance=None, status=None,
                    categories=None, reminder=None, clear_reminder=False) -> dict:
    out: dict[str, Any] = {}
    if title is not None:
        title = title.strip()
        if not title or len(title) > 255:
            raise ValueError("Title must be 1-255 characters.")
        out["title"] = title
    if body is not None:
        out["body"] = {"content": body[:20000], "contentType": "text"}
    if clear_due_date:
        out["dueDateTime"] = None
    elif due_date is not None:
        if not DATE_RE.match(due_date):
            raise ValueError("due_date must be YYYY-MM-DD.")
        out["dueDateTime"] = {"dateTime": f"{due_date}T00:00:00", "timeZone": TODO_TZ}
    if importance is not None:
        if importance not in IMPORTANCE:
            raise ValueError(f"importance must be one of {IMPORTANCE}.")
        out["importance"] = importance
    if status is not None:
        if status not in STATUSES:
            raise ValueError(f"status must be one of {STATUSES}.")
        out["status"] = status
    if categories is not None:
        cats = [c.strip() for c in categories if c and c.strip()]
        if len(cats) > 25 or any(len(c) > 255 for c in cats):
            raise ValueError("Too many or too long categories.")
        out["categories"] = list(dict.fromkeys(cats))
    if clear_reminder:
        out["isReminderOn"] = False
    elif reminder is not None:
        if not DATETIME_RE.match(reminder):
            raise ValueError("reminder must be local time YYYY-MM-DDTHH:MM.")
        out["reminderDateTime"] = {"dateTime": reminder if len(reminder) == 19 else reminder + ":00", "timeZone": TODO_TZ}
        out["isReminderOn"] = True
    return out


def build_link(web_url: str, application_name: str, display_name: str | None, external_id: str | None) -> dict:
    if not web_url.startswith("https://") or len(web_url) > 2000:
        raise ValueError("Link web_url must start with https://")
    if not application_name or len(application_name) > 100:
        raise ValueError("application_name is required.")
    link = {"webUrl": web_url, "applicationName": application_name}
    if display_name:
        link["displayName"] = display_name[:255]
    if external_id:
        link["externalId"] = external_id[:255]
    return link


# ---------------------------------------------------------------- tools

mcp = FastMCP("cc-microsoft")


@mcp.tool(title="Who am I", annotations=READ)
async def whoami() -> dict:
    """Show which Microsoft account this server is signed in as."""
    me = await _graph("GET", "/me", params={"$select": "displayName,userPrincipalName,mail"})
    return {"name": me.get("displayName"), "account": me.get("mail") or me.get("userPrincipalName")}


# ----- calendar

@mcp.tool(title="List calendars", annotations=READ)
async def list_calendars() -> dict:
    """List the Outlook calendars this account has."""
    r = await _graph("GET", "/me/calendars", params={"$select": "id,name,isDefaultCalendar,canEdit,owner", "$top": "100"})
    return {"calendars": [{"id": c.get("id"), "name": c.get("name"), "is_default": bool(c.get("isDefaultCalendar")),
                           "can_edit": bool(c.get("canEdit")), "owner": ((c.get("owner") or {}).get("address") or "")}
                          for c in r.get("value", [])]}


@mcp.tool(title="List events", annotations=READ)
async def list_events(calendar_id: str, start: str, end: str, max_results: int = 150) -> dict:
    """Events on one calendar between start and end (UTC ISO, ending in Z). Recurring events are expanded.

    Each event: id, title, start/end (UTC ISO with Z, or a plain date for all-day events), all_day, web_link,
    organizer, is_organizer, my_response (needsAction / accepted / tentative / declined), cancelled, show_as."""
    params = {"startDateTime": _utc(start, "start"), "endDateTime": _utc(end, "end"), "$top": str(max(1, min(int(max_results), 250))),
              "$orderby": "start/dateTime",
              "$select": "id,subject,start,end,isAllDay,webLink,location,organizer,isOrganizer,responseStatus,isCancelled,bodyPreview,showAs"}
    r = await _graph("GET", f"/me/calendars/{_id(calendar_id, 'calendar_id')}/calendarView", params=params)
    return {"events": [shape_event(e) for e in r.get("value", []) if not e.get("isCancelled")]}


@mcp.tool(title="Create event", annotations=WRITE)
async def create_event(calendar_id: str, title: str, start: str, end: str, all_day: bool = False, description: str | None = None) -> dict:
    """Create an event with NO attendees (nobody is invited). start/end: UTC ISO ending in Z, or YYYY-MM-DD when all_day."""
    title = (title or "").strip()
    if not title or len(title) > 255:
        raise ValueError("Title must be 1-255 characters.")
    if all_day:
        if not (DATE_RE.match(start) and DATE_RE.match(end)) or end <= start:
            raise ValueError("All-day events need start and end as YYYY-MM-DD, end after start.")
        s, e = {"dateTime": start + "T00:00:00", "timeZone": "UTC"}, {"dateTime": end + "T00:00:00", "timeZone": "UTC"}
    else:
        if _parse_utc(_utc(end, "end")) <= _parse_utc(_utc(start, "start")):
            raise ValueError("end must be after start.")
        s, e = {"dateTime": start[:19], "timeZone": "UTC"}, {"dateTime": end[:19], "timeZone": "UTC"}
    body: dict[str, Any] = {"subject": title, "start": s, "end": e, "isAllDay": bool(all_day)}
    if description:
        body["body"] = {"contentType": "text", "content": description[:4000]}
    ev = await _graph("POST", f"/me/calendars/{_id(calendar_id, 'calendar_id')}/events", body=body)
    return shape_event(ev)


@mcp.tool(title="Move event", annotations=EDIT)
async def update_event(event_id: str, start: str, end: str) -> dict:
    """Change only an event's start and end (UTC ISO ending in Z). Attendees and everything else stay as they are."""
    if _parse_utc(_utc(end, "end")) <= _parse_utc(_utc(start, "start")):
        raise ValueError("end must be after start.")
    ev = await _graph("PATCH", f"/me/events/{_id(event_id, 'event_id')}",
                      body={"start": {"dateTime": start[:19], "timeZone": "UTC"}, "end": {"dateTime": end[:19], "timeZone": "UTC"}})
    return shape_event(ev)


@mcp.tool(title="Answer an invite", annotations=WRITE)
async def respond_to_event(event_id: str, response: Literal["accepted", "tentative", "declined"]) -> dict:
    """Accept, tentatively accept or decline an invite. The organizer is told your answer."""
    action = {"accepted": "accept", "tentative": "tentativelyAccept", "declined": "decline"}[response]
    await _graph("POST", f"/me/events/{_id(event_id, 'event_id')}/{action}", body={"sendResponse": True})
    return {"event_id": event_id, "response": response}


@mcp.tool(title="Find free time", annotations=READ)
async def find_free_time(start: str, end: str, duration_minutes: int, utc_offset_minutes: int,
                         calendar_ids: list[str] | None = None, day_start_hour: int = 8, day_end_hour: int = 22) -> dict:
    """Free slots of at least duration_minutes between start and end (UTC ISO with Z), inside each local day's
    day_start_hour..day_end_hour. utc_offset_minutes = local time minus UTC (e.g. -360 for US Central in winter).
    Busy time comes from the given calendars (default: the main calendar); events marked free don't count."""
    s, e = _parse_utc(_utc(start, "start")), _parse_utc(_utc(end, "end"))
    if not 5 <= int(duration_minutes) <= 600:
        raise ValueError("duration_minutes must be 5-600.")
    paths = [f"/me/calendars/{_id(c, 'calendar_id')}/calendarView" for c in (calendar_ids or [])] or ["/me/calendarView"]
    busy: list[tuple[dt.datetime, dt.datetime]] = []
    for path in paths[:6]:
        r = await _graph("GET", path, params={"startDateTime": start, "endDateTime": end, "$top": "250",
                                              "$select": "start,end,isAllDay,showAs,isCancelled"})
        for ev in r.get("value", []):
            if ev.get("isCancelled") or ev.get("showAs") == "free" or ev.get("isAllDay"):
                continue
            busy.append((_parse_utc(ev["start"]["dateTime"][:19] + "Z"), _parse_utc(ev["end"]["dateTime"][:19] + "Z")))
    return {"time_slots": free_slots(busy, s, e, int(duration_minutes), int(day_start_hour), int(day_end_hour), int(utc_offset_minutes))}


# ----- mail (search, read, draft, archive; never send, never delete)

@mcp.tool(title="Search inbox", annotations=READ)
async def search_messages(unread_only: bool = True, days: int = 14, max_results: int = 10, focused_only: bool = True) -> dict:
    """Recent inbox conversations, newest first, one entry per conversation (its newest message).

    Each thread: id (the conversation id), message_id, subject, sender ("Name <email>"), date, snippet, web_link."""
    since = _iso_z(dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=max(1, min(int(days), 60))))
    r = await _graph("GET", "/me/mailFolders/inbox/messages", params={
        "$filter": f"receivedDateTime ge {since}", "$orderby": "receivedDateTime desc", "$top": "50",
        "$select": "id,conversationId,subject,from,receivedDateTime,bodyPreview,webLink,isRead,inferenceClassification"})
    seen, threads = set(), []
    for m in r.get("value", []):
        if unread_only and m.get("isRead"):
            continue
        if focused_only and m.get("inferenceClassification") == "other":
            continue
        cid = m.get("conversationId")
        if not cid or cid in seen:
            continue
        seen.add(cid)
        sm = shape_message(m)
        threads.append({"id": cid, "message_id": sm["id"], "subject": sm["subject"], "sender": sm["sender"],
                        "date": sm["date"], "snippet": sm["snippet"], "web_link": sm["web_link"]})
        if len(threads) >= max(1, min(int(max_results), 25)):
            break
    return {"threads": threads}


@mcp.tool(title="Read a conversation", annotations=READ)
async def get_thread(conversation_id: str, max_messages: int = 10) -> dict:
    """The messages in one conversation, oldest first, as plain text (plaintextBody)."""
    r = await _graph("GET", "/me/messages", text_bodies=True, params={
        "$filter": f"conversationId eq '{_odata_str(conversation_id)}'", "$top": str(max(1, min(int(max_messages), 25))),
        "$select": "id,subject,from,receivedDateTime,body,webLink"})
    msgs = sorted(r.get("value", []), key=lambda m: m.get("receivedDateTime") or "")
    return {"messages": [{"id": m.get("id"), "subject": m.get("subject") or "", "sender": _addr(m.get("from")),
                          "date": m.get("receivedDateTime"), "plaintextBody": ((m.get("body") or {}).get("content") or "")[:20000],
                          "web_link": m.get("webLink") or ""} for m in msgs]}


@mcp.tool(title="Save a draft", annotations=WRITE)
async def create_draft(subject: str, body: str, to: list[str] | None = None, reply_to_message_id: str | None = None) -> dict:
    """Save an email draft in Outlook. It is NOT sent (this server has no permission to send).

    With reply_to_message_id the draft is a reply in that conversation, with the original quoted below."""
    if not body or len(body) > 20000:
        raise ValueError("body must be 1-20000 characters.")
    recips = [{"emailAddress": {"address": a.strip()}} for a in (to or []) if a and "@" in a][:20]
    if reply_to_message_id:
        d = await _graph("POST", f"/me/messages/{_id(reply_to_message_id, 'reply_to_message_id')}/createReply", body={"comment": body})
        if recips:
            d = await _graph("PATCH", f"/me/messages/{_id(d.get('id', ''), 'draft id')}", body={"toRecipients": recips})
    else:
        d = await _graph("POST", "/me/messages", body={"subject": (subject or "")[:250], "body": {"contentType": "text", "content": body},
                                                      "toRecipients": recips})
    return {"id": d.get("id"), "web_link": d.get("webLink") or "", "is_draft": True}


@mcp.tool(title="Archive a conversation", annotations=EDIT)
async def archive_thread(conversation_id: str) -> dict:
    """Move a conversation's inbox messages to the Archive folder (nothing is deleted). Returns the moved message ids for undo."""
    r = await _graph("GET", "/me/mailFolders/inbox/messages", params={
        "$filter": f"conversationId eq '{_odata_str(conversation_id)}'", "$top": "25", "$select": "id"})
    moved = []
    for m in r.get("value", []):
        n = await _graph("POST", f"/me/messages/{_id(m['id'], 'message id')}/move", body={"destinationId": "archive"})
        moved.append(n.get("id"))
    return {"moved": [x for x in moved if x]}


@mcp.tool(title="Move back to inbox", annotations=EDIT)
async def move_to_inbox(message_ids: list[str]) -> dict:
    """Undo an archive: move these messages back to the inbox."""
    back = []
    for mid in (message_ids or [])[:25]:
        n = await _graph("POST", f"/me/messages/{_id(mid, 'message id')}/move", body={"destinationId": "inbox"})
        back.append(n.get("id"))
    return {"moved": [x for x in back if x]}


# ----- Microsoft To Do (same names and arguments as the original To Do server)

@mcp.tool(title="List task lists", annotations=READ)
async def list_task_lists() -> dict:
    """List Microsoft To Do lists. is_default marks the built-in Tasks list."""
    r = await _graph("GET", "/me/todo/lists")
    return {"task_lists": [{"id": tl.get("id"), "name": tl.get("displayName"), "is_default": tl.get("wellknownListName") == "defaultList"}
                           for tl in r.get("value", [])]}


@mcp.tool(title="List tasks", annotations=READ)
async def list_tasks(list_id: str, status: Literal["open", "completed", "all"] = "open", max_results: int = 200) -> dict:
    """List tasks in one list with categories, due dates, reminders and links."""
    params: dict[str, str] = {"$top": "100", "$expand": "linkedResources"}
    if status == "open":
        params["$filter"] = "status ne 'completed'"
    elif status == "completed":
        params["$filter"] = "status eq 'completed'"
    cap = max(1, min(int(max_results), 500))
    tasks: list[dict] = []
    page = await _graph("GET", f"/me/todo/lists/{_id(list_id, 'list_id')}/tasks", params=params)
    while True:
        tasks.extend(shape_task(t) for t in page.get("value", []))
        nxt = page.get("@odata.nextLink")
        if len(tasks) >= cap or not nxt or not nxt.startswith(GRAPH):
            break
        page = await _graph("GET", nxt)
    return {"tasks": tasks[:cap]}


@mcp.tool(title="Create task", annotations=WRITE)
async def create_task(list_id: str, title: str, body: str | None = None, due_date: str | None = None,
                      importance: Literal["low", "normal", "high"] | None = None, categories: list[str] | None = None,
                      reminder: str | None = None, link_url: str | None = None, link_app: str | None = None,
                      link_title: str | None = None, link_external_id: str | None = None) -> dict:
    """Create a task. due_date YYYY-MM-DD; reminder local YYYY-MM-DDTHH:MM; optional link back to where it came from."""
    data = build_task_body(title=title, body=body, due_date=due_date, importance=importance, categories=categories, reminder=reminder)
    if link_url:
        data["linkedResources"] = [build_link(link_url, link_app or "Link", link_title, link_external_id)]
    return shape_task(await _graph("POST", f"/me/todo/lists/{_id(list_id, 'list_id')}/tasks", body=data))


@mcp.tool(title="Update task", annotations=EDIT)
async def update_task(list_id: str, task_id: str, title: str | None = None, body: str | None = None, due_date: str | None = None,
                      clear_due_date: bool = False, importance: Literal["low", "normal", "high"] | None = None,
                      status: Literal["notStarted", "inProgress", "completed", "waitingOnOthers", "deferred"] | None = None,
                      categories: list[str] | None = None, reminder: str | None = None, clear_reminder: bool = False) -> dict:
    """Update only the given fields. To "remove" a task, complete it or set categories ["Archived"]; there is no delete."""
    data = build_task_body(title=title, body=body, due_date=due_date, clear_due_date=clear_due_date, importance=importance,
                           status=status, categories=categories, reminder=reminder, clear_reminder=clear_reminder)
    if not data:
        raise ValueError("Nothing to update.")
    return shape_task(await _graph("PATCH", f"/me/todo/lists/{_id(list_id, 'list_id')}/tasks/{_id(task_id, 'task_id')}", body=data))


@mcp.tool(title="Complete task", annotations=EDIT)
async def complete_task(list_id: str, task_id: str) -> dict:
    """Mark a task completed."""
    return await update_task(list_id, task_id, status="completed")


@mcp.tool(title="Add link to task", annotations=WRITE)
async def add_task_link(list_id: str, task_id: str, web_url: str, application_name: str,
                        display_name: str | None = None, external_id: str | None = None) -> dict:
    """Attach a link (e.g. a calendar block or an email) to a task."""
    link = build_link(web_url, application_name, display_name, external_id)
    r = await _graph("POST", f"/me/todo/lists/{_id(list_id, 'list_id')}/tasks/{_id(task_id, 'task_id')}/linkedResources", body=link)
    return {"id": r.get("id"), "web_url": r.get("webUrl"), "application_name": r.get("applicationName")}


# ---------------------------------------------------------------- CLI

def login() -> int:
    print("Opening Microsoft sign-in in your browser. Use the Microsoft account you want Command Center to read.")
    cred = _make_credential(_load_record(), interactive=True)
    try:
        record = cred.authenticate(scopes=list(SCOPES))
    except Exception as e:  # noqa: BLE001 - show the reason (e.g. the school requires admin approval)
        print(f"Sign-in failed: {type(e).__name__}: {str(e)[:800]}")
        return 1
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    RECORD_PATH.write_text(record.serialize(), encoding="utf-8")
    print(f"Signed in as {record.username}.")
    return check()


def check() -> int:
    async def run() -> None:
        me = await whoami()
        cals = await list_calendars()
        print(f"Login OK: {me['account']}. {len(cals['calendars'])} calendar(s).")
    try:
        asyncio.run(run())
        return 0
    except Exception as e:  # noqa: BLE001
        print(f"Check failed: {str(e)[:800]}")
        return 1


def main() -> None:
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "login":
        sys.exit(login())
    if cmd == "check":
        sys.exit(check())
    mcp.run()


if __name__ == "__main__":
    main()
