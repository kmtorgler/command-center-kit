---
name: build-role-agent
description: Use when a student with an officer role in an organization (a fraternity or sorority chapter, a club, student government) wants an assistant that knows that role. Builds a role agent from the student's own copy of their organization's role guide or playbook: duties by month, recurring deadlines, checklists and templates. The guide stays private to the student.
---

# Build a role agent from a playbook

Most national organizations give officers a role guide (for example "VP of Membership manual" or "Recruitment chair playbook"). A role agent turns that guide into practical help: what's due this month, a checklist for the next event, a draft agenda, who to ask.

## Rules first
- **The guide is the student's, and it stays private.** It is usually members-only and copyrighted. Use the copy the student gives you, in their own Claude Project, folder or NotebookLM notebook. **Never** put it, or long passages from it, in this repo, the tests or anything shared. Summarize in your own words; quote at most a sentence when exact wording matters, and cite the section.
- **Member details stay minimal:** names, roles and contact details only, and only when the role needs them. No grades, health, conduct or financial details.
- **Drafts only.** The agent never sends, posts or deletes. Messages to the chapter are drafts for the student to send.
- If the guide and the student disagree, the student decides. The agent notes the difference and doesn't argue.

## Steps
1. **Get the guide.** Ask the student to share their copy:
   - Upload it to their Claude Project knowledge or a private folder only they use, or add it as a source in their NotebookLM notebook.
   - Ask the organization name, the role title, the term dates, and anything the chapter does differently.
2. **Read and extract** (your notes are for this student only):
   - the purpose of the role in one sentence;
   - duties grouped by month or term phase (start of term, recruitment, mid-term, elections, end of term);
   - recurring deadlines (reports to nationals, budget dates, event approvals), with how far ahead each needs work;
   - checklists for the role's big events;
   - templates the guide provides, or that the role commonly needs (agendas, update emails, reports);
   - who the role works with (other officers, advisors, the national office) by role, not by name.
3. **Confirm with the student.** Show a short summary: "Here's what I think your role covers each month. Anything wrong or missing for your chapter?"
4. **Create the agent** where the student's Claude can use it:
   - **Claude Code:** `.claude/agents/role-<short-role>.md` in the student's own folder (not this repo), with a `description` naming the organization and role. Model: Sonnet.
   - **Claude Project:** a section in their Project instructions, "When I ask about my <role> duties…".
   - The agent's instructions should reference the guide by section and include these rules. Copy nothing long from the guide.
5. **Seed the term** (optional, only with their OK): add the role's recurring deadlines as tasks or `[CC]` time blocks through Command Center. Every item goes through the page's confirm dialog, or is queued for them to approve. Never bulk-add without showing the list first.
6. **Tests.** The role agent adds behaviour to the student's copy. Write requirements for it (for example "REQ-ROLE-1: Role tasks are only created after the student approves the list") and tests where the page is involved (see `project-tests`).

## What the role agent answers well
- "What should I be doing this month as <role>?"
- "Make a checklist for <event> using my guide."
- "Draft the agenda for Sunday's committee meeting."
- "What's due to nationals before winter break?"
