// Automated tests for the Command Center page, run against stub.js (no real services).
// Each test drives the real page UI (clicks, typing) and checks what would be sent: the exact tool, arguments and db writes.
// Results go to window.__results and to the parent runner page.
(()=>{
const MODE=window.__mode,sleep=ms=>new Promise(r=>setTimeout(r,ms));
const $=id=>document.getElementById(id),q=s=>document.querySelector(s),qa=s=>[...document.querySelectorAll(s)];
async function until(fn,what="condition",ms=3000){const t=Date.now();let last;while(Date.now()-t<ms){try{const v=fn();if(v)return v}catch(e){last=e}await sleep(25)}throw new Error("Timed out waiting for "+what+(last?" ("+last.message+")":""))}
const ok=(c,msg)=>{if(!c)throw new Error(msg)};
const eq=(a,b,msg)=>{if(JSON.stringify(a)!==JSON.stringify(b))throw new Error(`${msg}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`)};
const has=(s,sub,msg)=>{if(!String(s).includes(sub))throw new Error(`${msg}: “${sub}” not found in “${String(s).slice(0,300)}”`)};
const clear=()=>{window.__log.length=0};
const calls=(tool)=>window.__log.filter(l=>l[0]==="call"&&(!tool||l[2]===tool)).map(l=>({server:l[1],tool:l[2],args:l[3],dlg:l[4]}));
const dbOps=(op,prefix)=>window.__log.filter(l=>l[0]===op&&String(l[1]).startsWith(prefix));
const setVal=(el,v)=>{el.value=v;el.dispatchEvent(new Event("input",{bubbles:true}));el.dispatchEvent(new Event("change",{bubbles:true}))};
const click=(sel,what)=>{const el=typeof sel==="string"?q(sel):sel;ok(el,"Missing on the page: "+(what||sel));el.click();return el};
async function confirmGo(){await until(()=>$("cfEd").open,"the confirm dialog");$("cfGo").click();await until(()=>!$("cfEd").open,"the confirm dialog to close")}
const cfPay=()=>$("cfPay").textContent;
const marker=n=>`—— ${n} (Command Center) ——`;
const count=(s,sub)=>String(s).split(sub).length-1;
function closeAll(){if($("plEd").open)$("plClose").click();if($("brfEd").open)$("brfClose").click();if($("drEd").open)$("drX").click();
 for(const d of qa("dialog[open]"))d.close()}
const tests=[];const T=(modes,name,fn,keep)=>tests.push({modes:modes.split(","),name,fn,keep:!!keep});

// ======================= desktop app (pc) =======================
T("pc","Notifications: the bell asks first, then turns on",async()=>{
 const b=await until(()=>!$("notifBtn").hidden&&$("notifBtn"),"the notifications bell");eq(b.getAttribute("aria-pressed"),"false","bell before allowing");
 b.click();await until(()=>b.getAttribute("aria-pressed")==="true","the bell to switch on")});
T("pc","Notifications: the first time, alerts already showing are marked seen, not popped up",async()=>{
 await until(()=>localStorage.getItem("cc-notified"),"seen alerts to be remembered");
 eq(window.__notes.length,0,"notifications shown");has(localStorage.getItem("cc-notified"),"due-ev1","remembered alert keys")});
T("pc","Installed app opens at 1920 × 1400 real pixels, centred, once per size",async()=>{
 await until(()=>window.__placed.length,"the window to be sized");const r=window.devicePixelRatio||1;
 eq(window.__placed,[{anchor:"center",width:Math.min(screen.availWidth,Math.round(1920/r)),height:Math.min(screen.availHeight,Math.round(1400/r))}],"placement");
 eq(localStorage.getItem("cc-win-sized"),"1920x1400","remembered size");
 location.hash="board";await sleep(100);location.hash="overview";await sleep(100);eq(window.__placed.length,1,"times sized")});
T("pc","Brief me shows only for classes with a NotebookLM notebook",async()=>{
 await until(()=>q('#due [data-brief="ev1"]'),"Brief me on HW 9");ok(!q('#due [data-brief="ev2"]'),"Brief me shows for ENGL 1113, which has no notebook")});
T("pc","Brief me asks NotebookLM for concepts only and saves the brief",async()=>{
 clear();click('#due [data-brief="ev1"]');await until(()=>$("brfOut").textContent.trim(),"the brief");
 const c=calls("notebook_query")[0];ok(c,"notebook_query not called");eq(c.args.notebook_id,"nb-1","notebook");has(c.args.query,"Concepts only","query");has(c.args.query,"do not solve","query");
 await until(()=>dbOps("db.set","briefs/").length,"the brief to be saved to db");has($("brfOut").textContent,"Nusselt","brief text")},true);
T("pc","Brief: saving to task notes adds one section, and saving again replaces it",async()=>{
 eq($("brfSave").textContent,"Save to task notes","save button (HW 9 is linked to a task)");clear();$("brfSave").click();
 await until(()=>$("cfEd").open,"confirm");has($("cfRead").textContent,marker("NotebookLM brief"),"confirm preview");await confirmGo();
 let u=calls("update_task");eq(u.length,1,"update_task calls");eq(count(u[0].args.body,marker("NotebookLM brief")),1,"brief sections");has(u[0].args.body,"Chapters 7-9.","kept the old notes");
 click('#due [data-brief="ev1"]');await until(()=>$("brfEd").open&&$("brfOut").textContent.trim(),"saved brief");eq(calls("notebook_query").length,0,"queries when reopening a saved brief");
 clear();$("brfSave").click();await confirmGo();u=calls("update_task");eq(count(u[0].args.body,marker("NotebookLM brief")),1,"brief sections after saving twice")});
T("pc","Brief with no linked task offers a new task prefilled with the brief",async()=>{
 location.hash="classes";await until(()=>q('[data-cls="c1"]'),"MAE 3403 in the class list");click('[data-cls="c1"]');await until(()=>q('#classMain [data-brief="ev3"]'),"Brief me on Quiz 6 (Classes tab)");
 click('#classMain [data-brief="ev3"]');await until(()=>$("brfOut").textContent.trim(),"brief");eq($("brfSave").textContent,"Make a task with this brief","save button");
 $("brfSave").click();await until(()=>$("taskEd").open,"task editor");has($("edNotes").value,marker("NotebookLM brief"),"editor notes");has($("edSrc").textContent,"Quiz 6","editor source");
 location.hash="overview";await sleep(50)});
T("pc","Brief: an empty notebook shows a clear message and saves nothing",async()=>{
 window.__nlmEmpty=true;clear();
 try{click('#due [data-brief="ev1"]');await until(()=>$("brfEd").open,"brief");$("brfAgain").click();
  await until(()=>$("brfErr").textContent,"an error message");has($("brfErr").textContent,"no sources","error message");
  ok(!$("brfOut").textContent.includes('"status"'),"raw JSON shown as the brief");eq(dbOps("db.set","briefs/").length,0,"briefs saved")}
 finally{window.__nlmEmpty=false}});
T("pc","Plan with Claude: generates steps and deliverables from the task's context",async()=>{
 clear();click('[data-tplan="T1"]',"Plan icon on the Tasks row");await until(()=>qa("#plSteps .pltxt").length===2,"steps");
 ok(calls("get_thread").length===1,"the linked Gmail thread wasn't read");const p=window.__lastPrompt;
 has(p,"Bring a calculator.","prompt (email text)");has(p,"HW 9","prompt (Canvas item)");has(p,"Chapters 7-9.","prompt (notes)");has(p,"Never choose builder or deep-researcher","prompt");has(p,"VP of SLC of Sigma Phi Epsilon","prompt (role from the profile)");has(p,"Pittsburg State University","prompt (school from the profile)");
 await until(()=>dbOps("db.set","taskPlans/").length,"the plan to be saved");eq(qa("#plSteps .pltxt").map(i=>i.value),["Skim ch 7 notes","Work 5 practice problems"],"steps")},true);
T("pc","Plan: Opus agents are never picked by default, and nothing is ticked",async()=>{
 const ag=qa("#plDels select").map(s=>s.value);eq(ag,["engineering-tutor","quick-researcher","writer"],"agents (deep-researcher and builder downgraded)");
 ok(qa("#plDels .chk").every(c=>!c.checked),"a deliverable was ticked by default");ok($("plHand").disabled,"Hand to Claude enabled with nothing ticked")},true);
T("pc","Plan: an Opus agent needs an explicit “OK to use Opus” tick",async()=>{
 const rows=()=>qa("#plDels .plrow");setVal(rows()[1].querySelector("select"),"deep-researcher");await until(()=>rows()[1].querySelector(".opus"),"the Opus tick box");
 rows()[0].querySelector(".chk").click();rows()[1].querySelector(".chk").click();$("plHand").click();
 has($("plErr").textContent,"OK to use Opus","error");ok(!$("cfEd").open,"confirm opened without the Opus tick")},true);
T("pc","Plan: Hand to Claude writes pending queue requests with the task's context",async()=>{
 qa("#plDels .plrow")[1].querySelector(".opus input").click();clear();$("plHand").click();await until(()=>$("cfEd").open,"confirm");
 has($("cfRead").textContent,"Opus, expensive","confirm warns about Opus");await confirmGo();
 const adds=dbOps("db.add","queue");eq(adds.length,2,"queue requests");const [a,b]=adds.map(x=>x[2]);
 for(const d of [a,b]){eq(d.status,"pending","status");eq(d.source,"plan","source");eq(d.taskId,"T1","taskId");eq(d.listId,"L1","listId");ok(d.context.length<=1500,"context too long");has(d.context,"Task: Prep heat transfer exam","context");has(d.context,"[gmail:th1]","context links")}
 eq([a.agent,a.opusOk],["engineering-tutor",false],"first request");eq([b.agent,b.opusOk],["deep-researcher",true],"second request");
 await until(()=>qa("#plDels .plst").length===2,"queued status on the deliverables");ok(qa("#plDels .pltxt")[0].disabled,"queued deliverable still editable");
 window.__queued=adds.map(x=>x[3])},true);
T("pc","Plan: a finished request shows its result link on the task (https only)",async()=>{
 const [q1,q2]=window.__queued;await window.__db.doc("queue/"+q1).update({status:"done",result:"Saved.",resultUrl:"https://docs.google.com/document/d/abc"});
 await window.__db.doc("queue/"+q2).update({status:"done",result:"Saved.",resultUrl:"http://evil.example/x"});
 await until(()=>q('#tasks .res'),"a Result link on the task row");eq(qa("#tasks .res").map(a=>a.getAttribute("href")),["https://docs.google.com/document/d/abc"],"result links");
 await until(()=>q('#plDels .plst a'),"the result link in the plan");eq(qa("#plDels .plst a").length,1,"links in the plan")},true);
T("pc","Plan: Steps → To Do as a checklist; doing it twice replaces the checklist",async()=>{
 $("plMode").value="list";for(let i=0;i<2;i++){clear();$("plToDo").click();await until(()=>$("cfEd").open,"confirm");has($("cfRead").textContent,"☐ Skim ch 7 notes (25 min)","preview");await confirmGo()}
 const u=calls("update_task");eq(u.length,1,"update_task calls");eq(count(u[0].args.body,marker("Plan")),1,"plan sections");has(u[0].args.body,"☐ Work 5 practice problems (1 hr 10 min)","checklist");
 eq(count(u[0].args.body,marker("NotebookLM brief")),1,"the brief section was kept")},true);
T("pc","Plan: Steps → To Do as separate tasks keeps the topic and due date",async()=>{
 $("plMode").value="tasks";clear();$("plToDo").click();await confirmGo();const c=calls("create_task");eq(c.length,2,"create_task calls");
 eq(c.map(x=>x.args.title),["Skim ch 7 notes","Work 5 practice problems"],"titles");eq(c[0].args.categories,["School","MAE 3403"],"categories");eq(c[0].args.due_date,window.__day(3),"due date");eq(c[0].args.list_id,"L1","list")},true);
T("pc","Plan: Block time on a step uses the step's name and length, then links the event",async()=>{
 click('#plSteps [data-plblock="1"]');await until(()=>$("blkEd").open,"Block time");eq($("blkTitle").value,"[CC] Work 5 practice problems","title");eq($("blkDur").value,"60","duration (70 min rounds to 1 hr)");
 $("blkDate").value=window.__day(2);$("blkStart").value="09:00";clear();$("blkGo").click();await until(()=>$("cfEd").open,"confirm");
 has(cfPay(),'"summary": "[CC] Work 5 practice problems"',"payload");await confirmGo();
 const ce=calls("create_event")[0];eq([ce.args.calendarId,ce.args.startTime,ce.args.endTime],[window.__cals.PERSONAL,window.__day(2)+"T09:00:00",window.__day(2)+"T10:00:00"],"event");
 const l=calls("add_task_link")[0];ok(l,"task link not added");eq([l.args.task_id,l.args.web_url,l.args.external_id],["T1","https://calendar.google.com/newev","gcal:newev"],"link");ok($("plEd").open,"the plan closed")});
T("pc","Plan: reopening shows the saved plan without asking Haiku again",async()=>{
 $("plClose").click();clear();click('[data-tplan="T1"]');await until(()=>$("plEd").open&&qa("#plSteps .pltxt").length,"saved plan");await sleep(150);
 eq(window.__log.filter(l=>l[0]==="sample.json").length,0,"Haiku calls");has($("plMsg").textContent,"saved plan","message")});
T("pc","Plan: the task editor's plan button opens the plan",async()=>{
 closeAll();click('[data-tedit="T2"]');await until(()=>$("taskEd").open,"editor");ok(!$("edPlan").hidden,"plan button hidden in the editor");
 $("edPlan").click();await until(()=>$("plEd").open,"plan");ok(!$("taskEd").open,"editor still open");has($("plH").textContent,"Committee chair check-ins","plan title")});
T("pc","Plan: notes formatted in To Do are never rewritten",async()=>{
 closeAll();click('[data-tplan="T3"]');await until(()=>qa("#plSteps .pltxt").length,"steps");$("plMode").value="list";clear();$("plToDo").click();
 has($("plErr").textContent,"formatted in To Do","message");ok(!$("cfEd").open,"confirm opened");eq(calls("update_task").length,0,"update_task calls")});
T("pc","Plan: Board cards have the plan button",async()=>{
 closeAll();location.hash="board";await until(()=>q('#board [data-tplan="T1"]'),"plan button on the Board");location.hash="overview";await sleep(50)});

// ----- Phase 2 and 3 write buttons, up to and through the (fake) write
T("pc","Inbox Label: label_thread with one of her own labels",async()=>{
 clear();click('[data-mlabel="th1"]');await until(()=>$("cfEd").open,"confirm");eq(qa("#cfLabel option").map(o=>o.value),["L_1"],"labels offered (system labels hidden)");
 await confirmGo();eq(calls("label_thread")[0].args,{threadId:"th1",labelIds:["L_1"]},"args");eq(calls("unlabel_thread").length,0,"archived without asking")});
T("pc","RSVP: respond_to_event on the organization invite",async()=>{
 clear();click('[data-rsvp="accepted"][data-rev="pm1"]',"Accept on the invite");await until(()=>$("cfEd").open,"confirm");has($("cfSum").textContent,"Chapter President","organizer named");
 await confirmGo();eq(calls("respond_to_event")[0].args,{calendarId:window.__cals.ORGCAL,eventId:"pm1",responseStatus:"accepted"},"args")});
T("pc","Draft reply: saves a Gmail draft in the thread, never sends",async()=>{
 clear();click('[data-mreply="th1"]');await until(()=>$("drEd").open,"draft sheet");await until(()=>$("drTo").value,"the To address");
 $("drDraft").click();await until(()=>$("drBody").value.includes("Alex"),"Haiku draft");
 eq($("drTo").value,"x@example.edu","To");$("drGo").click();await until(()=>!$("drRev").hidden,"review step");has($("drPay").textContent,'"replyToMessageId": "m1"',"payload");
 $("drGo").click();await until(()=>!$("drEd").open,"draft saved");const c=calls("create_draft")[0];eq(c.args.to,["x@example.edu"],"to");eq(c.args.replyToMessageId,"m1","reply to");ok(c.dlg,"saved outside the review step")});
T("pc","Organization update: a draft with no recipients",async()=>{
 clear();click('[data-pmdraft="1"]');await until(()=>$("drEd").open,"draft sheet");$("drDraft").click();await until(()=>$("drBody").value.includes("Alex"),"draft");
 $("drGo").click();await until(()=>!$("drRev").hidden,"review");$("drGo").click();await until(()=>!$("drEd").open,"saved");
 const c=calls("create_draft")[0];ok(!("to" in c.args),"draft has recipients");has(c.args.subject,"SigEp update","subject")});
// Archive runs after Label and Draft reply: an archived email leaves the Inbox card.
T("pc","Inbox Archive: unlabel_thread INBOX after a confirm",async()=>{
 closeAll();clear();click('[data-march="th1"]',"Archive on the Inbox row");await confirmGo();
 const c=calls("unlabel_thread")[0];eq(c.args,{threadId:"th1",labelIds:["INBOX"]},"args")});
T("pc","Quick add: Haiku reads the note, then create_event after a confirm",async()=>{
 clear();click('[data-qadd="1"]');await until(()=>$("qaEd").open,"quick add");$("qaText").value="Study group tomorrow 7-9pm";$("qaParse").click();
 await until(()=>$("qaTitle").value==="Study group","parsed title");$("qaGo").click();await confirmGo();
 eq(calls("create_event")[0].args,{calendarId:window.__cals.PERSONAL,summary:"Study group",startTime:window.__day(1)+"T19:00:00",endTime:window.__day(1)+"T21:00:00"},"args")});
T("pc","Reschedule a [CC] block: update_event, and the linked task's due date moves",async()=>{
 clear();click('[data-resched="cc1"]',"Reschedule on the [CC] event");await until(()=>$("rsEd").open,"reschedule");has($("rsLink").textContent,"Committee chair check-ins","linked task");
 $("rsDate").value=window.__day(3);$("rsStart").value="14:00";$("rsGo").click();await confirmGo();
 eq(calls("update_event")[0].args,{calendarId:window.__cals.PERSONAL,eventId:"cc1",startTime:window.__day(3)+"T14:00:00",endTime:window.__day(3)+"T15:00:00"},"event");
 const u=calls("update_task")[0];eq([u.args.task_id,u.args.due_date],["T2",window.__day(3)],"task due date")});
T("pc","Block time from a Tasks row: create_event, then add_task_link",async()=>{
 clear();click('#tasks [data-block="task:T2"]');await until(()=>$("blkEd").open,"Block time");$("blkDate").value=window.__day(2);$("blkStart").value="15:00";$("blkDur").value="30";
 $("blkGo").click();await confirmGo();eq(calls("create_event")[0].args.endTime,window.__day(2)+"T15:30:00","end time");eq(calls("add_task_link")[0].args.task_id,"T2","linked task")});
T("pc","Plan my day → calendar: ticked blocks become [CC] events",async()=>{
 clear();click("#planBtn","Plan my day");await until(()=>$("planBody").textContent.includes("Test day"),"plan");
 const box=q("[data-plancal]");if(!box)return "skipped: too late in the day for a test block";box.click();click("[data-plancaladd]");await confirmGo();
 const c=calls("create_event")[0];has(c.args.summary,"[CC] Focus block","summary");eq(c.args.calendarId,window.__cals.PERSONAL,"calendar")});
T("pc","Bulk Canvas → To Do skips items already in To Do",async()=>{
 clear();click("#bulkBtn","Add all to To Do");await until(()=>$("bulkEd").open,"bulk dialog");const ids=qa("#bkList [data-bk]").map(i=>i.dataset.bk);
 ok(!ids.includes("ev1"),"HW 9 offered again although it's in To Do");$("bkGo").click();await until(()=>!$("bulkEd").open,"bulk add");
 const c=calls("create_task");eq(c.length,ids.length,"tasks created");ok(c.every(x=>x.args.categories[0]==="School"&&x.args.reminder),"School topic and reminder")});

// ----- Feature request link (bottom of every tab)
T("pc,phone","Feature request: quick check, then a queue request for the product manager",async()=>{
 closeAll();click("#frBtn","Feature request link");await until(()=>$("frEd").open,"the feature request form");
 $("frText").value="Let me schedule Instagram posts";$("frCheck").click();await until(()=>!$("frOut").hidden,"the quick check");
 has($("frOut").textContent,"Doable with some setup","first take");has(window.__lastPrompt,"never sends or posts anything","prompt includes the house rules");
 clear();$("frSend").click();await until(()=>$("cfEd").open,"confirm");has($("cfRead").textContent,"Let me schedule Instagram posts","confirm preview");await confirmGo();
 const a=dbOps("db.add","queue");eq(a.length,1,"queue requests");const d=a[0][2];
 eq([d.agent,d.source,d.status,d.request],["product-manager","feature","pending","Let me schedule Instagram posts"],"request");has(d.firstTake,"Buffer","first take saved");
 click("#frBtn");await until(()=>$("frEd").open&&$("frPast").textContent.includes("Instagram"),"the request listed under recent requests")});
T("pc","Feature request: sending works without the quick check",async()=>{
 closeAll();click("#frBtn");await until(()=>$("frEd").open,"form");$("frText").value="Dark mode toggle";clear();$("frSend").click();await confirmGo();
 const d=dbOps("db.add","queue")[0][2];eq([d.agent,d.firstTake],["product-manager",""],"request without a first take")});

// ----- Theme link
T("pc","Themes: Accessible is the default, and Dark switches the page to dark mode and is saved",async()=>{
 closeAll();const root=document.documentElement;eq(root.dataset.theme,"light","default mode");eq(getComputedStyle(root).getPropertyValue("--o").trim(),"#0b57d0","default accent");
 click("#themeBtn","Theme link");await until(()=>$("thEd").open,"theme picker");const dark=await until(()=>q('#thList input[value="dark"]'),"the Dark option");
 clear();dark.click();eq(root.dataset.theme,"dark","mode after picking Dark");await until(()=>dbOps("db.set","prefs/profile").length,"saved to the profile");
 eq(dbOps("db.set","prefs/profile").slice(-1)[0][2].theme,"dark","saved theme");q('#thList input[value="accessible"]').click();eq(root.dataset.theme,"light","back to Accessible")},true);
T("pc","Themes: a custom colour is adjusted until text on it is readable",async()=>{
 $("thName").value="Sunny";$("thColor").value="#ffff66";$("thMode").value="light";$("thColor").dispatchEvent(new Event("input",{bubbles:true}));
 has($("thPrev").textContent,"Button text","preview");clear();$("thAdd").click();
 const p=window.__store["prefs/profile"];const t=p.themes.find(x=>x.name==="Sunny");ok(t,"theme not saved");eq(p.theme,t.id,"switched on");
 const r=getComputedStyle(document.documentElement),o=r.getPropertyValue("--o").trim(),on=r.getPropertyValue("--on-o").trim();
 const L=h=>{const n=parseInt(h.slice(1),16),c=[n>>16&255,n>>8&255,n&255].map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});return .2126*c[0]+.7152*c[1]+.0722*c[2]};
 const cr=(a,b)=>{const x=L(a),y=L(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};ok(cr(o,on)>=4.5,`button text ${cr(o,on).toFixed(2)}:1 is below 4.5:1`)},true);
T("pc","Themes: Claude suggests themes from the profile, and only valid colours are offered",async()=>{
 clear();$("thSuggest").click();await until(()=>qa("#thSugg [data-thsug]").length,"suggestions");eq(qa("#thSugg [data-thsug]").length,2,"suggestions offered (the invalid colour is dropped)");
 has(window.__lastPrompt,"Alex Rivera","prompt uses the profile");has(window.__lastPrompt,"no logos","prompt rules");
 q('#thSugg [data-thsug="0"]').click();ok(window.__store["prefs/profile"].themes.some(t=>t.name==="Crimson and gold"),"suggested theme not saved");
 q('#thList input[value="accessible"]').click();$("thDone").click()});

// ----- Accessibility (serious findings from thoughts/accessibility-audit.md)
const key=(k,o={})=>document.dispatchEvent(new KeyboardEvent("keydown",{key:k,bubbles:true,...o}));
T("pc","Keyboard: ticking a task keeps focus on its checkbox, is announced, and Ctrl+Z undoes it",async()=>{
 closeAll();location.hash="overview";const box=await until(()=>q('#tasks [data-tdone="T4"]'),"T4's checkbox");box.focus();clear();box.click();
 await until(()=>calls("complete_task").length,"complete_task");await until(()=>document.activeElement?.getAttribute("data-tdone")==="T4","focus back on T4's checkbox");
 await until(()=>$("live").textContent.includes("Control+Z"),"the live announcement");has($("live").textContent,"Marked done","announcement");
 ok($("snackTxt").getAttribute("aria-hidden")==="true","visible bar text not hidden from screen readers");
 document.body.focus();key("z",{ctrlKey:true});await until(()=>calls("update_task").some(c=>c.args.task_id==="T4"&&c.args.status==="notStarted"),"Ctrl+Z to undo")});
T("pc","Keyboard: Escape closes the Undo bar",async()=>{
 closeAll();await until(()=>q('#tasks [data-tdone="T4"]')&&!q('#tasks [data-tdone="T4"]').disabled,"T4 back to open");q('#tasks [data-tdone="T4"]').click();await until(()=>!$("snack").hidden,"the Undo bar");
 key("Escape");ok($("snack").hidden,"Undo bar still showing");q('#tasks [data-tdone="T4"]')?.click()});
T("pc","Keyboard: Snooze keeps focus inside the Alerts card",async()=>{
 closeAll();location.hash="overview";const b=await until(()=>q("#alerts [data-snooze]"),"a Snooze button");b.focus();b.click();await sleep(50);
 const a=document.activeElement;ok(a&&a!==document.body&&$("alerts").closest(".card").contains(a),"focus left the Alerts card (now on "+(a?.tagName||"nothing")+")")});
T("pc","Board: choosing a column doesn't move the card; the Move button does, and keeps focus",async()=>{
 closeAll();location.hash="board";const sel=await until(()=>q('#board [data-move-pick="T2"]'),"T2's Move menu");sel.focus();clear();setVal(sel,"Career");await sleep(100);
 eq(calls("update_task").length,0,"moves on choosing");const go=q('#board [data-move-go="T2"]');go.focus();go.click();
 await until(()=>calls("update_task").length,"the move");eq(calls("update_task")[0].args.categories,["Career"],"new topic");
 await until(()=>document.activeElement?.getAttribute("data-move-go")==="T2","focus on T2's Move button in its new column");location.hash="overview";await sleep(50)});
T("pc","Quiz: an answer is marked in words, not just colour, and the feedback gets focus",async()=>{
 closeAll();location.hash="classes";await until(()=>!$("v-classes").hidden&&q('[data-cls="c1"]'),"the Classes tab");click('[data-cls="c1"]');await until(()=>q('[data-open="i1"]'),"the quiz");click('[data-open="i1"]');
 const a=await until(()=>q('[data-ans="0:0"]'),"answer A");a.click();const fb=await until(()=>document.activeElement?.id==="qfb-0"&&document.activeElement,"focus on the feedback");
 has(fb.textContent,"Not quite. The answer is B.","feedback");has(q('[data-ans="0:0"]').textContent,"your answer, incorrect","wrong answer text");has(q('[data-ans="0:1"]').textContent,"correct answer","right answer text");
 eq($("qScore").getAttribute("role"),"status","score announced");location.hash="overview";await sleep(50)});
T("pc","Focus ring has its own colour token; on the plan header it uses the text colour",async()=>{
 const r=getComputedStyle(document.documentElement);ok(r.getPropertyValue("--focus").trim(),"--focus missing");
 const ph=q(".phead");if(!ph)return "skipped: no plan header on screen";eq(getComputedStyle(ph).getPropertyValue("--focus").trim(),getComputedStyle(ph).getPropertyValue("--on-o").trim(),"plan header ring")});

T("pc","Timeline: screen readers get today's plan as an ordered list; the drawn rail is visual only",async()=>{
 closeAll();location.hash="overview";if(!q("#tlRail"))return "skipped: no plan on screen in this run";
 const items=qa("#tlList li").map(li=>li.textContent);if(!items.length)return "skipped: the plan has no blocks at this time of day";
 ok(items.some(t=>/ block/.test(t)),"plan blocks missing from the list");ok(qa("#tlRail .tb.real,#tlRail .hr").every(x=>x.getAttribute("aria-hidden")==="true"),"drawn calendar blocks exposed twice");
 ok(qa("#tlRail .pcal").every(x=>x.getAttribute("aria-hidden")!=="true"&&x.getAttribute("aria-label")),"calendar tick boxes hidden or unnamed")});

// ----- Agent queue
T("pc","Queue: a finished request's full text opens under Read the result",async()=>{
 closeAll();await window.__db.collection("queue").add({agent:"writer",request:"Summarize ch 7",status:"done",result:"Summary written.",resultText:"Chapter 7 covers fins.",created:Date.now()});
 const d=await until(()=>q("#queue details.qres"),"the Read the result expander");has(d.textContent,"Chapter 7 covers fins.","result text");ok(!d.open,"opened by default")});


// ----- Library (notes, photos, files, documents, start a project)
const pngFile=async(name)=>{const c=document.createElement("canvas");c.width=40;c.height=30;const g=c.getContext("2d");g.fillStyle="#08f";g.fillRect(0,0,40,30);
 const b=await new Promise(r=>c.toBlob(r,"image/png"));return new File([b],name||"wb.png",{type:"image/png"})};
const pick=(input,file)=>{const dt=new DataTransfer();dt.items.add(file);input.files=dt.files;input.dispatchEvent(new Event("change",{bubbles:true}))};
T("pc","Library: a note saves with tags and a class, and search and tag filters find it",async()=>{
 closeAll();location.hash="library";await until(()=>!$("v-library").hidden,"the Library tab");click("#lbAddNote");await until(()=>$("lbNoteEd").open,"note editor");
 $("lbNTitle").value="Lab supplies";$("lbNBody").value="Buy goggles before Thursday";$("lbNTags").value="lab, errands";clear();q("#lbNForm button[type=submit]").click();
 await until(()=>dbOps("db.add","notes").length,"the note saved");const n=dbOps("db.add","notes")[0][2];eq([n.title,n.tags,n.archived],["Lab supplies",["lab","errands"],false],"note");
 setVal($("lbSearch"),"goggles");await until(()=>$("lbNotes").textContent.includes("Lab supplies"),"search result");has($("lbLive").textContent,"1 result","announced count");
 setVal($("lbSearch"),"zzz");await until(()=>$("lbNotes").textContent.includes("No notes match"),"empty search");setVal($("lbSearch"),"");
 click('#lbTags [data-lbtag="errands"]');await until(()=>$("lbNotes").textContent.includes("Lab supplies"),"tag filter");click('#lbTags [data-lbtag="errands"]')},true);
T("pc","Library: search also finds study items from Classes",async()=>{
 setVal($("lbSearch"),"practice");await until(()=>$("lbStudy").textContent.includes("Practice quiz"),"the Classes quiz in results");setVal($("lbSearch"),"")},true);
T("pc","Library: a photo needs a description, and is shrunk and re-saved as JPEG before upload",async()=>{
 closeAll();location.hash="library";await until(()=>!$("v-library").hidden,"the Library tab");pick($("lbPhoto"),await pngFile());await until(()=>$("lbPhotoEd").open,"photo dialog");
 q("#lbPForm button[type=submit]").click();has($("lbPErr").textContent,"Describe the photo","error");eq($("lbAlt").getAttribute("aria-invalid"),"true","field marked");
 clear();$("lbAltSuggest").click();await until(()=>$("lbAlt").value,"suggested description");ok(window.__log.some(l=>l[0]==="sample"&&l[2]===1),"the photo was not sent to Claude");
 q("#lbPForm button[type=submit]").click();await until(()=>window.__uploads.length,"the upload");eq(window.__uploads[0].type,"image/jpeg","uploaded type (re-encoded)");
 await until(()=>$("lbNoteEd").open,"the new note");q("#lbNForm button[type=submit]").click();await until(()=>dbOps("db.add","notes").some(x=>(x[2].imageIds||[]).length),"photo note saved");
 const n=dbOps("db.add","notes").find(x=>(x[2].imageIds||[]).length)[2];eq(n.alts[n.imageIds[0]],"Whiteboard with heat transfer equations","stored description")},true);
T("pc","Library: Turn the photo's text into a note puts the text in the note to edit",async()=>{
 closeAll();location.hash="library";await until(()=>!$("v-library").hidden,"the Library tab");pick($("lbPhoto"),await pngFile("notes.png"));await until(()=>$("lbPhotoEd").open,"photo dialog");$("lbAlt").value="Lecture notes page";
 $("lbToNote").click();await until(()=>$("lbPMsg").textContent.includes("Text ready"),"transcription");q("#lbPForm button[type=submit]").click();
 await until(()=>$("lbNoteEd").open&&$("lbNBody").value.includes("Fin efficiency"),"note with the transcribed text");$("lbNCancel").click()},true);
T("pc","Library: the photo viewer takes focus and gives it back when closed",async()=>{
 closeAll();location.hash="library";await until(()=>!$("v-library").hidden,"the Library tab");const th=await until(()=>q("#lbPhotos [data-lbview]"),"a photo thumbnail");th.focus();th.click();await until(()=>$("lbView").open,"viewer");
 eq(document.activeElement,$("lbVClose"),"focus in the viewer");ok($("lbVImg").alt,"image has alt text");$("lbVClose").click();await sleep(50);eq(document.activeElement,th,"focus back on the thumbnail")});
T("pc","Library: Start a project drafts an outline, then creates one Google Doc after a confirm",async()=>{
 closeAll();location.hash="library";await until(()=>!$("v-library").hidden,"the Library tab");click("#lbStart");await until(()=>$("lbStartEd").open,"start dialog");$("lbSTitle").value="Lab 4 report";$("lbSType").value="doc";
 $("lbSDraft").click();await until(()=>$("lbSOut").value.includes("Introduction"),"outline");has(window.__lastPrompt,"never write the content","outline prompt (structure only)");
 clear();q("#lbSForm button[type=submit]").click();await until(()=>$("cfEd").open,"confirm");has($("cfRead").textContent,"Introduction","preview shows the outline");await confirmGo();
 const c=calls("create_file");eq(c.length,1,"files created");eq([c[0].args.title,c[0].args.contentMimeType],["Lab 4 report","text/plain"],"args");ok(c[0].dlg,"created outside the confirm");
 await until(()=>dbOps("db.add","projects").length,"recorded under Documents")});
T("pc","Library: Hand a project to Claude queues one request",async()=>{
 closeAll();location.hash="library";await until(()=>!$("v-library").hidden,"the Library tab");click("#lbStart");await until(()=>$("lbStartEd").open,"start dialog");$("lbSTitle").value="Chapter budget";clear();$("lbSHand").click();await confirmGo();
 const a=dbOps("db.add","queue");eq(a.length,1,"queue requests");eq([a[0][2].source,a[0][2].status],["library","pending"],"request")});
T("pc","Library: uploaded files are listed and archiving hides them without deleting",async()=>{
 closeAll();location.hash="library";await until(()=>!$("v-library").hidden,"the Library tab");clear();pick($("lbFile"),new File(["hello"],"syllabus.txt",{type:"text/plain"}));await until(()=>dbOps("db.add","libfiles").length,"file recorded");
 const b=await until(()=>q("#lbFiles [data-lbfarch]"),"archive button");b.click();await until(()=>dbOps("db.update","libfiles/").some(x=>x[2].archived===true),"archived");
 eq(window.__log.filter(l=>l[0]==="db.delete").length,0,"deletes")});
T("pc","Recent docs: + New asks first before creating a file",async()=>{
 closeAll();location.hash="overview";await sleep(50);click("#newBtn");$("newTitle").value="Scratch doc";clear();q("#newForm button[type=submit]").click();
 await until(()=>$("cfEd").open,"confirm");eq(calls("create_file").length,0,"created before confirming");await confirmGo();ok(calls("create_file")[0].dlg,"created outside the confirm")});
T("phone","Library on the phone: notes save, and Google documents still show",async()=>{
 location.hash="library";await until(()=>!$("v-library").hidden,"the Library tab");click("#lbAddNote");await until(()=>$("lbNoteEd").open,"note editor");$("lbNBody").value="Call the dean's office";clear();q("#lbNForm button[type=submit]").click();
 await until(()=>dbOps("db.add","notes").length,"note saved on the phone");await until(()=>$("lbDocs").textContent.includes("Lab 3 report"),"Drive document")});
T("ms","Library (Outlook): OneDrive documents show, and a Word file is created after a confirm",async()=>{
 location.hash="library";await until(()=>!$("v-library").hidden,"the Library tab");await until(()=>$("lbDocs").textContent.includes("Budget.xlsx"),"OneDrive file");click("#lbStart");await until(()=>$("lbStartEd").open,"start dialog");
 const kinds=[...$("lbSType").options].map(o=>o.value);eq(kinds,["docx","xlsx"],"kinds offered to a Microsoft-only student");
 $("lbSTitle").value="Club budget";$("lbSType").value="xlsx";clear();q("#lbSForm button[type=submit]").click();await confirmGo();
 const c=msCalls("create_office_file")[0];ok(c&&c.dlg,"no confirmed create_office_file");eq([c.args.kind,c.args.title],["xlsx","Club budget"],"args")});


// ----- Stickies (quick notes from the header: Overview card, Library filter, turn into tasks, hand to Claude)
const stkClose=()=>{for(const d of qa("dialog[open]"))d.close()};
const stkNotes=()=>Object.entries(window.__store).filter(([p])=>/^notes\/[^/]+$/.test(p)).map(([p,v])=>({id:p.split("/")[1],...v}));
const stkMake=async(title,body,extra={})=>{const r=await window.__db.collection("notes").add({title,body:body||"",tags:[],classId:"",imageIds:[],alts:{},sticky:true,color:"yellow",pinned:false,archived:false,created:Date.now(),updated:Date.now(),...extra});
 await sleep(80);return r.id};
const nextDay=i=>{const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()+((i-d.getDay()+7)%7));return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`};
T("pc","Stickies: + Sticky and Alt+Shift+N open the capture dialog, Ctrl+Enter saves, and focus goes back to the button",async()=>{
 stkClose();location.hash="overview";await sleep(50);const b=$("stkBtn");eq(b.getAttribute("aria-keyshortcuts"),"Alt+Shift+N","declared shortcut");eq(b.getAttribute("aria-label"),"New sticky note","name");
 b.focus();b.click();await until(()=>$("stkEd").open,"sticky dialog");eq(document.activeElement,$("stkText"),"focus in the text box");
 $("stkForm").requestSubmit();has($("stkErr").textContent,"Write something","empty error");eq($("stkText").getAttribute("aria-invalid"),"true","field marked");
 $("stkText").value="Lab kit\n- buy goggles fri\n- email TA";clear();$("stkText").dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",ctrlKey:true,bubbles:true}));
 await until(()=>dbOps("db.add","notes").length,"the sticky saved");const n=dbOps("db.add","notes")[0][2];eq([n.sticky,n.title,n.body,n.archived],[true,"Lab kit","- buy goggles fri\n- email TA",false],"sticky");
 await until(()=>!$("stkEd").open,"dialog closed");await sleep(30);eq(document.activeElement,b,"focus back on + Sticky");
 await until(()=>!$("stkCard").hidden&&$("stkList").textContent.includes("Lab kit"),"the Overview card");
 document.body.focus();document.dispatchEvent(new KeyboardEvent("keydown",{key:"N",code:"KeyN",altKey:true,shiftKey:true,bubbles:true}));await until(()=>$("stkEd").open,"the shortcut opens it");
 $("stkCancel").click();await sleep(30);eq(document.activeElement,b,"focus back after Cancel")},true);
T("pc","Stickies: the Overview shows 3, pinned first, with a link to the rest in Library",async()=>{
 await stkMake("Old pinned idea","",{pinned:true,updated:Date.now()-9e6});await stkMake("Second","");await stkMake("Third","");await stkMake("Fourth","");
 await until(()=>qa("#stkList > li").length===3,"three stickies shown");eq(q("#stkList [data-stkopen]").textContent,"Old pinned idea","pinned one first");
 eq($("stkMore").textContent,"2 more in Library","link to the rest");eq(getComputedStyle($("stkCard")).position,"static","in the page flow");
 for(const b of qa("#stkList button")){const r=b.getBoundingClientRect();ok(r.width>=24&&r.height>=24,"control under 24px: "+(b.getAttribute("aria-label")||b.textContent))}
 const pin=q("#stkList [data-stkpin]");eq(pin.getAttribute("aria-pressed"),"true","pinned state announced");
 click("#stkMore");await until(()=>!$("v-library").hidden,"the Library");await until(()=>q('#lbTags [data-lbstk][aria-pressed="true"]'),"the Stickies filter on");
 ok(!$("lbNotes").textContent.includes("Lab supplies"),"filter still shows plain notes");has($("lbNotes").textContent,"Sticky","stickies marked in text, not only colour");
 click('#lbTags [data-lbstk]');await until(()=>$("lbNotes").textContent.includes("Lab supplies"),"filter off");location.hash="overview";await sleep(50)},true);
T("pc","Stickies: Unstick keeps the note in Library, Archive hides it with Undo, and nothing is deleted",async()=>{
 const id=await stkMake("Throwaway thought","");await until(()=>q(`#stkList [data-stkun="${id}"]`),"the new sticky on the Overview");
 clear();click(`#stkList [data-stkun="${id}"]`);await until(()=>dbOps("db.update","notes/"+id).some(x=>x[2].sticky===false),"unstuck");
 await until(()=>!q(`#stkList [data-stkopen="${id}"]`),"gone from the Overview");ok(stkNotes().find(n=>n.id===id)&&!stkNotes().find(n=>n.id===id).archived,"still a Library note");
 ok(document.activeElement&&document.activeElement!==document.body,"focus lost after Unstick");
 $("snackUndo").click();await until(()=>dbOps("db.update","notes/"+id).some(x=>x[2].sticky===true),"undo restores it");
 await until(()=>q(`#stkList [data-stkarch="${id}"]`),"back on the Overview");click(`#stkList [data-stkarch="${id}"]`);await until(()=>dbOps("db.update","notes/"+id).some(x=>x[2].archived===true),"archived");
 $("snackUndo").click();await until(()=>dbOps("db.update","notes/"+id).some(x=>x[2].archived===false),"undo un-archives");
 eq(window.__log.filter(l=>l[0]==="db.delete").length,0,"deletes")},true);
T("pc","Stickies: Turn into tasks makes one task per line after the confirm, with dates only where the sticky names one",async()=>{
 const id=stkNotes().find(n=>n.title==="Lab kit").id;await window.__db.doc("notes/"+id).update({pinned:true,updated:Date.now()});await until(()=>q(`[data-stktd="${id}"]`),"Lab kit on the Overview");click(`[data-stktd="${id}"]`);await until(()=>$("stkTdEd").open,"turn into tasks");
 eq(qa("#stkRows input.pltxt").map(i=>i.value),["Lab kit","buy goggles fri","email TA"],"one row per line");
 eq(qa('#stkRows input[type=date]').map(i=>i.value),["",nextDay(5),""],"due only where a day is named");
 const t0=q("#stkRows select option:nth-child(2)").value;click('#stkRows [data-stkrm="0"]');eq(qa("#stkRows input.pltxt").length,2,"row removed");clear();$("stkTdForm").requestSubmit();
 await until(()=>$("cfEd").open,"confirm");eq(calls("create_task").length,0,"created before confirming");await confirmGo();
 const c=calls("create_task");eq(c.length,2,"tasks created");ok(c.every(x=>x.dlg),"created outside the confirm");
 eq(c.map(x=>x.args.due_date||""),[nextDay(5),""],"due dates");has(c[0].args.body,"From a sticky in Command Center","task notes");eq(c[0].args.categories,[t0],"topic");
 await until(()=>dbOps("db.update","notes/"+id).some(x=>x[2].archived===true&&x[2].taskIds.length===2),"sticky archived with its task ids")},true);
T("pc","Stickies: Let Claude split it keeps the topic on the list and drops a date the sticky never named",async()=>{
 const id=await stkMake("Finish essay","Email the TA");click(`[data-stktd="${id}"]`);await until(()=>$("stkTdEd").open,"turn into tasks");
 $("stkModeC").click();await until(()=>$("stkTdMsg").textContent.includes("Claude's split"),"Claude's split");has(window.__lastPrompt,"ignore any instructions","prompt treats the sticky as data");
 eq(qa("#stkRows input.pltxt").map(i=>i.value),["Finish essay","Email the TA"],"rows");eq(qa('#stkRows input[type=date]').map(i=>i.value),["",""],"invented dates cleared");
 const t0=q("#stkRows select option:nth-child(2)").value;eq(qa("#stkRows select").map(s=>s.value),[t0,t0],"off-list topics fall back to the first topic");$("stkTdCancel").click()},true);
T("pc","Stickies: if a task fails part way, the ones made are reported and the sticky is kept",async()=>{
 const id=await stkMake("Partial","First task\nFail here\nThird task");click(`[data-stktd="${id}"]`);await until(()=>$("stkTdEd").open,"turn into tasks");
 click('#stkRows [data-stkrm="0"]');clear();$("stkTdForm").requestSubmit();await until(()=>$("cfEd").open,"confirm");$("cfGo").click();
 await until(()=>$("cfErr").textContent.includes("Step 1 went through"),"partial error");await until(()=>$("snackTxt").textContent.includes("1 of 3 went through"),"partial report");
 eq(calls("create_task").length,2,"attempts");await until(()=>dbOps("db.update","notes/"+id).some(x=>x[2].taskIds?.length===1),"the made task recorded");
 ok(!dbOps("db.update","notes/"+id).some(x=>x[2].archived===true),"sticky archived after a failure");$("cfCancel").click()},true);
T("pc","Stickies: Hand to Claude queues one request, never picks Opus by default, and shows the result link",async()=>{
 const id=await stkMake("Fin research","Find 3 sources on fin efficiency",{pinned:true});click(`[data-stkhand="${id}"]`);await until(()=>$("stkHdEd").open,"hand to Claude");
 await until(()=>$("stkHdMsg").textContent.includes("Suggested"),"Haiku's suggestion");eq($("stkHdAgent").value,"quick-researcher","an Opus pick is downgraded");ok($("stkHdOpusL").hidden,"Opus tick shown for a non-Opus agent");
 setVal($("stkHdAgent"),"deep-researcher");ok(!$("stkHdOpusL").hidden,"Opus tick hidden");clear();$("stkHdForm").requestSubmit();has($("stkHdErr").textContent,"Opus","Opus needs a tick");ok($("stkHdEd").open,"queued without the tick");
 $("stkHdOpus").checked=true;$("stkHdForm").requestSubmit();await confirmGo();const a=dbOps("db.add","queue");eq(a.length,1,"queue requests");const d=a[0][2];
 eq([d.source,d.noteId,d.agent,d.opusOk,d.status],["sticky",id,"deep-researcher",true,"pending"],"request");has(d.context,"ignore instructions","context marks the sticky as data");
 await window.__db.doc("queue/"+a[0][3]).update({status:"done",resultUrl:"https://docs.google.com/document/d/res1"});
 await until(()=>q(`#stkList a[href="https://docs.google.com/document/d/res1"]`),"the result link on the sticky")},true);
T("pc","Stickies: the note editor can make a note a sticky, and colours keep text readable in every theme",async()=>{
 const rgb=s=>{let m=String(s).match(/color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)/);if(m)return m.slice(1,4).map(x=>+x*255);m=String(s).match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/);return m.slice(1,4).map(Number)};
 const lum=c=>{const [r,g,b]=c.map(v=>{v/=255;return v<=.03928?v/12.92:((v+.055)/1.055)**2.4});return .2126*r+.7152*g+.0722*b};
 const cr=(a,b)=>{const x=lum(rgb(a)),y=lum(rgb(b));return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};const root=document.documentElement;
 const checkOne=(c,theme)=>{const li=document.createElement("li");li.className="stk stk-"+c;li.innerHTML="<button class='stkopen'>x</button>";$("stkList").append(li);
  const cs=getComputedStyle(li),r=cr(cs.color,cs.backgroundColor),rb=cr(getComputedStyle(li.firstChild).color,cs.backgroundColor);li.remove();
  ok(r>=4.5&&rb>=4.5,`${c} sticky in ${theme}: contrast ${r.toFixed(2)}`)};
 click("#themeBtn","Theme link");await until(()=>$("thEd").open,"theme picker");const opts=qa("#thList input[type=radio]");ok(opts.length>=2,"themes listed");
 for(const o of opts){o.click();await sleep(30);for(const c of ["yellow","green","blue","pink"])checkOne(c,o.value)}
 q('#thList input[value="accessible"]').click();$("thEd").close()
 stkClose();location.hash="library";await until(()=>!$("v-library").hidden,"Library");const plain=stkNotes().find(n=>n.title==="Lab supplies");
 click(`[data-lbopen="${plain.id}"]`);await until(()=>$("lbNoteEd").open,"note editor");ok(!$("lbNStk").checked,"plain note shown as a sticky");
 $("lbNStk").checked=true;$("lbNColor").value="blue";clear();q("#lbNForm button[type=submit]").click();
 await until(()=>dbOps("db.update","notes/"+plain.id).some(x=>x[2].sticky===true&&x[2].color==="blue"),"saved as a blue sticky");location.hash="overview";await sleep(50)});
T("phone","Stickies on the phone: the card sits after the Run sheet, and tasks wait in the To Do outbox",async()=>{
 ok(innerWidth<900,"phone width");location.hash="overview";await until(()=>!$("v-overview").hidden,"the Overview");click("#stkBtn");await until(()=>$("stkEd").open,"sticky dialog");$("stkText").value="Phone sticky\nCall the dean tomorrow";$("stkForm").requestSubmit();
 await until(()=>!$("stkCard").hidden,"the Overview card");const y=id=>$(id).getBoundingClientRect().top;
 ok(y("runCard")<y("stkCard")&&y("stkCard")<y("dueCard")&&y("dueCard")<y("mailCard"),"order Run sheet, Stickies, Due, Inbox: "+["runCard","stkCard","dueCard","mailCard"].map(y).join(","));eq(getComputedStyle($("stkCard")).position,"static","in the page flow");
 ok(document.documentElement.scrollWidth<=innerWidth,"page scrolls sideways");
 click("#stkList [data-stktd]");await until(()=>$("stkTdEd").open,"turn into tasks");clear();$("stkTdForm").requestSubmit();await confirmGo();
 const o=dbOps("db.add","todoOutbox");eq(o.map(x=>x[2].op),["create","create"],"outbox ops")});

// ----- safety invariants over everything the pc run did
T("pc","Google safety: every Gmail and Calendar write happened inside a confirm or review step",async()=>{
 const W=["unlabel_thread","label_thread","create_draft","create_event","update_event","respond_to_event","create_file"];
 const bad=window.__allCalls.filter(c=>W.includes(c.tool)&&!c.dlg);eq(bad.map(c=>c.tool),[],"writes without a confirm");
 ok(window.__allCalls.filter(c=>W.includes(c.tool)).length>=8,"too few writes were exercised")});
T("pc,phone,notif,local,setup,ms,both","Safety: send, reply, forward, trash and delete tools are never called",async()=>{
 const F=/^(send_message|reply|forward|trash_|delete_|untrash|mark_.*spam)/;eq(window.__allCalls.filter(c=>F.test(c.tool)).map(c=>c.tool),[],"forbidden calls")},true);

// ======================= installed app, notifications allowed =======================
T("notif","Notifications: each new alert pops up once, at most 3 a minute",async()=>{
 await until(()=>window.__notes.length,"a notification");await sleep(300);
 await window.__db.collection("queue").add({agent:"writer",request:"x",status:"done",created:Date.now()});await sleep(300);
 location.hash="board";await sleep(100);location.hash="overview";await sleep(200);
 const n=window.__notes;ok(n.length<=3,`${n.length} notifications in a minute`);eq(new Set(n).size,n.length,"duplicate notifications");
 ok(n.some(x=>x.includes("HW 9")),"the due-tomorrow alert didn't notify");eq(Object.keys(JSON.parse(localStorage.getItem("cc-notified"))).length,n.length,"remembered keys")});

// ======================= phone =======================
T("phone","Phone: no notifications bell, To Do shows the offline copy",async()=>{
 await until(()=>$("tdSyncTxt").textContent.includes("Showing your last sync"),"offline sync line");ok($("notifBtn").hidden,"bell shown on the phone")});
T("phone","Phone: the theme chosen on the PC carries over",async()=>{
 await until(()=>document.documentElement.dataset.theme==="dark","the Dark theme from the synced profile");has($("cheer").textContent,"Finish strong","header tagline")});
T("phone","Phone: the page never tries to size a window",async()=>{await sleep(200);eq(window.__placed.length,0,"window sizing calls");eq(localStorage.getItem("cc-win-sized"),null,"remembered")});
T("phone","Phone: done tasks drop off the Board after 7 days, like on the PC",async()=>{
 location.hash="board";await until(()=>q('#groupChips [data-group="status"]'),"group chips");click('#groupChips [data-group="status"]');
 const col=await until(()=>q('.bcol[data-col="completed"]'),"the Done column");const titles=[...col.querySelectorAll(".kt")].map(b=>b.textContent);
 ok(titles.includes("Recently finished task"),"a task done 2 days ago is missing");ok(!titles.includes("Long-finished task"),"a task done 10 days ago still shows");
 click('#groupChips [data-group="topic"]');location.hash="overview";await sleep(50)});
T("phone","Phone: Brief me shows only saved briefs, and opens them without NotebookLM",async()=>{
 await until(()=>q('#due [data-brief="ev1"]'),"saved brief button");ok(!q('[data-brief="ev3"]'),"Brief me offered without a saved brief");
 clear();click('#due [data-brief="ev1"]');await until(()=>$("brfOut").textContent.includes("Saved brief"),"saved brief");ok($("brfAgain").hidden,"Ask again shown on the phone");
 eq(calls("notebook_query").length,0,"NotebookLM calls");$("brfClose").click()});
T("phone","Phone: Plan with Claude works, and the checklist goes to the To Do outbox",async()=>{
 clear();click('[data-tplan="T1"]');await until(()=>qa("#plSteps .pltxt").length===2,"steps");has($("plTdNote").textContent,"sent from your PC","offline note");
 $("plMode").value="list";clear();$("plToDo").click();await until(()=>$("cfEd").open,"confirm (works without To Do)");await confirmGo();
 const o=dbOps("db.add","todoOutbox");eq(o.length,1,"outbox entries");eq(o[0][2].op,"update","op");has(o[0][2].input.body,marker("Plan"),"body");
 ok(dbOps("db.update","todo/").length,"mirror not updated")},true);
T("phone","Phone: steps as separate tasks queue as pending tasks",async()=>{
 $("plMode").value="tasks";clear();$("plToDo").click();await confirmGo();
 eq(dbOps("db.add","todoOutbox").map(x=>x[2].op),["create","create"],"outbox ops");eq(dbOps("db.set","todo/p").length,2,"pending tasks shown")},true);
T("phone","Phone: Hand to Claude queues requests",async()=>{
 qa("#plDels .chk")[0].click();clear();$("plHand").click();await confirmGo();eq(dbOps("db.add","queue").length,1,"queue requests");$("plClose").click()});
T("phone","Phone: notes only partly stored here are not rewritten",async()=>{
 click('[data-tplan="T4"]');await until(()=>qa("#plSteps .pltxt").length,"steps");$("plMode").value="list";clear();$("plToDo").click();
 has($("plErr").textContent,"first 2,000 characters","message");ok(!$("cfEd").open,"confirm opened");closeAll()});

// ======================= first run (no profile) =======================
T("setup","Setup: the wizard opens on first use and nothing personal is shown before it",async()=>{
 await until(()=>$("suEd").open,"the setup wizard");eq($("cheer").textContent,"","header tagline");has($("agenda").textContent,"No calendars chosen","run sheet")},true);
T("setup","Setup: loading calendars guesses what each one is for",async()=>{
 $("suName").value="Alex Rivera";$("suEmail").value="alex@example.com";$("suOrgName").value="Sigma Phi Epsilon";$("suOrgShort").value="SigEp";
 clear();$("suLoad").click();await until(()=>qa("#suCals select").length===5,"5 calendars listed");
 eq(qa("#suCals select").map(x=>x.value),["personal","lms","skip","org","work"],"guessed kinds")},true);
T("setup","Setup: saving writes the profile and the page starts using it",async()=>{
 $("suSchool").value="Pittsburg State University";$("suTagline").value="Finish strong";$("suTasks").value="db";clear();$("suSave").click();
 await until(()=>dbOps("db.set","prefs/profile").length,"the profile saved");const p=dbOps("db.set","prefs/profile")[0][2];
 eq([p.name,p.org.short,p.tasks,p.calendars.length],["Alex Rivera","SigEp","db",4],"profile (holidays left out)");
 await until(()=>!$("suEd").open,"the wizard to close");await until(()=>$("cheer").textContent.includes("Finish strong"),"the header tagline");ok(!q('[data-pmdraft]').hidden,"organization update button hidden");
 await until(()=>!$("agenda").textContent.includes("No calendars chosen"),"the run sheet to load")});
T("setup","Setup: the name is required, and the field is marked",async()=>{
 click("#setupBtn","Settings link");await until(()=>$("suEd").open,"settings");$("suName").value="";$("suSave").click();
 has($("suErr").textContent,"Add your name","error");eq($("suName").getAttribute("aria-invalid"),"true","field marked");eq(document.activeElement,$("suName"),"focus on the field");$("suCancel").click()});

// ======================= built-in task list =======================
T("local","Built-in tasks: adding, finishing and moving tasks save in Command Center, not To Do",async()=>{
 await until(()=>$("tdSyncTxt").textContent.includes("saved in Command Center"),"the built-in task line");
 $("tTitle").value="Buy lab goggles";$("tArea").value="School";clear();q('#taskForm button[type=submit]').click();
 await until(()=>dbOps("db.set","todo/").some(x=>x[2].title==="Buy lab goggles"),"the task saved");eq(calls().filter(c=>c.server==="host:cc-microsoft").length,0,"To Do calls");
 const box=await until(()=>qa("#tasks [data-tdone]").find(b=>b.closest("li").textContent.includes("Buy lab goggles")),"the new task's checkbox");box.click();
 await until(()=>dbOps("db.update","todo/").some(x=>x[2].status==="completed"),"marked done");
 location.hash="board";const sel=await until(()=>q('#board [data-move-pick="T2"]'),"T2 on the board");sel.focus();setVal(sel,"Career");q('#board [data-move-go="T2"]').click();
 await until(()=>dbOps("db.update","todo/").some(x=>JSON.stringify(x[2].categories||[]).includes("Career")),"moved");location.hash="overview";await sleep(50)});
T("local","Built-in tasks: the Microsoft sign-in box stays hidden",async()=>{location.hash="board";await sleep(100);ok($("tdFoot").hidden,"To Do sign-in shown");location.hash="overview";await sleep(50)});

// ======================= Microsoft only (Outlook through the local server) =======================
const MSV="host:cc-microsoft";
const msCalls=tool=>calls(tool).filter(c=>c.server===MSV);
T("ms","Microsoft only: run sheet, Due and Inbox come from Outlook, and nothing asks Google",async()=>{
 await until(()=>$("agenda").textContent.includes("Check-ins")&&$("due").textContent.includes("HW 9"),"Outlook calendar on the page");ok(q('[data-march="conv1"]'),"Outlook mail missing");
 eq(window.__watches.filter(w=>/^(Gmail|Google)/.test(w)),[],"Google watches");ok($("docsCard").hidden,"Google Drive card shown")});
T("ms","Outlook archive: archive_thread after a confirm, and Undo moves it back",async()=>{
 closeAll();clear();click('[data-march="conv1"]');await until(()=>$("cfEd").open,"confirm");has($("cfRead").textContent,"Outlook Archive","preview");await confirmGo();
 eq(msCalls("archive_thread")[0].args,{conversation_id:"conv1"},"archive args");await until(()=>!$("snackUndo").hidden,"Undo");$("snackUndo").click();
 await until(()=>msCalls("move_to_inbox").length,"undo call");eq(msCalls("move_to_inbox")[0].args,{message_ids:["a1","a2"]},"undo args")});
T("ms","Outlook reply: a draft in the conversation, never sent; no label button",async()=>{
 ok(!q('[data-mlabel="conv1"]'),"label button on Outlook mail");closeAll();clear();click('[data-mreply="conv1"]');await until(()=>$("drEd").open&&$("drTo").value,"draft sheet");
 $("drDraft").click();await until(()=>$("drBody").value.includes("Alex"),"draft");$("drGo").click();await until(()=>!$("drRev").hidden,"review");
 has($("drPay").textContent,'"reply_to_message_id": "om1"',"payload");has($("drRevSum").textContent,"Open Outlook","summary");$("drGo").click();await until(()=>!$("drEd").open,"saved");
 const c=msCalls("create_draft")[0];eq([c.args.to,c.args.reply_to_message_id],[["y@example.edu"],"om1"],"draft");ok(c.dlg,"saved outside review");eq(calls().filter(x=>x.server==="Gmail").length,0,"Gmail calls")});
T("ms","Outlook calendar: Block time, RSVP and Reschedule go to Outlook, times in UTC",async()=>{
 closeAll();clear();click('#tasks [data-block="task:T2"]');await until(()=>$("blkEd").open,"Block time");$("blkDate").value=window.__day(2);$("blkStart").value="15:00";$("blkDur").value="60";$("blkGo").click();await confirmGo();
 const ce=msCalls("create_event")[0];ok(ce,"no Outlook create_event");const want=new Date(window.__day(2)+"T15:00:00").toISOString().replace(/\.\d{3}Z$/,"Z");
 eq([ce.args.calendar_id,ce.args.start],[window.__ms.MSPERS,want],"event");eq(calls().filter(c=>c.server==="Google Calendar").length,0,"Google Calendar calls");
 clear();click('[data-rsvp="accepted"][data-rev="pm1"]');await confirmGo();eq(msCalls("respond_to_event")[0].args,{event_id:"pm1",response:"accepted"},"RSVP");
 clear();click('[data-resched="cc1"]');await until(()=>$("rsEd").open,"reschedule");$("rsDate").value=window.__day(3);$("rsStart").value="14:00";$("rsGo").click();await confirmGo();
 const u=msCalls("update_event")[0];eq([u.args.event_id,u.args.start.endsWith("Z")],["cc1",true],"move")});
T("ms","Outlook safety: every Outlook mail and calendar write happened inside a confirm or review step",async()=>{
 const W=["create_event","update_event","respond_to_event","create_draft","archive_thread","create_office_file"];const w=window.__allCalls.filter(c=>c.server===MSV&&W.includes(c.tool));
 ok(w.length>=5,"too few Outlook writes exercised");eq(w.filter(c=>!c.dlg).map(c=>c.tool),[],"writes without a confirm")});

// ======================= Google and Microsoft together =======================
T("both","Both: one inbox with Gmail and Outlook mail, each tagged",async()=>{
 await until(()=>q('[data-march="th1"]')&&q('[data-march="conv1"]'),"both inboxes");const tags=qa("#mail .tag.src").map(x=>x.textContent);
 ok(tags.includes("Google")&&tags.includes("Outlook"),"source tags: "+tags.join(","))});
T("both","Both: the same meeting on Google and Outlook shows once",async()=>{
 await until(()=>$("agenda").textContent.includes("Exec meeting"),"the meeting");eq(qa("#agenda li").filter(li=>li.textContent.includes("Exec meeting")).length,1,"rows for the meeting")});
T("both","Both: Find a free time only offers slots free on both sides",async()=>{
 closeAll();click('[data-block="free"]');await until(()=>$("blkEd").open,"Block time");$("blkDate").value=window.__day(1);$("blkDur").value="60";clear();$("blkFind").click();
 await until(()=>qa("#blkSlots [data-slot]").length||/No free time/.test($("blkFindMsg").textContent),"free slots");
 ok(calls("suggest_time").length&&msCalls("find_free_time").length,"both sides asked");const sl=qa("#blkSlots [data-slot]").map(b=>new Date(b.dataset.slot));
 eq(sl.length,1,"slots offered");eq(sl[0].getHours()+":"+sl[0].getMinutes(),"14:0","slot start (Google 13-15 overlaps Outlook 14-16)")});
T("both","Both: a reply to Outlook mail is an Outlook draft; a new organization update follows the Gmail default",async()=>{
 closeAll();clear();click('[data-mreply="conv1"]');await until(()=>$("drEd").open&&$("drTo").value,"draft sheet");$("drDraft").click();await until(()=>$("drBody").value.includes("Alex"),"draft");
 $("drGo").click();await until(()=>!$("drRev").hidden,"review");$("drGo").click();await until(()=>!$("drEd").open,"saved");eq(calls("create_draft")[0].server,MSV,"reply provider");
 clear();click('[data-pmdraft="1"]');await until(()=>$("drEd").open,"update sheet");$("drDraft").click();await until(()=>$("drBody").value.includes("Alex"),"draft");
 $("drGo").click();await until(()=>!$("drRev").hidden,"review");$("drGo").click();await until(()=>!$("drEd").open,"saved");eq(calls("create_draft")[0].server,"Gmail","update provider")});

// Helpers for tests/custom/*.js (student-specific tests written during setup). Same rules as the tests above.
window.CC={T,$,q,qa,until,ok,eq,has,clear,calls,dbOps,setVal,click,confirmGo,cfPay,closeAll,sleep,marker,count,key};

// ======================= runner =======================
const ready={ms:()=>q('[data-march="conv1"]')&&q('[data-tplan="T1"]'),both:()=>q('[data-march="th1"]')&&q('[data-march="conv1"]'),setup:()=>$("suEd").open,local:()=>q('[data-tplan="T1"]'),pc:()=>q('[data-tplan="T1"]')&&q('#due [data-brief="ev1"]')&&q('[data-march="th1"]')&&q('[data-resched="cc1"]'),
 notif:()=>q('#due [data-brief]'),phone:()=>q('[data-tplan="T1"]')&&q('#due [data-brief="ev1"]')};
setTimeout(async()=>{const results=[];window.__results=results;window.__allCalls=[];
 // test-plan.json: which requirement each group proves and which feature it needs. project.json: this student's features.
 let plan={groups:[]},proj={features:null};try{plan=await (await fetch("test-plan.json",{cache:"no-store"})).json()}catch(e){}try{proj=await (await fetch("project.json",{cache:"no-store"})).json()}catch(e){}
 const groupOf=n=>(plan.groups||[]).find(g=>new RegExp(g.tests).test(n));
 const enabled=g=>g.core||!Array.isArray(proj.features)||String(g.feature||"").split("+").every(f=>proj.features.includes(f));
 const origPush=window.__log.push.bind(window.__log);
 window.__log.push=(...a)=>{for(const l of a)if(l[0]==="call")window.__allCalls.push({server:l[1],tool:l[2],args:l[3],dlg:l[4]});return origPush(...a)};
 try{await until(ready[MODE],"the page to load its fake data",8000)}catch(e){results.push({name:"Page loads",ok:false,err:e.message})}
 for(const t of tests.filter(t=>t.modes.includes(MODE))){const t0=performance.now();
  const g=groupOf(t.name);if(g&&!enabled(g)){results.push({name:t.name,ok:true,skipped:true,group:g.id,note:`skipped: this student doesn't use ${g.feature}`});continue}
  try{const r=await t.fn();results.push({name:t.name,ok:true,group:g?.id||"",note:(typeof r==="string"?r:"")+(g?"":" (not in test-plan.json: add it to a group)"),ms:Math.round(performance.now()-t0)})}
  catch(e){results.push({name:t.name,ok:false,group:g?.id||"",err:String(e?.message||e),ms:Math.round(performance.now()-t0)})}
  try{if(!t.keep)closeAll()}catch(e){}await sleep(30)}
 window.__done=true;try{parent.postMessage({ccTests:true,mode:MODE,results},"*")}catch(e){}},0);
})();
