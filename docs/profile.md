# The profile (`prefs/profile`)

Everything personal about a student's Command Center lives in **one database document in their own copy**: `prefs/profile`. The page has no personal details built in. The setup wizard writes this document, and so can the setup Claude (with the artifact database tool) after the student confirms each detail.

| Field | Type | Meaning |
|---|---|---|
| `name` | text, required | Full name, used in prompts and email sign-offs (first name) |
| `email` | text | Their main email (used to tell their own messages apart) |
| `school`, `city`, `studies` | text | e.g. "Pittsburg State University", "Pittsburg, Kansas", "junior mechanical engineering" |
| `tagline` | text | Optional header line, e.g. "Finish strong". Not a trademarked slogan |
| `org` | `{name, short, role}` | Student organization or chapter, e.g. `{name:"Sigma Phi Epsilon", short:"SigEp", role:"VP of SLC"}` |
| `work` | `{name, role}` | Job or internship |
| `extras` | text | Anything else to plan around (Honors College, a sport, scholarship hours) |
| `schoolDomains` | text[] | e.g. `["school.edu"]`, used for alerts and topic guesses |
| `lmsHost` | text | Class website, e.g. `canvas.school.edu` |
| `accounts` | `{google, microsoft}` | Which email and calendar accounts they use. Nothing connects to an account that is false |
| `mailDefault` | `"google"` / `"microsoft"` | Where new drafts are saved when both are used |
| `calendars` | `[{id, name, kind, provider, label}]` | `kind`: `personal`, `lms`, `org`, `work`, `family`, `other`; `provider`: `google` or `microsoft` |
| `tasks` | `"db"` / `"mstodo"` | Built-in task list (default) or Microsoft To Do |
| `notebooklm` | bool | Uses NotebookLM (computer only) |
| `theme` | id | `accessible` (default), `dark`, or a custom theme id |
| `themes` | `[{id, name, accent, mode, why}]` | Custom themes (colours only), already adjusted for contrast |

Rules:
- Only the student's own copy holds this document. It is never copied into the kit, the tests or any shared file.
- Organization member details stay out of it, apart from the student's own role.
