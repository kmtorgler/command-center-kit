---
name: setup-command-center
description: Use when a student asks to set up, personalize or re-theme their Command Center (a time-management dashboard for college students). Learns about them with their permission, confirms it, asks how they want it themed, runs the product-manager interview, publishes their own private copy, and sets up the tests. Not for changing someone else's copy.
---

# Set up a student's Command Center

You are setting up **one student's own private copy** of Command Center: the page in `page/command-center.html`, the skills in `.claude/skills/`, and the docs in `docs/`. Be warm and brief. Students are busy: aim for about 20 minutes in total, and save their answers as you go so nothing has to be repeated.

**House rules (never break them):**
- Nothing is ever sent, posted or deleted. Drafts only.
- Every write in the page goes through its confirm dialog.
- Accessible by default (WCAG 2.2 AA).
- No logos, crests or trademarked slogans in themes.
- Organization member details stay out of everything except the student's own role.
- Their data stays in their copy, never in this repo.

## 1. Learn about them, with permission
1. Ask first: "To fit this to you, can I look at what I already know about you and at your connected Google or Microsoft account (calendar names and your email domain only)?" If they say no, just ask them the questions.
2. If yes, gather only what helps:
   - your memory of them, if any;
   - their calendar list (`list_calendars` on Google Calendar and/or the Microsoft server), for calendar names only;
   - the domain of their email address, which tells you their school.

   Don't read email contents for this.
3. **Summarize and confirm** before saving anything, for example: "Here's what I've got: you're Alex, a junior in mechanical engineering at Pittsburg State. You're in Sigma Phi Epsilon as VP of SLC, and you use both Outlook (school) and Gmail. Anything wrong or missing?" Fix whatever they correct.

## 2. Accounts
- Ask which they use for email and calendar: **Google, Microsoft, or both**. Assume nothing.
- Google uses Claude's Gmail, Google Calendar and Google Drive connectors.
- Microsoft uses the local Microsoft server. Walk them through `docs/microsoft.md`; it works on their computer only, and the phone shows a synced copy. If their school blocks the sign-in ("admin approval required"), say so plainly and continue with Google only, or without Microsoft mail and calendar.
- Tasks: Command Center's built-in list (works everywhere, the default) or Microsoft To Do (needs the Microsoft server).

## 3. Themes
- Every copy includes **Accessible** (the default) and **Dark**. Mention both.
- Suggest 2–3 more from what you learned: school colours, organization colours, a team or interest they mentioned. Use colours only, with plain names ("Crimson and gold"), and say why ("your school's colours").
- Check each suggestion before offering it: text on the accent colour must be at least 4.5:1, and focus and accents at least 3:1. The page's theme picker adjusts colours automatically, but don't suggest one that needs heavy changing.
- Save their choice and the suggested themes in the profile (`theme`, `themes`). They can change it later under **Theme** at the bottom of the page.

## 4. What they need: run `pm-interview`
Use the `pm-interview` skill to find which features fit their campus life. It returns a ranked feature list.

## 5. Publish their copy
1. Work out the capabilities from `docs/capabilities.md`. Declare **only** the connectors and servers they use (no Google tools for a Microsoft-only student). Never declare send, reply, forward, trash or delete tools.
2. Publish `page/command-center.html` as a **new private artifact** in their account, using the Artifact publish tool in the Claude desktop app. Never publish to someone else's artifact, and never reuse an artifact that holds another person's data.
3. Write their profile to the copy's database as `prefs/profile` (fields in `docs/profile.md`) with the artifact database tool, using only what they confirmed. When they open the page, the setup wizard comes up already filled in; they press **Load my calendars**, check what each calendar is for, and save.
4. Tell them how to pin it in the Claude app and install it as a desktop app (optional).

## 6. Tests: run `project-tests`
- Set their features in `tests/project.json`.
- Add requirements and tests for anything you built or changed for them.
- Run the suite. Every non-skipped test must pass before you call setup done.

## 7. Their organization role (optional): run `build-role-agent`
If they hold a role in an organization and have their national organization's role guide or playbook, offer to build a role agent from **their own copy** of it.

## 8. Finish
Tell them in a few short lines:
- what's set up;
- where the **Theme**, **Settings** and **Feature request** links are;
- how agent requests run (say "check my Command Center queue" in Claude; see the `check-queue` skill);
- what they should try once on their real accounts (rows from `tests/LIVE-SMOKE-TEST.md` for the features they use).

Remember for later sessions (in your memory, if you have one): their copy's link, the features they chose, and anything they asked you to remember. Not their email contents.
