# What a published Command Center copy declares

Declare only the connectors and servers the person uses. Never declare send, reply, forward, trash or delete tools.

| Capability | Tools | When |
|---|---|---|
| `Gmail` | `search_threads`, `get_thread`, `label_thread`, `unlabel_thread`, `list_labels`, `create_draft` | Uses Google |
| `Google Calendar` | `list_events`, `list_calendars`, `create_event`, `update_event`, `respond_to_event`, `suggest_time` | Uses Google |
| `Google Drive` | `list_recent_files`, `create_file` | Uses Google |
| `host:cc-microsoft` | `whoami`, `list_calendars`, `list_events`, `create_event`, `update_event`, `respond_to_event`, `find_free_time`, `search_messages`, `get_thread`, `create_draft`, `archive_thread`, `move_to_inbox`, `list_files`, `create_office_file`, `list_task_lists`, `list_tasks`, `create_task`, `update_task`, `complete_task`, `add_task_link` | Uses Microsoft (see `microsoft.md`) |
| `host:gemini-notebook-mcp` | `notebook_create`, `source_add`, `notebook_query` | Uses NotebookLM (computer only) |
| `sample` | — | Always (Plan with Claude, Brief me, outlines, sticky splits). Library photos are off for now, so `images` isn't needed. |
| `assets` | — | Always (Library uploaded files; owner and editors only) |
| `db`, `user`, `desktop` | — | Always |

The desktop manifest tag in the page lists `full-access` and `notifications`.
