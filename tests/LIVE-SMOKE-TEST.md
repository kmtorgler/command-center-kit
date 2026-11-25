# Command Center: live smoke test

The automated tests (`runner.html`) prove what the page *would* send. These checks prove it works against your real accounts. Do them once in the **Claude desktop app on your PC**, top to bottom, in about 20 minutes. Everything here makes test items you can clean up yourself afterwards. Nothing is sent to anyone.

**Before you start:** create a To Do task called **CC test — safe to archive** (Topic: Personal, due tomorrow). Use it wherever a task is needed.

Tick each line: ✅ worked · ❌ didn't (write what you saw).

## Phase 4

| # | Do this | You should see | Result |
|---|---|---|---|
| 1 | Install the Command Center as an app (Install as app, top right), open it, press the **bell** on Alerts, and allow | The bell turns orange. Nothing pops up for alerts already showing | |
| 2 | Set the test task's due date to **today**, then wait up to a minute | One Windows notification: "Task due today: CC test…". It does not repeat | |
| 3 | First give one class notebook a source (Classes → open a study item → Send to NotebookLM). Then press **Brief me** (book icon) on that class's Canvas item | A concepts-only brief within about a minute. If the notebook is still empty, a clear "no sources yet" message, not raw code | |
| 4 | In the brief, press **Save to task notes** (or **Make a task with this brief**) and confirm | The brief appears in that task's notes in the To Do app, between "—— NotebookLM brief ——" lines | |
| 5 | On the test task, press **Plan with Claude** (sparkle-list icon) | Steps with minutes, plus things Claude could make. No Opus agent is pre-selected and nothing is ticked | |
| 6 | **Steps → To Do**, choose "As a checklist", then confirm | A ☐ checklist at the end of the test task's notes in To Do. Doing it again replaces it rather than adding a second one | |
| 7 | Press the calendar icon on one step and confirm | A `[CC] …` event on your Personal calendar, and a Google Calendar link on the test task | |
| 8 | Tick one cheap deliverable (Writer or Personal assistant) → **Hand to Claude** → confirm | It shows under "Send to an agent" as pending, "For task 'CC test…'" | |
| 9 | In Claude chat, say **"check my Command Center queue"** | Claude runs it, saves a Google Doc or Gmail **draft**, marks the request done, and adds a link to the To Do task. The task shows an orange **Result** link | |
| 10 | On your phone (Claude app → pinned Command Center): open Plan with Claude on the test task and do Steps → To Do as separate tasks | The steps show "waiting to sync". When you next open the page on your PC and press **Sync**, they appear in To Do | |

## Phase 2 and 3 buttons (never tried live yet)

| # | Do this | You should see | Result |
|---|---|---|---|
| 11 | Inbox: **Archive** an unimportant email, then press **Undo** within 8 s | It leaves the inbox, then comes back | |
| 12 | Inbox: **Label** an email with one of your labels (leave "also archive" off) | The label shows on it in Gmail | |
| 13 | Inbox: **Draft a reply**, then Review → Save draft | A draft in that Gmail thread, addressed to the sender. **Not sent.** Delete the draft in Gmail afterwards | |
| 14 | Inbox header: **organization update** → draft → save | A draft with no recipients in Gmail Drafts. Delete it afterwards | |
| 15 | Run sheet: **Quick add** "CC test event tomorrow 3-4pm" | The parsed preview, then the event on Personal. Delete it in Google Calendar afterwards | |
| 16 | Run sheet: **Reschedule** the `[CC]` block from step 7 to another time | The event moves. If it's linked to the test task, the task's due date moves too | |
| 17 | Block time → **Find a free time** | Free slots from your personal, work and organization calendars | |
| 18 | **Plan my day**, tick one future block, press the calendar icon | A `[CC]` event for that block | |
| 19 | Next time a real invite is waiting: **Accept / Maybe / Decline** | Your answer shows in Google Calendar, and the organizer is told | |

## Clean up
- Archive the test task(s) in Command Center. They stay in To Do with the Archived tag; delete them in the To Do app if you like.
- Delete the `[CC]` test events and the test drafts in Google Calendar and Gmail yourself.

If anything shows ❌, tell Claude the number and what you saw.
