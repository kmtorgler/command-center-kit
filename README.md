# Command Center

A personal time-management dashboard for college students, set up by Claude around **your** campus life: your classes, your organization and role, your job, and your Google and/or Microsoft accounts.

It runs as a private page in the Claude app on your computer and your phone. It brings together your calendars, unread mail, class deadlines and tasks. It can plan your day, break big tasks into steps, draft emails, and hand work to helper agents. **It never sends, posts or deletes anything:** emails are saved as drafts, and every change is shown to you before it happens.

## What's in it
| Folder | What it is |
|---|---|
| `page/` | The Command Center page. Nothing personal is built in: a setup wizard asks about you on first use |
| `.claude/skills/` | Skills Claude follows: `setup-command-center`, `pm-interview` (what features fit you), `build-role-agent` (an assistant for your organization role, from your own role guide), `check-queue`, `project-tests` |
| `.claude/agents/` | Helper agents: personal assistant, writer, tutor, career, requirements tracker, organization advisor, quick and deep research, product manager, builder |
| `server/` | Optional local server for **Outlook mail and calendar and Microsoft To Do**. It can save drafts but can't send |
| `project/` | Instructions for using this as a Claude Project instead of Claude Code |
| `tests/` | Automated tests with made-up data, plus a checklist for trying it on your real accounts |
| `docs/` | Requirements, the profile format, Microsoft setup, and what a published copy declares |

## Get started
1. Install the Claude desktop app and open the **Code** tab.
2. Open this folder and say: **"Set up my Command Center."**
3. Claude asks before looking at anything, confirms what it learned about you, asks which accounts you use (Google, Microsoft or both) and how you want it themed, runs a short interview about your semester, and publishes **your own private copy**.

Using Outlook? See `docs/microsoft.md` for the one-time server setup.

## Safety, privacy and accessibility
- **Never sends, posts or deletes.** No such tools are declared, and the Microsoft server doesn't even request permission to send mail.
- **Every change is confirmed:** you see exactly what will be written before it's written.
- **Your data stays yours:** each person gets their own private copy. Nothing personal goes in this repo, and `tests/build.py` fails if it finds any.
- **Accessible by default:** built to WCAG 2.2 AA, with an Accessible theme and a Dark theme, and custom colours adjusted until they're readable.
- **Academic integrity:** tutors teach and quiz; they never write graded work.
- **Organizations:** no logos, crests or trademarked slogans ship here. Your organization's role guide stays in your own Project, never in this repo.

## For contributors
- Read `docs/requirements.md` first. Every change needs requirements and tests (see `.claude/skills/project-tests/SKILL.md`).
- Run the tests: `cd tests`, then `uv run --no-project python -I build.py`, then serve the folder and open `runner.html` (details in `tests/README.md`). Microsoft server tests: `cd server`, then `uv run pytest`.

Licensed under the [Apache License 2.0](LICENSE).
