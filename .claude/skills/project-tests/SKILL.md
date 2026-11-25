---
name: command-center-project-tests
description: Use whenever you set up, tailor or change a student's Command Center copy. Decides which requirements and test groups apply from the student's profile and features, writes new requirements and tests for anything you add or change, and runs the suite before the copy is published. The shipped tests are a starting point, not a complete list.
---

# Tests for a student's Command Center

The kit ships with a requirements list (`docs/requirements.md`) and a test suite (`tests/`) taken from the first Command Center. They are a **starting point**. Every student's copy is different (their accounts, their organization, the features they ask for), so you decide which tests apply and **you write the tests for whatever you add**.

## 1. Pick what applies
1. From the student's profile (the setup wizard's `prefs/profile`) and your interview, decide their features. The names are listed in `tests/test-plan.json` → `features`, for example `google`, `microsoft`, `org`, `lms`, `notebooklm`, `plan-with-claude`, `desktop-app`, `phone`.
2. Write them to `tests/project.json` → `features`, and put the student's first name and role in `student`. **Never** put their email, calendar IDs or other personal details in the tests. The tests use made-up data only.
3. **Core groups always run** (safety, privacy, accessibility, setup, themes). Never remove, weaken or skip a core test to make a copy pass. A failing core test blocks publishing.
4. Feature groups for features the student doesn't use are skipped automatically, and the runner reports them as skipped. Don't delete them: the student may turn the feature on later.

## 2. Add requirements and tests for anything new
When you add a feature, change a behaviour, or connect a new service (a Buffer connector, a role agent built from their chapter's playbook, a new tab):
1. **Requirements first.** Add one-sentence requirements to `docs/requirements.md`: what must be true, in words the student would notice. Give each an ID (`REQ-<AREA>-<n>`) and mark it core or name its feature. Ask yourself what could go wrong for this student, for example:
   - Could it send, post or delete something? It must not. Drafts only, behind a confirm.
   - Does it write anywhere? Then it goes through the confirm dialog, with the exact arguments shown.
   - Does it work on the phone? If not, does it say so and degrade cleanly?
   - Can it be used with a keyboard and a screen reader? Does it keep focus, label its fields and announce results?
   - Does it handle the service being down, slow, or returning nothing?
   - Does it keep private data (email, organization member details) out of files and prompts it doesn't need?
2. **Fake data.** If the feature calls a tool the stub doesn't know, add `tests/custom/<feature>.stub.js`. Use only made-up names and `example.com` / `example.edu` addresses (`build.py` fails on anything else):
   ```js
   window.__extraTools.push(async (server, tool, args) => {
     if (server === "Buffer" && tool === "create_idea") return {payload: {id: "idea1", url: "https://buffer.example/idea1"}};
   });
   ```
3. **Tests.** Add `tests/custom/<feature>.js` using the shared helpers on `window.CC` (`T`, `$`, `q`, `qa`, `until`, `ok`, `eq`, `has`, `clear`, `calls`, `dbOps`, `setVal`, `click`, `confirmGo`, `cfPay`, `closeAll`, `sleep`, `key`). Drive the real page the way the student would, and check **what would be sent**:
   ```js
   const {T, $, q, until, eq, ok, clear, calls, click, confirmGo} = window.CC;
   T("pc", "Social: saving a caption creates a Buffer idea, never a post", async () => {
     clear(); click("#socialSave", "Save to Buffer button"); await confirmGo();
     const c = calls("create_idea")[0]; ok(c && c.dlg, "saved outside the confirm step");
     eq(calls().filter(x => /post|publish/.test(x.tool)).length, 0, "posting tools called");
   });
   ```
   Modes are `pc`, `phone`, `notif`, `local`, `setup`, `ms`, `both` (see `tests/README.md`). Test the phone too if the feature appears there.
4. **Register the group.** Add it to `tests/test-plan.json` → `groups` with its `feature`, its `requirements` IDs, and a `tests` pattern matching your test names. A test that matches no group still runs, but the runner flags it.
5. **Update the safety checks if you add a new write tool:** add it to the confirm checks in `tests/build.py`, and to the never-declare list if it can send, post or delete.

## 3. Run and report
```
cd tests
uv run --no-project python -I build.py
uv run --no-project python -I -m http.server 8767 --bind 127.0.0.1
```
Open `http://localhost:8767/runner.html` and wait for "Done". Every non-skipped test must pass. Then tell the student, in plain words:
- what you checked;
- what was skipped and why (features they don't use);
- what couldn't be checked without their real accounts (point to `tests/LIVE-SMOKE-TEST.md` and add rows for their new features).

## Rules
- Tests use fake data only. Nothing in `tests/` may reach a real account.
- Never mark a failing test as skipped, and never loosen a check to make it pass. Fix the page, or ask the student.
- Keep tests independent. If a test continues in a dialog the previous test opened, pass `true` as the fourth argument to `T`.
