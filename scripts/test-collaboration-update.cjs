const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const source=fs.readFileSync(path.join(__dirname,'../mf-collaboration-20260916.js'),'utf8');
function setup(){
 const state={},dom={},events=[],rows={client_notes:[],announcements:[],announcement_reads:[]};let fail=false;
 const db={from:table=>({select:()=>{const q={order:()=>q,eq:()=>q,range:async()=>fail?{error:Error('read denied')}:{data:rows[table]}};return q;}}),rpc:async()=>({data:{id:'receipt',announcement_id:'a',user_id:'actor'}})};
 const s={window:null,document:{getElementById:id=>dom[id]},Date,Number,Set,Promise,console,setTimeout,clearTimeout,CURRENT_PROFILE:{id:'actor'},CURRENT_AUTH_USER:{id:'actor'},clients:[{id:2}],mfActor:()=>({id:'actor',name:'actor',branch:'B1'}),mfRole:()=> 'bm',mfCan:()=>true,mfState:()=>state,getSecureClient:async()=>db,mfFetchAllPages:async build=>{const {data,error}=await build().range(0,499);if(error)throw error;return data;},mfTimelineRows:()=>[],mfRenderClient:()=>events.push({render:true}),mfToast:(message,type)=>events.push({message,type}),mfFormClose:()=>events.push({closed:true}),mfOpenAnnouncementForm:()=>{},mfRenderCommunications:()=>{},mfShowMorningFinal:()=>{},mfShowTeamSpirit:()=>{},mfOpenCommunications:()=>{},mfLoadBackendState:async()=>{},mfFileData:async()=>null,mfAccessibleTeams:()=>['T1'],mfConfirmedInsert:async(table,payload)=>{events.push({insert:table,payload});return {id:'saved',...payload,created_at:new Date().toISOString()};}};
 s.window=s;vm.createContext(s);vm.runInContext(source,s);return {s,state,dom,events,rows,db,failRead:()=>{fail=true;}};
}
(async()=>{
 let count=0;
 for(const mode of ['missing','denied','success','render_failure']){
  const {s,dom,state,events}=setup();dom.mfNoteIndex={value:'0'};dom.mfNoteText={value:'Persisted note'};
  if(mode==='missing')s.getSecureClient=async()=>null;if(mode==='denied')s.mfConfirmedInsert=async()=>{throw Error('RLS denied');};if(mode==='render_failure')s.mfRenderClient=()=>{throw Error('render failed');};
  await s.mfSaveNote();assert.equal((state.clientNotes||[]).length,mode==='success'||mode==='render_failure'?1:0);assert.equal(s.mfNoteSaving,false);
  if(mode==='render_failure')assert(events.some(e=>e.message?.includes('تم حفظ الملاحظة؛')));count++;
 }
 {const {s,dom,state}=setup();dom.mfNoteIndex={value:'0'};dom.mfNoteText={value:'Note'};let release;s.mfConfirmedInsert=()=>new Promise(r=>release=r);const first=s.mfSaveNote();await new Promise(r=>setImmediate(r));await s.mfSaveNote();release({id:'n',client_id:2,note_text:'Note',created_at:'2026-09-16'});await first;assert.equal(state.clientNotes.length,1);count++;}
 {const {s,state,rows,failRead}=setup();rows.client_notes=[{id:'n',client_id:2,note_text:'Durable',created_at:'2026-09-16'}];await s.mfRefreshClientNotes();assert.equal(s.mfTimelineRows({id:2})[0].text,'Durable');count++;state.clientNotes=[];await s.mfRefreshClientNotes();assert.equal(state.clientNotes.length,1);count++;failRead();await assert.rejects(s.mfRefreshClientNotes());assert.equal(state.clientNotes.length,1);count++;}
 {const {s}=setup();const base={dbId:'a',isPublished:true};for(const [row,visible] of [[base,true],[{...base,isPublished:false},false],[{isPublished:true},false],[{...base,startsAt:'2999-01-01'},false],[{...base,endsAt:'2000-01-01'},false],[{...base,startsAt:'bad'},false]]){assert.equal(s.mfAnnouncementVisible(row),visible);count++;}}
 for(const mode of ['success','failure','mismatch','refresh_failure']){
  const {s,db,rows,state,events,failRead}=setup();rows.announcements=[{id:'a',content_type:'morning',is_published:true}];rows.announcement_reads=[{id:'r',announcement_id:'a',user_id:'actor'}];state.morningContent=[{id:'a',readBy:[]}];
  if(mode==='failure')db.rpc=async()=>({error:Error('denied')});if(mode==='mismatch')db.rpc=async()=>({data:{id:'r',announcement_id:'other',user_id:'actor'}});if(mode==='refresh_failure')failRead();
  await s.mfMarkMorningRead('a');assert.equal(state.morningContent[0].readBy.length,mode==='success'?1:0);assert.equal(s.mfAcknowledging,false);
  if(mode==='refresh_failure')assert(events.some(e=>e.message?.includes('تم حفظ تأكيد القراءة؛')));count++;
 }
 for(const published of [false,true]){
  const {s,dom,events}=setup();Object.assign(dom,{mfCommTitle:{value:'Title'},mfCommText:{value:'Body'},mfCommKind:{value:'announcement'},mfCommAudience:{value:'team'},mfCommTeam:{value:'T1'},mfCommPublish:{checked:published}});
  await s.mfSaveCommunicationFinal();const write=events.find(e=>e.insert);assert(write);assert.equal(write.payload.is_published,published);assert.equal(write.payload.branch_code,'B1');assert.equal(write.payload.team_key,'T1');assert(events.some(e=>e.closed));count++;
 }
 {const {s,dom,events}=setup();Object.assign(dom,{mfCommTitle:{value:'Title'},mfCommText:{value:'Body'},mfCommAudience:{value:'team'},mfCommTeam:{value:'invented'}});await s.mfSaveCommunicationFinal();assert(!events.some(e=>e.insert));count++;}
 {const {s,rows,state}=setup();rows.announcements=[{id:'a',content_type:'morning',is_published:true},{id:'b',content_type:'team_spirit',is_published:true},{id:'c',content_type:'announcement',is_published:false}];rows.announcement_reads=[{announcement_id:'a',user_id:'actor'}];await s.mfRefreshCommunications();assert.equal(state.morningContent[0].readBy[0],'actor');assert.equal(state.teamSpiritContent.length,1);assert(!s.mfAnnouncementVisible(state.announcements[0]));count++;}
 console.log(JSON.stringify({collaborationBehaviorChecks:count}));
})().catch(e=>{console.error(e);process.exitCode=1;});
