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

## Writing a new requirement
One sentence: what must be true, in terms a student would notice. Give it the next free ID in its area (or a new area code), mark it core or name its feature, and point it at the test group that proves it.
