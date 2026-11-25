"""Tests for the Command Center Microsoft server. Microsoft Graph is replaced by a recording fake; nothing is sent anywhere."""
import asyncio
import datetime as dt

import pytest

from cc_microsoft_mcp import server as s


def tool_names():
    return {t.name for t in asyncio.run(s.mcp.list_tools())}


class FakeGraph:
    def __init__(self, responses=None):
        self.calls, self.responses = [], responses or {}

    async def __call__(self, method, path, *, params=None, body=None, text_bodies=False):
        self.calls.append((method, path, params, body))
        for (m, frag), resp in self.responses.items():
            if m == method and frag in path:
                return resp(params, body) if callable(resp) else resp
        return {}


@pytest.fixture
def graph(monkeypatch):
    g = FakeGraph()
    monkeypatch.setattr(s, "_graph", g)
    return g


# ---- safety
def test_cannot_send_mail():
    assert not [x for x in s.SCOPES if "Mail.Send" in x]
    assert not [n for n in tool_names() if any(w in n for w in ("send", "forward", "reply_all"))]


def test_no_delete_tools():
    assert not [n for n in tool_names() if "delete" in n or "remove" in n or "trash" in n]


def test_expected_tools():
    assert tool_names() == {
        "whoami", "list_calendars", "list_events", "create_event", "update_event", "respond_to_event", "find_free_time",
        "search_messages", "get_thread", "create_draft", "archive_thread", "move_to_inbox",
        "list_task_lists", "list_tasks", "create_task", "update_task", "complete_task", "add_task_link",
    }


def test_ids_cannot_change_the_url():
    with pytest.raises(ValueError):
        s._id("abc/../../me/sendMail?x", "id")
    assert s._id("AAMk+ab/c==", "id") == "AAMk%2Bab%2Fc%3D%3D"


# ---- calendar
def test_event_shapes_timed_and_all_day():
    timed = s.shape_event({"id": "e1", "subject": "Lab", "start": {"dateTime": "2026-12-01T15:00:00.0000000", "timeZone": "UTC"},
                           "end": {"dateTime": "2026-12-01T16:00:00.0000000"}, "responseStatus": {"response": "notResponded"},
                           "organizer": {"emailAddress": {"name": "Pat", "address": "pat@example.edu"}}})
    assert timed["start"] == "2026-12-01T15:00:00Z" and timed["my_response"] == "needsAction" and timed["organizer"]["email"] == "pat@example.edu"
    allday = s.shape_event({"id": "e2", "subject": "Break", "isAllDay": True, "start": {"dateTime": "2026-12-20T00:00:00.0000000"},
                            "end": {"dateTime": "2026-12-21T00:00:00.0000000"}})
    assert allday["start"] == "2026-12-20" and allday["all_day"] is True


def test_create_event_has_no_attendees(graph):
    graph.responses[("POST", "/events")] = {"id": "n1", "subject": "Focus", "start": {"dateTime": "2026-12-01T15:00:00"}, "end": {"dateTime": "2026-12-01T16:00:00"}}
    asyncio.run(s.create_event("cal1", "Focus", "2026-12-01T15:00:00Z", "2026-12-01T16:00:00Z"))
    method, path, _, body = graph.calls[0]
    assert method == "POST" and path == "/me/calendars/cal1/events"
    assert "attendees" not in body and body["start"] == {"dateTime": "2026-12-01T15:00:00", "timeZone": "UTC"}


def test_create_event_rejects_local_times():
    with pytest.raises(ValueError):
        asyncio.run(s.create_event("cal1", "Focus", "2026-12-01T15:00", "2026-12-01T16:00"))


def test_update_event_only_moves_times(graph):
    asyncio.run(s.update_event("e1", "2026-12-02T15:00:00Z", "2026-12-02T16:00:00Z"))
    assert set(graph.calls[0][3]) == {"start", "end"}


def test_free_slots_skip_busy_time():
    busy = [(dt.datetime(2026, 12, 1, 15, tzinfo=dt.timezone.utc), dt.datetime(2026, 12, 1, 17, tzinfo=dt.timezone.utc))]
    start = dt.datetime(2026, 12, 1, 14, tzinfo=dt.timezone.utc)
    end = dt.datetime(2026, 12, 1, 23, tzinfo=dt.timezone.utc)
    slots = s.free_slots(busy, start, end, 60, 8, 22, 0)
    assert slots[0] == {"start": "2026-12-01T14:00:00Z", "end": "2026-12-01T15:00:00Z"}
    assert slots[1] == {"start": "2026-12-01T17:00:00Z", "end": "2026-12-01T22:00:00Z"}


def test_free_slots_respect_local_day():
    # US Central (UTC-6): the 8:00-22:00 local window is 14:00-04:00 UTC.
    start = dt.datetime(2026, 12, 1, 12, tzinfo=dt.timezone.utc)
    slots = s.free_slots([], start, start + dt.timedelta(hours=20), 30, 8, 22, -360, limit=1)
    assert slots[0]["start"] == "2026-12-01T14:00:00Z"


# ---- mail
def test_search_groups_conversations_and_skips_read(graph):
    graph.responses[("GET", "/mailFolders/inbox/messages")] = {"value": [
        {"id": "m3", "conversationId": "c1", "subject": "Re: Lab", "from": {"emailAddress": {"name": "Pat", "address": "pat@example.edu"}}, "isRead": False},
        {"id": "m2", "conversationId": "c1", "subject": "Lab", "isRead": False},
        {"id": "m1", "conversationId": "c2", "subject": "Old", "isRead": True},
        {"id": "m0", "conversationId": "c3", "subject": "Promo", "isRead": False, "inferenceClassification": "other"}]}
    r = asyncio.run(s.search_messages())
    assert [t["id"] for t in r["threads"]] == ["c1"]
    assert r["threads"][0]["message_id"] == "m3" and r["threads"][0]["sender"] == "Pat <pat@example.edu>"


def test_reply_draft_uses_create_reply_and_never_sends(graph):
    graph.responses[("POST", "/createReply")] = {"id": "d1", "webLink": "https://outlook.example/d1"}
    r = asyncio.run(s.create_draft("Re: Lab", "Thanks!", reply_to_message_id="m3"))
    assert graph.calls[0][1] == "/me/messages/m3/createReply" and graph.calls[0][3] == {"comment": "Thanks!"}
    assert r["is_draft"] is True
    assert not [c for c in graph.calls if "send" in c[1].lower()]


def test_new_draft(graph):
    asyncio.run(s.create_draft("Update", "Hi all", to=[]))
    assert graph.calls[0][:2] == ("POST", "/me/messages")


def test_archive_moves_to_archive_and_undo_moves_back(graph):
    graph.responses[("GET", "/mailFolders/inbox/messages")] = {"value": [{"id": "m3"}, {"id": "m2"}]}
    graph.responses[("POST", "/move")] = lambda p, b: {"id": "new-" + b["destinationId"]}
    r = asyncio.run(s.archive_thread("c1"))
    assert [c[3] for c in graph.calls if c[0] == "POST"] == [{"destinationId": "archive"}] * 2 and r["moved"] == ["new-archive"] * 2
    graph.calls.clear()
    asyncio.run(s.move_to_inbox(["a1"]))
    assert graph.calls[0][3] == {"destinationId": "inbox"}


def test_quotes_in_conversation_ids_are_escaped():
    assert s._odata_str("ab'c") == "ab''c"


# ---- To Do (unchanged behaviour)
def test_task_body():
    assert s.build_task_body(status="completed") == {"status": "completed"}
    b = s.build_task_body(title=" Lab ", categories=["School", "School", " "], due_date="2026-12-01")
    assert b["title"] == "Lab" and b["categories"] == ["School"] and b["dueDateTime"]["dateTime"] == "2026-12-01T00:00:00"
