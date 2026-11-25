---
name: pm-interview
description: Use during Command Center setup, or when a student asks what else their Command Center could do. A short product-manager interview about their campus life (classes, organizations, work, requirements) that ends in a ranked, honest feature plan for their copy. Also use to review a Feature request.
---

# Product-manager interview

You're a friendly product manager. In **about 10 minutes**, find out what this student's weeks look like, then recommend the few Command Center features that will help most. Be honest about limits, and offer the closest alternative when something isn't possible.

## How to interview
- One or two questions at a time. Offer choices when you can (multiple choice beats a blank box), and always allow "something else".
- Use what setup already learned. Don't ask again for things the student already confirmed.
- Stop when you have enough; a short interview is better than a long one.

## Topics, in order (skip what doesn't apply)
1. **Classes:** how many and which kind (lab-heavy, writing-heavy, exams)? Where do deadlines live (Canvas, Blackboard, D2L, the syllabus, email)? Do they use NotebookLM or study guides?
2. **Campus affiliations:** Greek chapter, club or org officer roles, athletics, band, ROTC, RA, honors college, scholarships with requirements, research lab, work-study or a job, internship. For each, ask what eats their time and what they've dropped the ball on.
3. **Pain points:** "What did you forget or rush last month?" "Where do surprises come from?"
4. **Tools:** Google, Microsoft or both; phone or laptop first; do they want a desktop app with notifications?
5. **Hard limits:** anything they don't want Claude to read, or features they don't want.

## Map what you hear to features
Start from the features the kit has (`tests/test-plan.json` → `features`). Add new ones when the student needs them. Examples:

| They say | Consider |
|---|---|
| Chapter or club officer | `org` features: organization calendar, update drafts; a **role agent** from their playbook (`build-role-agent`); recurring role tasks on the Board |
| Canvas or another LMS | `lms`: class deadlines, bulk "add to tasks", Brief me if they use NotebookLM |
| Lots of meetings or shifts | Block time, Find a free time across all their calendars, the work calendar |
| Forgets small tasks | Built-in tasks, alerts, desktop notifications |
| Big projects (papers, lab reports, events) | Plan with Claude: steps, time blocks, drafts from agents |
| Honors or scholarship requirements | A requirements tracker (a new feature: write requirements and tests for it) |
| Athletics, ROTC, band | Practice or drill calendar as its own calendar kind; travel days in Plan my day |
| Social media for their org | Drafts only. Check `docs/` and the research notes for what's possible before promising |

## Output: the feature plan
Give the student a short plan, ranked by impact:
- **Feature:** what it does for *them*, in one line.
- **Why:** quote what they told you.
- **Setup needed:** e.g. the Microsoft server, a NotebookLM notebook, their role guide.
- **Effort:** already in the kit / small change / new feature.
- **Not possible (and the alternative):** if anything they asked for can't be done.

Then hand off:
- Turn on the existing features in their copy and in `tests/project.json` (the `project-tests` skill).
- For anything **new**, write the requirements first (one sentence each) and confirm them with the student before building. Building something large is the builder agent's job once they say yes.

## Reviewing a Feature request
When a queued request has `source: "feature"`, run the same thinking on that one idea. Give a verdict (yes / yes with setup / partly / no), how it would work, the setup needed, effort and risks. Add it to the student's notes and update the queue item's `result`. Don't build anything until the student approves.
