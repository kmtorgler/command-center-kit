"""Build the Command Center test page and run the static checks.

Usage (from this folder):
    uv run --no-project python -I build.py [page.html]

page.html is the Command Center page source with the artifact read wrapper stripped
(first line and the final </body></html> removed). It writes target.html = page + stub.js + tests.js,
syntax-checks the page script with node, and runs static safety checks. Exit code 1 if any check fails.
Then serve this folder (see README.md) and open runner.html.
"""
import json, re, subprocess, sys, pathlib

here = pathlib.Path(__file__).resolve().parent
src = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else here.parent / "page" / "command-center.html"
html = src.read_text(encoding="utf8")
fails = []

def check(name, ok, detail=""):
    print(("PASS " if ok else "FAIL ") + name + (f" — {detail}" if detail and not ok else ""))
    if not ok:
        fails.append(name)

scripts = re.findall(r"<script>(.*?)</script>", html, re.S)
check("page has its main script", bool(scripts))
main = scripts[-1] if scripts else ""
js = here / "_main.js"
js.write_text(main, encoding="utf8")
r = subprocess.run(["node", "--check", str(js)], capture_output=True, text=True)
check("page script parses (node --check)", r.returncode == 0, r.stderr.strip()[:400])
js.unlink(missing_ok=True)

m = re.search(r'<script type="application/json" id="claude-artifacts-manifest">(.*?)</script>', html, re.S)
perms = json.loads(m.group(1)).get("permissions", []) if m else []
# ---- personal data must never reach the kit: real people, schools, organizations, real calendar IDs or email addresses
import itertools
scan_files = [src] + [f for f in here.parent.rglob("*") if f.is_file() and not {".git",".venv","__pycache__",".pytest_cache"} & set(f.parts) and f.suffix in {".html",".js",".md",".py",".json",".txt",".css"}
              and f.name not in {"target.html","build.py"}]  # build.py holds the banned words themselves
banned = re.compile(r"kallyn|torgler|okstate|oklahoma|stillwater|phi ?mu|je ?dunn|@group\.calendar\.google\.com|@import\.calendar\.google\.com|gmail\.com", re.I)
email = re.compile(r"[A-Za-z0-9._%+-]+@([A-Za-z0-9-]+\.)+[A-Za-z]{2,}")
hits = []
for f in scan_files:
    t = f.read_text(encoding="utf8")
    hits += [f"{f.name}: {m.group(0)}" for m in banned.finditer(t)]
    hits += [f"{f.name}: {m.group(0)}" for m in email.finditer(t) if not re.search(r"@(example\.(com|edu)|group\.example|import\.example)$", m.group(0))]
check("no personal data (names, schools, organizations, real calendar IDs, real emails)", not hits, "; ".join(sorted(set(hits))[:12]))

# prompts and labels must not assume the student's gender (the kit is for everyone)
gendered = re.findall(r"(?:she|her|hers|herself|he|him|his|himself)", main + html[:html.find("<script>")])
check("no gendered words about the student in the page", not gendered, str(sorted(set(gendered))))

check("desktop manifest lists notifications", "notifications" in perms, str(perms))

forbidden = re.findall(r'callTool\([^)]*?"(send_message|reply|forward|trash_\w+|delete_\w+|untrash_\w+|mark_\w*spam)"', main)
check("no send/reply/forward/trash/delete tool calls", not forbidden, str(forbidden))
check("no To Do delete tool", "delete_task" not in main)

# every Google write the page makes should go through confirmWrite/runWrite (a direct callTool to a write tool is a red flag),
# except the documented Undo paths for archive/label.
direct = [w for w in re.findall(r'callTool\("(?:Gmail|Google Calendar)","(\w+)"', main)
          if w in {"create_event", "update_event", "respond_to_event", "create_draft"}]
check("Calendar/Gmail create/update/RSVP/draft never called directly", not direct, str(direct))

ms_direct = [w for w in re.findall(r'callTool\(MS,"(\w+)"', main) if w not in {"move_to_inbox", "get_thread", "list_calendars", "find_free_time", "list_events", "search_messages", "list_task_lists", "whoami"}]
check("Microsoft writes never called directly (only Undo's move_to_inbox)", not ms_direct, str(ms_direct))

drive_direct = re.findall(r'callTool\("Google Drive","create_file"', main)
check("Drive files are never created without the confirm step", not drive_direct, str(len(drive_direct)))

check("connector text is escaped (no raw innerHTML of payloads)", "innerHTML=r.payload" not in main)

marker = "<script>\n{"
check("injection point found", marker in html)
# tests/custom/: student-specific fakes (*.stub.js, loaded right after stub.js) and tests (*.js, after tests.js)
custom = sorted((here / "custom").glob("*.js")) if (here / "custom").is_dir() else []
stubs = "".join(f'<script src="custom/{f.name}"></script>\n' for f in custom if f.name.endswith(".stub.js"))
extra = "".join(f'<script src="custom/{f.name}"></script>\n' for f in custom if not f.name.endswith(".stub.js"))
for f in custom:
    r = subprocess.run(["node", "--check", str(f)], capture_output=True, text=True)
    check(f"custom/{f.name} parses", r.returncode == 0, r.stderr.strip()[:300])
out = html.replace(marker, '<script src="stub.js"></script>\n' + stubs + marker, 1)
out = out.replace("</script>\n</body>", '</script>\n<script src="tests.js"></script>\n' + extra + '</body>', 1)
check("tests injected after the page script", 'src="tests.js"' in out)
(here / "target.html").write_text(out, encoding="utf8")
print(f"\nWrote target.html from {src.name}. {len(fails)} static check(s) failed." if fails else f"\nWrote target.html from {src.name}. All static checks passed.")
sys.exit(1 if fails else 0)
