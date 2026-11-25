# Using Outlook and Microsoft To Do

Command Center works with **Google, Microsoft, or both**. Google comes through Claude's Gmail, Google Calendar and Google Drive connectors. Microsoft (Outlook mail, Outlook calendar and Microsoft To Do) comes through a small **local server on your computer**, `cc-microsoft-mcp`, in this kit's `server/` folder.

## What the server can and can't do
- **Reads:** your calendars and events, recent inbox conversations, one conversation's messages, To Do tasks, and your recent OneDrive documents (for the Library).
- **Writes, each only after you confirm in Command Center:**
  - save an email draft
  - archive a conversation (move it to the Archive folder), with undo
  - create or move an event, with no attendees, so nobody is invited
  - answer an invite (the organizer is told)
  - To Do changes
  - create a new Word or Excel file in a OneDrive folder called "Command Center" (from the Library's Start a project; never shared, never overwrites)
- **Can't send email.** The server never asks Microsoft for the send permission, so it couldn't send even if something went wrong. Drafts wait in Outlook for you to send.
- **Can't delete anything.**

## Set it up (once, on your computer)
1. Install [uv](https://docs.astral.sh/uv/).
2. In a terminal, from this kit's `server` folder:
   ```
   uv tool install .
   cc-microsoft-mcp login
   ```
   Sign in with the Microsoft account you want Command Center to use. Personal Outlook.com accounts work. A school or work account works only if your school allows it; if you see "admin approval required", your school blocks it.
3. Add the server to the Claude desktop app's config file (`%APPDATA%\Claude\claude_desktop_config.json` on Windows), under `mcpServers`:
   ```json
   "cc-microsoft": { "command": "cc-microsoft-mcp" }
   ```
   Then fully quit and reopen the Claude desktop app.
4. In Command Center, open **Settings** (bottom of the page), tick **Microsoft**, press **Load my calendars**, and choose what each calendar is for.

## On your phone
The phone can't reach a server on your computer. When the page is open on your computer, it saves a copy of your Outlook calendar and inbox in Command Center's own storage, and the phone shows that copy. To Do changes made on the phone wait and are sent the next time the page is open on your computer.

## School Microsoft 365 accounts without the server
Claude also has a **Microsoft 365 connector** (search Outlook mail and calendar, find meeting times). It is read-only and works with school and work accounts. Command Center doesn't use it yet: its data format has to be checked with a real account first.

## Settings
| Setting | Default | Meaning |
|---|---|---|
| `CC_MS_TENANT` | `common` | `consumers` = personal accounts only; `organizations` = school or work only |
| `CC_TODO_TIME_ZONE` | `UTC` | Time zone written on To Do due dates and reminders |
