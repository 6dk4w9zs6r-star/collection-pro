const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
let parsed=0;for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){if(!/\bsrc=/.test(m[1])&&m[2].trim()){new vm.Script(m[2]);parsed++}}
function segment(a,b,last=false){const i=last?html.lastIndexOf(a):html.indexOf(a);assert(i>=0,a);const j=html.indexOf(b,i);assert(j>i,b);return html.slice(i,j)}
const source=segment('async function mfPersistCollectionUpdate','function mfOpenPromiseForm')+
segment('window.mfSaveFollowup=async function(){','/* Promise:',true)+
segment('window.mfSavePromise=async function(){','/* Visit/location:',true)+
segment('window.mfUpdatePromise=async function(id,status){','window.mfSaveDeferral=',true);
function setup(mode){
 const state={followups:[],promises:[]},client={id:2,clientNo:'TEST',promiseDate:'old',status:'old'};
 const values={mfFollowIndex:'0',mfFollowDue:'2026-09-16T09:00',mfFollowType:'call',mfFollowStatus:'not_completed',mfFollowNote:'note',mfFollowReminder:'same_day',mfFollowTarget:'client',mfPromiseIndex:'0',mfPromiseDate:'2026-09-16',mfPromiseAmount:'10',mfPromiseNote:'note',mfPromiseTarget:'client'};
 const events=[];let payload;
 const db={from:()=>db,rpc:(_,p)=>{payload=p;return db},insert:p=>{payload=p;return db},update:p=>{payload=p;return db},eq:()=>db,select:()=>db,single:async()=>{
 events.push('db');
 if(mode==='throw')throw Error('network');
 if(mode==='error')return {error:Error('RLS')};
 if(mode==='empty')return {data:null};
 return {data:{id:15,client_id:2,created_by:'actor',created_at:'2026-09-15',updated_at:'2026-09-15',follow_up_type:'call',next_follow_up_at:payload.next_follow_up_at||'2026-09-16T09:00:00Z',status:payload.status||'pending',promise_date:payload.p_promise_date||'2026-09-16',promised_amount:10,notes:'note',completed_at:payload.completed_at||null,payment_date:payload.payment_date}};
 }};
 const c={clients:[client],CURRENT_AUTH_USER:{id:'actor'},CURRENT_PROFILE:{id:'actor'},mfState:()=>state,st:()=>state,s:()=>state,$f:id=>({value:values[id]}),num:Number,mfCan:()=>true,mfActor:()=>({id:'actor',at:'2026-09-15'}),mfClientKey:c=>String(c.id),arTarget:()=> 'العميل',getSecureClient:async()=>mode==='missing'?null:db,mfNow:()=> '2026-09-15T00:00:00Z',mfDateOnly:d=>d?.slice(0,10),mfCommit:()=>events.push('commit'),mfFormClose:()=>events.push('close'),mfRenderClient:()=>{},mfRenderToday:()=>{},mfToast:(t,type)=>events.push(type==='bad'?'error':'success'),prompt:()=> '2026-09-17',normalizeEnteredDate:d=>d,today:()=> '2026-09-15'};
 c.window=c;vm.createContext(c);vm.runInContext(source,c);return {c,state,client,events};
}
(async()=>{
 let tests=0;
 for(const name of ['mfSaveFollowup','mfSavePromise']){
 for(const mode of ['missing','throw','error','empty']){
 const {c,state,client,events}=setup(mode),before=JSON.stringify({state,client});await c[name]();
 assert.equal(JSON.stringify({state,client}),before,name+': '+mode);assert(!events.includes('success'));assert(events.includes('error'));tests++;
 }
 const {c,state,events}=setup('success');await c[name]();assert(events.indexOf('db')<events.indexOf('commit'));assert.equal(state[name==='mfSaveFollowup'?'followups':'promises'].length,1);tests++;
 }
 for(const name of ['mfUpdateFollowup','mfRescheduleFollowup','mfUpdatePromise']){
 for(const mode of ['missing','throw','error','empty','success']){
 const {c,state,events}=setup(mode),record={id:'15',dbId:15,clientId:'2',status:'pending',dueAt:'2026-09-16',promiseDate:'2026-09-16'};
 state[name==='mfUpdatePromise'?'promises':'followups'].push(record);const before=JSON.stringify(record);
 await c[name]('15',name==='mfUpdatePromise'?'kept':'not_completed');
 if(mode!=='success'){assert.equal(JSON.stringify(record),before,name+': '+mode);assert(!events.includes('success'));}else {assert(events.includes('success'));assert(events.indexOf('db')<events.indexOf('commit'))}tests++;
 }
 }
 for(const name of ['mfSaveFollowup','mfSavePromise']){const {c,state}=setup('success');await Promise.all([c[name](),c[name]()]);assert.equal(state[name==='mfSaveFollowup'?'followups':'promises'].length,1);tests++;}
 console.log(JSON.stringify({parsedInlineScripts:parsed,passedBehaviorTests:tests}));
})().catch(e=>{console.error(e);process.exitCode=1});

