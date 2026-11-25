// Fake Claude runtime for testing the Command Center page offline.
// Replaces window.claude completely, so nothing here can reach Gmail, Calendar, Drive, To Do or NotebookLM.
// Modes (URL hash #mode=...): pc (desktop app, Microsoft To Do server up, notifications not yet allowed),
// notif (desktop app, notifications allowed), phone (local servers unreachable, no desktop API),
// local (built-in task list, no To Do server), setup (first run: no profile yet),
// ms (Microsoft only: Outlook mail and calendar through the local server), both (Google and Microsoft together).
// All people, emails and calendar IDs here are made up.
(()=>{
const MODE=(location.hash.match(/mode=(\w+)/)||[])[1]||"pc";
window.__mode=MODE;window.__extraTools=[];// tests/custom/*.stub.js: push async (server,tool,args)=>payload-or-undefined
window.__log=[];window.__notes=[];window.__watches=[];
window.__placed=[];
try{localStorage.removeItem("cc-profile");localStorage.removeItem("cc-win-sized");localStorage.removeItem("cc-dismissed");localStorage.removeItem("cc-board-group");
 if(MODE==="notif")localStorage.setItem("cc-notified","{}");else localStorage.removeItem("cc-notified")}catch(e){}
const D=new Date();const k=n=>{const d=new Date(D.getFullYear(),D.getMonth(),D.getDate()+n);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`};
window.__day=k;
const PERSONAL="alex@example.com",CANVAS="lms-feed@import.example",ORGCAL="org-cal@group.example",WORKCAL="work@group.example",FAMCAL="family@group.example";
window.__cals={PERSONAL,CANVAS,ORGCAL};

// ---- fake db (in memory, live onSnapshot)
const store={},subs=[];let nid=1;
const snap=col=>({docs:Object.entries(store).filter(([p])=>p.startsWith(col+"/")&&p.split("/").length===2).map(([p,v])=>({id:p.split("/")[1],data:()=>JSON.parse(JSON.stringify(v))}))});
const fire=()=>{for(const s of subs)s.fn(snap(s.col))};
const db={collection:col=>({onSnapshot:fn=>{const s={col,fn};subs.push(s);setTimeout(()=>fn(snap(col)));return ()=>{subs.splice(subs.indexOf(s),1)}},
  add:async v=>{const id="d"+(nid++);store[col+"/"+id]=JSON.parse(JSON.stringify(v));window.__log.push(["db.add",col,v,id]);setTimeout(fire);return {id}}}),
 doc:p=>({get:async()=>({exists:p in store,data:()=>store[p]}),
  set:async v=>{store[p]=JSON.parse(JSON.stringify(v));window.__log.push(["db.set",p,v]);setTimeout(fire)},
  update:async v=>{if(!(p in store))throw {code:"not_found"};store[p]={...store[p],...JSON.parse(JSON.stringify(v))};window.__log.push(["db.update",p,v]);setTimeout(fire)},
  delete:async()=>{delete store[p];window.__log.push(["db.delete",p]);setTimeout(fire)}})};
window.__store=store;window.__db=db;

// ---- fake data: the profile (written by the setup wizard in real use)
if(MODE!=="setup")store["prefs/profile"]={name:"Alex Rivera",email:PERSONAL,school:"Pittsburg State University",city:"Pittsburg, Kansas",studies:"junior mechanical engineering",tagline:"Finish strong",
 org:{name:"Sigma Phi Epsilon",short:"SigEp",role:"VP of SLC"},work:{name:"Acme Builders",role:"intern"},extras:"Honors College",schoolDomains:["example.edu"],lmsHost:"canvas.example.edu",
 calendars:[{id:PERSONAL,kind:"personal"},{id:CANVAS,kind:"lms"},{id:ORGCAL,kind:"org"},{id:FAMCAL,kind:"family"},{id:WORKCAL,kind:"work"}],tasks:MODE==="local"?"db":"mstodo",notebooklm:true,theme:"accessible",themes:[]};
// Microsoft calendars (fake ids) for the ms and both modes
const MSPERS="ms-personal",MSCANVAS="ms-canvas",MSORG="ms-org",MSWORK="ms-work";window.__ms={MSPERS,MSCANVAS,MSORG,MSWORK};
if(MODE==="ms")Object.assign(store["prefs/profile"],{accounts:{google:false,microsoft:true},mailDefault:"microsoft",email:"alex@example.edu",
 calendars:[{id:MSPERS,kind:"personal",provider:"microsoft"},{id:MSCANVAS,kind:"lms",provider:"microsoft"},{id:MSORG,kind:"org",provider:"microsoft"}]});
if(MODE==="both")Object.assign(store["prefs/profile"],{accounts:{google:true,microsoft:true},mailDefault:"google",
 calendars:[{id:PERSONAL,kind:"personal"},{id:CANVAS,kind:"lms"},{id:MSORG,kind:"org",provider:"microsoft"},{id:MSWORK,kind:"work",provider:"microsoft"}]});
store["classes/c1"]={code:"MAE 3403",name:"Thermodynamics",notebookId:"nb-1",archived:false,created:1};
store["items/i1"]={classId:"c1",type:"quiz",title:"Practice quiz",body:"Q: What is 2+2?\nA) 3\n*B) 4\nC) 5\nExplain: Basic addition.",url:"",archived:false,created:1,updated:1};
store["classes/c2"]={code:"ENGL 1113",name:"Composition I",archived:false,created:2};
const tasks=[
 {id:"T1",title:"Prep heat transfer exam",categories:["School","MAE 3403"],status:"notStarted",importance:"high",due_date:k(3),body:"Chapters 7-9.",
  links:[{web_url:"https://mail.google.com/mail/u/0/#inbox/th1",application_name:"Gmail",display_name:"Exam review info",external_id:"gmail:th1"},{web_url:"https://canvas.example.edu/courses/1/assignments/9",application_name:"Canvas",display_name:"HW 9",external_id:"gcal:ev1"}]},
 {id:"T2",title:"Committee chair check-ins",categories:["SigEp"],status:"notStarted",importance:"normal",due_date:k(5),body:"",links:[{web_url:"https://calendar.google.com/cc1",application_name:"Google Calendar",display_name:"[CC] Check-ins",external_id:"gcal:cc1"}]},
 {id:"T3",title:"Formatted-notes task",categories:["Personal"],status:"notStarted",importance:"normal",due_date:"",body:"<p>Rich text</p>",body_type:"html",links:[]},
 {id:"T4",title:"Long-notes task",categories:["Career"],status:"notStarted",importance:"normal",due_date:k(9),body:"x".repeat(2000),links:[]}];
if(MODE==="phone"||MODE==="local"){for(const t of tasks)store["todo/m"+t.id]={todoId:t.id,title:t.title,categories:t.categories,status:t.status,importance:t.importance,due:t.due_date||"",reminder:"",notes:String(t.body).slice(0,2000),
  links:t.links.map(l=>({...l})),doneAt:0,updated:Date.now()};
 const doneDoc=(id,title,days)=>({todoId:id,title,categories:["Personal"],status:"completed",importance:"normal",due:"",reminder:"",notes:"",links:[],doneAt:Date.now()-days*864e5,updated:Date.now()});
 store["prefs/profile"].theme="dark";// chosen on the PC earlier
 store["todo/mT8"]=doneDoc("T8","Recently finished task",2);store["todo/mT9"]=doneDoc("T9","Long-finished task",10);
 store["briefs/b1"]={eventId:"ev1",classId:"c1",title:"HW 9",text:"Saved brief: fin efficiency, Nusselt number.",made:Date.now()-36e5}}
const at=(n,h,m)=>`${k(n)}T${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:00`;
const evs={
 [CANVAS]:[{id:"ev1",summary:"HW 9 [MAE-3403-001]",start:{date:k(1)},end:{date:k(2)},description:"https://canvas.example.edu/courses/1/assignments/9"},
  {id:"ev2",summary:"Essay draft [ENGL-1113-002]",start:{date:k(4)},end:{date:k(5)}},
  {id:"ev3",summary:"Quiz 6 [MAE-3403-001]",start:{date:k(6)},end:{date:k(7)}}],
 [PERSONAL]:[...(MODE==="both"?[{id:"pm1-g",summary:"Exec meeting",start:{dateTime:at(2,18,0)},end:{dateTime:at(2,19,0)},htmlLink:"https://calendar.google.com/pm1"}]:[]),{id:"cc1",summary:"[CC] Check-ins",start:{dateTime:at(1,10,0)},end:{dateTime:at(1,11,0)},htmlLink:"https://calendar.google.com/cc1"}],
 [ORGCAL]:[{id:"pm1",summary:"Exec meeting",start:{dateTime:at(2,18,0)},end:{dateTime:at(2,19,0)},organizer:{email:"president@example.com",displayName:"Chapter President"},attendees:[{email:PERSONAL,self:true,responseStatus:"needsAction"}]}]};
const Z=local=>new Date(local).toISOString().replace(/\.\d{3}Z$/,"Z");
const msEvents={
 [MSCANVAS]:[{id:"ev1",title:"HW 9 [MAE-3403-001]",start:k(1),end:k(2),all_day:true,web_link:"https://canvas.example.edu/courses/1/assignments/9",description:"https://canvas.example.edu/courses/1/assignments/9",organizer:{name:"",email:""},is_organizer:true,my_response:"accepted"},
  {id:"ev3",title:"Quiz 6 [MAE-3403-001]",start:k(6),end:k(7),all_day:true,web_link:"",organizer:{},is_organizer:true,my_response:"accepted"}],
 [MSPERS]:[{id:"cc1",title:"[CC] Check-ins",start:Z(at(1,10,0)),end:Z(at(1,11,0)),all_day:false,web_link:"https://outlook.example/ev/cc1",organizer:{name:"Alex Rivera",email:"alex@example.edu"},is_organizer:true,my_response:"accepted"}],
 [MSORG]:[{id:"pm1",title:"Exec meeting",start:Z(at(2,18,0)),end:Z(at(2,19,0)),all_day:false,web_link:"https://outlook.example/ev/pm1",organizer:{name:"Chapter President",email:"president@example.com"},is_organizer:false,my_response:"needsAction"}],
 [MSWORK]:[]};
if(MODE==="both")msEvents[MSORG][0].id="pm1-ms";// same meeting also on the Google side (see evs): shows once
const msThreads=[{id:"conv1",message_id:"om1",subject:"Lab section moved",sender:"Prof Y <y@example.edu>",date:at(0,9,30),snippet:"Lab moves to Thursday",web_link:"https://outlook.example/mail/conv1"}];
const msFull={messages:[{id:"om0",sender:"Prof Y <y@example.edu>",date:at(-1,8,0),plaintextBody:"Lab moves to Thursday."},{id:"om1",sender:"Prof Y <y@example.edu>",date:at(0,9,30),plaintextBody:"Bring goggles."}]};
const threads=[{id:"th1",viewUrl:"https://mail.google.com/mail/u/0/#inbox/th1",messages:[{id:"m0",sender:"Prof X <x@example.edu>",subject:"Exam review info",snippet:"Exam covers ch 7-9"}]}];
const fullThread={messages:[{id:"m0",sender:"Prof X <x@example.edu>",date:at(-1,9,0),plaintextBody:"Exam covers ch 7-9."},{id:"m1",sender:"Prof X <x@example.edu>",date:at(0,8,0),plaintextBody:"Bring a calculator."}]};

// ---- fake connectors. Every call is logged with whether a confirm/review dialog was open at that moment.
const dlgOpen=()=>!!document.querySelector("#cfEd[open],#drEd[open]");
const hostDown=s=>MODE==="phone"&&s.startsWith("host:");
const mcp={
 watchTool:(server,tool,input,h)=>{window.__watches.push(server+" "+tool);setTimeout(()=>{
  if(server==="Google Calendar")h({type:"data",result:{payload:{events:evs[input.calendarId]||[]},cache:{storedAt:Date.now()}}});
  else if(server==="Gmail")h({type:"data",result:{payload:{threads},cache:{storedAt:Date.now()}}});
  else if(server==="Google Drive")h({type:"data",result:{payload:{files:[{id:"gx",title:"Lab 3 report",viewUrl:"https://docs.google.com/document/d/gx",mimeType:"application/vnd.google-apps.document",modifiedTime:new Date().toISOString()}]},cache:{storedAt:Date.now()}}});
  else if(hostDown(server))h({type:"error",error:{code:"server_not_connected"}});
  else if(server==="host:cc-microsoft"){const pl=tool==="list_tasks"?{tasks:JSON.parse(JSON.stringify(tasks))}:tool==="list_events"?{events:JSON.parse(JSON.stringify(msEvents[input.calendar_id]||[]))}:tool==="search_messages"?{threads:JSON.parse(JSON.stringify(msThreads))}:{};
   h({type:"data",result:{payload:pl,cache:{storedAt:Date.now()}}})}},30);return ()=>{}},
 callTool:async(server,tool,args)=>{window.__log.push(["call",server,tool,JSON.parse(JSON.stringify(args||{})),dlgOpen()]);
  for(const f of window.__extraTools)try{const r=await f(server,tool,args);if(r!==undefined)return r}catch(e){throw e}
  if(hostDown(server))throw {code:"server_not_connected"};
  if(server==="host:cc-microsoft"){switch(tool){
   case "list_calendars":return {payload:{calendars:[{id:MSPERS,name:"Calendar",is_default:true},{id:MSCANVAS,name:"Canvas"},{id:MSORG,name:"SigEp Exec Board"},{id:MSWORK,name:"Work"}]}};
   case "list_events":return {payload:{events:msEvents[args.calendar_id]||[]}};
   case "search_messages":return {payload:{threads:msThreads}};
   case "get_thread":return {payload:JSON.parse(JSON.stringify(msFull))};
   case "create_draft":return {payload:{id:"od1",web_link:"https://outlook.example/drafts/od1",is_draft:true}};
   case "archive_thread":return {payload:{moved:["a1","a2"]}};
   case "move_to_inbox":return {payload:{moved:["i1","i2"]}};
   case "create_event":return {payload:{id:"msnew",title:args.title,web_link:"https://outlook.example/ev/msnew"}};
   case "update_event":return {payload:{id:args.event_id}};
   case "respond_to_event":return {payload:{event_id:args.event_id,response:args.response}};
   case "find_free_time":return {payload:{time_slots:[{start:Z(at(1,14,0)),end:Z(at(1,16,0))}]}};
   case "whoami":return {payload:{account:"alex@example.edu"}};
   case "list_files":return {payload:{files:[{id:"od1",name:"Budget.xlsx",web_url:"https://onedrive.example/od1",modified:new Date().toISOString()}]}};
   case "create_office_file":return {payload:{id:"of1",name:args.title+"."+args.kind,web_url:"https://onedrive.example/of1"}};
  }}
  switch(tool){
   case "suggest_time":return {payload:{timeSlots:[{startTime:at(1,9,0),endTime:at(1,10,0)},{startTime:at(1,13,0),endTime:at(1,15,0)}]}};
   case "list_calendars":return {payload:{calendars:[{id:PERSONAL,summary:"Alex Rivera",primary:true},{id:CANVAS,summary:"Alex Rivera Calendar (Canvas)",description:"Calendar events for the user"},
    {id:"holidays@group.example",summary:"Holidays in United States"},{id:ORGCAL,summary:"SigEp Exec Board"},{id:WORKCAL,summary:"Work shifts"}]}};
   case "list_task_lists":return {payload:{task_lists:[{id:"L1",name:"Tasks",is_default:true}]}};
   case "whoami":return {payload:{account:"test account"}};
   case "list_labels":return {payload:{labels:[{labelId:"L_1",name:"School",labelType:"USER"},{labelId:"INBOX",name:"INBOX",labelType:"SYSTEM"}]}};
   case "get_thread":return {payload:JSON.parse(JSON.stringify(fullThread))};
   case "notebook_query":if(window.__nlmEmpty)return {payload:{status:"error",error:"This notebook has no sources to query. Add a source first using 'nlm source add' or 'nlm research start'."}};
    return {payload:{status:"success",answer:"Key concepts: fin efficiency; Nusselt number Nu = hL/k (dimensionless)."}};
   case "create_event":return {payload:{id:"newev",htmlLink:"https://calendar.google.com/newev"}};
   case "create_draft":return {payload:{id:"draft1"}};
   case "create_task":{const t={id:"N"+(nid++),status:"notStarted",links:[],...args};delete t.list_id;tasks.push(t);return {payload:JSON.parse(JSON.stringify(t))}}
   case "update_task":case "complete_task":{const t=tasks.find(x=>x.id===args.task_id);if(!t)throw {code:"tool_error",message:"not found"};
    const {list_id,task_id,...rest}=args;Object.assign(t,rest);if(tool==="complete_task")t.status="completed";return {payload:JSON.parse(JSON.stringify(t))}}
   case "add_task_link":{const t=tasks.find(x=>x.id===args.task_id);return {payload:JSON.parse(JSON.stringify(t||{}))}}
   case "create_file":return {payload:{id:"gd1",title:args.title,viewUrl:"https://docs.google.com/document/d/gd1"}};
   case "search_threads":return {payload:{threads}};
   case "list_events":return {payload:{events:evs[args.calendarId]||[]}};
   default:return {payload:{}}}},
 invalidate:async()=>{}};
window.__tasks=tasks;

// ---- fake Claude sampling: answers by which feature's prompt it sees
const sample=async(p,o={})=>{window.__log.push(["sample",String(p).slice(0,120),(o.images||[]).length]);window.__lastPrompt=String(p);
 if(o.images?.length){const t=/alt text/.test(p)?"Whiteboard with heat transfer equations":"Fin efficiency\n- eta = tanh(mL)/(mL)";o.onText?.({text:t,delta:t});return {text:t,truncated:false}}
 if(/starting outline/.test(p)){const t="Introduction\n- What is being tested?\nMethod\n- Which steps did you follow?";return {text:t,truncated:false}}
 const text=/update email/.test(p)?"Hi everyone,\n\nHere's what's coming up.\n\nAlex":"Hi Professor X,\n\nThanks for the details.\n\nAlex";
 o.onText?.({text,delta:text});return {text,truncated:false}};
sample.json=async(p,o={})=>{window.__log.push(["sample.json",String(p).slice(0,120)]);window.__lastPrompt=String(p);
 if(/Suggest 3 colour themes/.test(p))return {themes:[{name:"Crimson and gold",accent:"#a6192e",mode:"light",why:"your school colours"},{name:"Purple and red",accent:"#5b2c83",mode:"dark",why:"your fraternity colours"},{name:"bad",accent:"red",mode:"light"}]};
 if(/product manager for Command Center/.test(p))return {verdict:"setup",summary:"It can work once Buffer is connected.",how:"A Social tab saves drafts to Buffer.",needs:["A Buffer account"]};
 if(/Turn this note into one calendar event/.test(p))return {title:"Study group",date:k(1),start:"19:00",end:"21:00",calendar:"Personal"};
 if(/Plan the rest of (her|their) day/.test(p)){const n=new Date();const m=Math.ceil((n.getHours()*60+n.getMinutes()+60)/5)*5;const hm=x=>`${String(Math.floor(x/60)).padStart(2,"0")}:${String(x%60).padStart(2,"0")}`;
  return {headline:"Test day",priorities:[{title:"Study",why:"exam",taskId:null,eventId:null}],blocks:m+30<1380?[{start:hm(m),end:hm(m+30),title:"Focus block",kind:"focus",taskId:null}]:[],startEarly:null}}
 return {summary:"Review ch 7-9 then practice",steps:[{text:"Skim ch 7 notes",minutes:25},{text:"Work 5 practice problems",minutes:70}],
  deliverables:[{text:"Study guide for ch 7-9",kind:"study-guide",agent:"engineering-tutor"},{text:"Deep report on fins",kind:"research",agent:"deep-researcher"},{text:"A web page",kind:"page",agent:"builder"}]}};

// ---- fake desktop API (only the installed app has notifications)
const perms={notifications:MODE==="notif"?"granted":"prompt","full-access":"granted",shortcuts:"unavailable",overlay:"unavailable","menu-bar":"unavailable"};
const desktop=MODE==="phone"?{install:{state:async()=>"unavailable"}}:{
 notification:{show:async o=>{window.__notes.push(o.body)}},
 window:{place:async p=>{window.__placed.push(p);return {width:p.width,height:p.height}}},
 permissions:{state:async n=>n?perms[n]:{...perms},request:async()=>{perms.notifications="granted";return {...perms}},manage:async()=>{}},
 install:{state:async()=>"installed"}};
// fake asset storage (uploads): records what was uploaded, serves nothing
window.__uploads=[];let anum=1;
const assets={upload:async(blob,opts={})=>{const id="as"+(anum++);window.__uploads.push({id,type:blob.type||opts.type||"",size:blob.size,name:blob.name||""});return {id,url:"/_blob/"+id,sizeBytes:blob.size,contentType:blob.type||opts.type||""}},
 list:async()=>({assets:[],usage:{files:window.__uploads.length,bytes:0,maxFiles:100,maxBytes:1e8}}),delete:async()=>({deleted:false})};
sample.limits=async()=>({images:{maxCount:4}});
window.claude={use:async n=>({mcp,db,sample,desktop,assets,user:{isOwner:async()=>true}})[n]??null};
})();
