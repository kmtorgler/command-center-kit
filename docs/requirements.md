# Command Center requirements

Every student's copy must meet the **core** requirements. **Feature** requirements apply only when the student uses that feature (`tests/project.json`). Each requirement is proved by a test group in `tests/test-plan.json`.

This list is a starting point, not the full set. When the setup Claude adds or changes something for a student, it writes new requirements here (or in the student's own copy) and adds tests for them. See `.claude/skills/project-tests/SKILL.md`.

_Origin: translated from the test suite of the first Command Center (one student's personal copy). That copy's school- and organization-specific checks (its own theme, names and calendars) were generalized or dropped._

## Core: every copy

### Safety
| ID | Requirement | Proved by |
|---|---|---|
| REQ-SAFE-1 | Nothing is ever sent, forwarded, trashed or deleted. No send, reply, forward, trash or delete tool is declared or called, for Google or Microsoft. | core-safety; `build.py` static check |
| REQ-SAFE-2 | Every write to mail, calendar, tasks or the agent queue is shown first in a confirm or review step, with the exact arguments under "Technical details". Exceptions: Undo of something the person just did, and saving a form the person filled in themselves. | core-safety (Google), microsoft (Outlook); `build.py` "never called directly" checks |
| REQ-SAFE-3 | The local Microsoft server cannot send mail (it never requests Mail.Send) and has no delete tools. Events it creates or moves have no attendees. | `server/tests` |

### Privacy
| ID | Requirement | Proved by |
|---|---|---|
| REQ-PRIV-1 | The kit contains no personal data: no real names, schools, organizations, calendar IDs or email addresses. Test data is made up. | `build.py` personal-data scan |
| REQ-PRIV-2 | Nothing connects to any account until the profile says which accounts the person uses. | core-setup, microsoft |
| REQ-PRIV-3 | Each person uses their own private copy. Its database is readable and writable by the owner only. Email content goes to Claude only when the person asks for something that needs it. | publish settings (`docs/capabilities.md`) |

### Accessibility (WCAG 2.2 AA)
| ID | Requirement | Proved by |
|---|---|---|
| REQ-A11Y-1 | Keyboard focus stays on, or next to, the control just used when a list refreshes, including after a background refresh. | core-accessibility |
| REQ-A11Y-2 | Status messages are announced to screen readers. Undo can be paused (hover or focus), triggered with Ctrl+Z, and closed with Escape. | core-accessibility |
| REQ-A11Y-3 | Meaning never depends on colour alone (quiz answers, importance, source). | core-accessibility |
| REQ-A11Y-4 | The focus ring is at least 3:1 against every surface it sits on. | core-accessibility, core-themes |
| REQ-A11Y-5 | Every field has a name. Invalid fields are marked (aria-invalid), described and focused. The page has landmarks and a skip link. | core-accessibility, core-setup |

### Setup and themes
| ID | Requirement | Proved by |
|---|---|---|
| REQ-SETUP-1 | On first use a setup wizard asks who the person is (name, school, studies, organization and role, work) and which accounts they use (Google, Microsoft or both). Name is required. | core-setup |
| REQ-SETUP-2 | Calendars are loaded from the person's accounts, each guessed by purpose (own, class deadlines, organization, work, family), and the person can change any guess. | core-setup |
| REQ-THEME-1 | An Accessible theme is the default, and a Dark theme is built in. | core-themes |
| REQ-THEME-2 | A custom theme is adjusted until text on its colours is at least 4.5:1. | core-themes |
| REQ-THEME-3 | Theme suggestions use colours only (no logos, mascots, mottos or trademarked names) and are based only on what the person told us. | core-themes |
| REQ-FR-1 | A Feature request link gives an optional quick check and queues the request for the product-manager agent. | core-feature-request |
| REQ-QUEUE-1 | Agent requests show their status, and a finished one shows its result: a link (https only) or the full text, which the student can expand. | core-queue |
| REQ-DEV-1 | Desktop-only actions (window sizing, notifications) never run on a phone. | core-device |

## Features

| ID | Feature | Requirement | Proved by |
|---|---|---|---|
| REQ-TASK-1 | tasks-builtin | Tasks are saved in Command Center's own database, work on the phone, and never call To Do. | tasks-builtin |
| REQ-TASK-2 | microsoft-todo | When To Do can't be reached (phone), changes wait in an outbox and the last synced copy is shown. Done tasks drop off after 7 days. | tasks-microsoft-todo-offline |
| REQ-TASK-3 | microsoft-todo | Notes are never rewritten when only part of them is known (more than 2,000 characters on the phone) or when they are formatted in To Do. | tasks-microsoft-todo-offline, plan-with-claude |
| REQ-MAIL-1 | google | Archive and Label act on the email's own account, with Undo. Labels list only the person's own labels. | google-mail |
| REQ-MAIL-2 | google / microsoft | Draft reply saves a draft in the right conversation, addressed to the sender, and is never sent. | google-mail, microsoft |
| REQ-MAIL-3 | google | Unread mail from the school, organization or employer raises an alert. | google-mail |
| REQ-CAL-1 | google / microsoft | Block time, Quick add and Plan → calendar create events with no guests on the person's chosen calendar. | google-calendar, microsoft |
| REQ-CAL-2 | google / microsoft | Rescheduling a `[CC]` block moves the event and the linked task's due date. | google-calendar, microsoft |
| REQ-CAL-3 | google / microsoft | RSVP buttons appear only for invites waiting on the person, and name the organizer before answering. | google-calendar, microsoft |
| REQ-ORG-1 | org | The organization update is a draft with no recipients, built only from the organization's events and tasks. | org-update |
| REQ-LMS-1 | lms | Bulk add of class deadlines skips items already in the task list and sets a reminder. | lms-bulk |
| REQ-NB-1 | notebooklm | Brief me appears only for classes with a notebook (or a saved brief on the phone). An empty notebook shows a clear message and saves nothing. | notebooklm-brief |
| REQ-AI-1 | notebooklm | Briefs and tutoring are concepts only: never answers to graded work. | notebooklm-brief |
| REQ-PLAN-1 | plan-with-claude | Plan with Claude uses the task's own context (notes, linked email, class item), saves the plan, and doesn't ask Claude again when reopened. | plan-with-claude |
| REQ-PLAN-2 | plan-with-claude | Hand to Claude queues pending requests with the task's context. A finished request shows its result link (https only). | plan-with-claude |
| REQ-AI-2 | plan-with-claude | Expensive (Opus) agents are never picked by default and need an explicit tick. | plan-with-claude |
| REQ-DESK-1 | desktop-app | Notifications ask first, then each new alert pops up once (at most 3 a minute). Alerts already on screen the first time are not popped up. | desktop-notifications |
| REQ-DESK-2 | desktop-app | The installed app opens once at the set size, then keeps the person's own resizing. | desktop-window |
| REQ-CONS-1 | google + microsoft | Mail and calendars from both accounts appear in one view, each tagged with its source. The same meeting on both shows once. | google-and-microsoft |
| REQ-CONS-2 | microsoft | Every action on an item goes back to that item's own account. Microsoft-only people never cause a Google request. | microsoft, google-and-microsoft |
| REQ-CONS-3 | google + microsoft | Find a free time offers only times free on both accounts. | google-and-microsoft |

## Library (core: every copy has it)

Photos in notes are off for now (REQ-LIB-3, 4, 6 and 15 were retired with them). Uploaded files accept PDF, text, Markdown and CSV only, so no photo is stored without being re-saved first.

| ID | Requirement | Proved by |
|---|---|---|
| REQ-LIB-1 | Notes are saved in Command Center's own database, work on the phone, and keep their tags and their link to a class. | core-library |
| REQ-LIB-2 | Library search finds notes (title, text and tags) and Classes study items, and announces the number of results. | core-library |
| REQ-LIB-5 | Uploads and notes are archived, never deleted, and the Library says that uploads are visible to anyone the page is shared with. | core-library |
| REQ-LIB-7 | Upload errors name the fix (too large, wrong type, storage full). | core-library |
| REQ-LIB-8 | Creating any Drive or OneDrive file, including "+ New" in Recent docs, goes through the confirm step, and creates exactly one file per confirmation. Files are never shared, moved or trashed. | core-library; `build.py` |
| REQ-LIB-9 | OneDrive documents appear for Microsoft users on the computer, with the last saved copy on the phone. Microsoft-only people never cause a Google request. | library-microsoft |
| REQ-LIB-10 | Start a project shows the title, kind, account and starting outline before the file is created. | core-library |
| REQ-LIB-12 | Starting outlines are structure and guiding questions only, never content, answers or text to hand in. | core-library |
| REQ-LIB-13 | The Microsoft server creates valid Word and Excel files in a "Command Center" OneDrive folder, renames instead of overwriting, and asks for no permission beyond `Files.ReadWrite` for it. | `server/tests`, library-microsoft |
| REQ-LIB-14 | Hand to Claude from the Library queues one pending request with the project's details. | core-library |

## Stickies (core: every copy has them)

| ID | Requirement | Proved by |
|---|---|---|
| REQ-STICKY-1 | A sticky is a note in Command Center's own database (`notes` with `sticky:true`), works on the phone, and appears in Library search like any note. | stickies |
| REQ-STICKY-2 | The header's "+ Sticky" button and Alt+Shift+N open a capture dialog that takes focus, saves with Ctrl+Enter, closes with Escape or Cancel and returns focus to the button. | stickies |
| REQ-STICKY-3 | The Overview shows at most 3 stickies (pinned first) with a link to the rest in Library, sits after the Run sheet and before Due on a phone, and never covers other content. | stickies |
| REQ-STICKY-4 | A sticky is never deleted: Unstick keeps it as a Library note, and Archive hides it with Undo. | stickies |
| REQ-STICKY-5 | Sticky colours are decoration only (Library also marks stickies in text), and the text on each colour is at least 4.5:1 in every theme. | stickies |
| REQ-STICKY-6 | Turn into tasks makes one editable task per line, or Claude's split when the person asks for it, and creates them only after the confirm step, through the same task path, so they wait in the outbox when To Do can't be reached. A partial failure says how many went through and keeps the sticky. | stickies; `build.py` |
| REQ-STICKY-7 | A task's due date is filled in only when the sticky names a date, and its topic is always one of the person's own topics. | stickies |
| REQ-STICKY-8 | Hand to Claude queues one pending request with `source:"sticky"` and the sticky's text as context, after the confirm step, and a finished request shows its https result link on the sticky. | stickies; `build.py` |
| REQ-STICKY-9 | Opus agents are never picked for a sticky by default and need an explicit tick. | stickies |
| REQ-STICKY-10 | Every sticky control has a name, is at least 24 by 24 CSS pixels, and keeps keyboard focus on or next to the sticky when the list refreshes. | stickies |

## Writing a new requirement
One sentence: what must be true, in terms a student would notice. Give it the next free ID in its area (or a new area code), mark it core or name its feature, and point it at the test group that proves it.
