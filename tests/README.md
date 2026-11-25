# Command Center tests

Two kinds of tests:

1. **Automated tests:** `runner.html` drives the real page (`../page/command-center.html`) with fake Gmail, Calendar, To Do, NotebookLM, Claude and database data (`stub.js`). The fake person is "Alex Rivera", a SigEp member and VP of SLC at Pittsburg State University in Pittsburg, Kansas. The school and fraternity are real; the person, every email address and every calendar ID are made up. The tests check exactly what each button would send. Nothing reaches a real account.
2. **Live smoke test:** `LIVE-SMOKE-TEST.md` is a one-time checklist to run in the Claude desktop app against your own accounts after setting up.

## Modes
| Mode | What it pretends |
|---|---|
| `setup` | First run: no profile yet, so the setup wizard opens |
| `local` | Built-in task list (the default for new users) |
| `pc` | Claude desktop app with a Microsoft To Do server |
| `notif` | Installed desktop app with notifications allowed |
| `phone` | Claude phone app: local servers unreachable |

## Run them
```powershell
cd command-center-kit	ests
uv run --no-project python -I build.py
uv run --no-project python -I -m http.server 8767 --bind 127.0.0.1
```
Open http://localhost:8767/runner.html. The header shows "Done: N passed, M failed".

`build.py` also runs static checks. It **fails if it finds personal data** anywhere in the kit: real names, schools, organizations, real calendar IDs or real email addresses. Run it before every push.
