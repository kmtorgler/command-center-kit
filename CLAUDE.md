# Command Center kit

This repo is a kit for setting up a college student's personal Command Center. When someone opens it in Claude Code:

- **"Set up my Command Center"** (or similar): follow `.claude/skills/setup-command-center/SKILL.md`.
- **"Check my Command Center queue":** follow `.claude/skills/check-queue/SKILL.md`.
- **A feature idea:** follow `.claude/skills/pm-interview/SKILL.md`. Requirements first, build only after the student approves, then `.claude/skills/project-tests/SKILL.md`.
- **Their organization role guide:** follow `.claude/skills/build-role-agent/SKILL.md`.

## Rules that are never broken
- Nothing is sent, posted or deleted. No send, reply, forward, trash or delete tools are declared or called. Drafts only.
- Every write in the page goes through its confirm dialog with the exact arguments shown.
- WCAG 2.2 AA. The Accessible theme is the default.
- **No personal data in this repo.** A student's details live only in their own copy's `prefs/profile` and their own folders. Organization role guides stay private to the student. `tests/build.py` fails on real names, schools, organizations, emails or calendar IDs; run it before every commit.
- Academic integrity: teach, never write graded work.
- Opus agents only with the student's explicit OK.
- Never commit or push without the person's explicit OK.
