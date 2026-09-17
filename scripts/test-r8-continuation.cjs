const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8').replace(/\r\n/g,'\n');
function bootstrapFixture(){
 const html=read('index.html'),start=html.indexOf('async function roleAwareBootstrap(){'),end=html.indexOf('\nasync function secureInit()',start);
 const records={clients:[{id:1,days_overdue:40,overdue_amount:10,due_amount:10}],follow_ups:Array.from({length:1201},(_,i)=>({id:i+1,client_id:1,status:'pending',next_follow_up_at:i===1200?'2026-10-01':'2026-10-02',created_at:String(i).padStart(4,'0')}))};
 const calls=[];let fail=false,epoch=0,change=false;
 const db={from:table=>{let cursor=0;const q={select:()=>q,order:()=>q,limit:()=>q,eq:()=>q,gt:(_,id)=>{cursor=id;return q},then:(ok,bad)=>{calls.push({table,cursor});if(change&&table==='follow_ups')epoch++;return Promise.resolve(fail&&table==='follow_ups'&&cursor===500?{error:Error('page denied')}:{data:records[table].filter(r=>r.id>cursor).slice(0,500)}).then(ok,bad)}};return q}};
 const s={CURRENT_PROFILE:{id:'A',role:'founder'},CURRENT_AUTH_USER:{id:'A'},clients:[{id:'old'}],followUps:[{id:'old'}],getSecureClient:async()=>db,mfSessionEpoch:()=>epoch,num:v=>Number(v)||0,followUpDateOnly:v=>v,monthKey:()=>'',ensureLegacyLOs:()=>{},render:()=>{},applyRoleHomeSecurity:()=>{},console};s.window=s;vm.createContext(s);vm.runInContext(read('mf-loading-20260916.js'),s);vm.runInContext(html.slice(start,end),s);return {s,calls,fail:()=>fail=true,change:()=>change=true};
}
function chatFixture(){
 const channels=[],state={chat:[],settings:{}},s={CURRENT_PROFILE:{id:'A'},CURRENT_AUTH_USER:{id:'A'},mfChatSubscription:null,meta:{},mfState:()=>state,mfChatVisible:()=>false,document:{getElementById:()=>null},mfRenderChat:()=>{},console};
 const db={channel:()=>{const c={stopped:0,on:(_,__,fn)=>{c.receive=fn;return c},subscribe:()=>c,unsubscribe:()=>{c.stopped++;return Promise.resolve()}};channels.push(c);return c}};s.getSecureClient=async()=>db;s.window=s;vm.createContext(s);vm.runInContext(read('mf-messaging-20260916.js'),s);return {s,channels,state,db};
}
(async()=>{let checks=0;
 {const {s,calls}=bootstrapFixture();await s.roleAwareBootstrap();assert.equal(s.followUps.length,1201);assert.equal(s.clients[0].followup,'2026-10-01');assert.equal(s.followUps[0].id,1201);assert.equal(calls.filter(c=>c.table==='follow_ups').length,3);checks++;}
 {const {s,fail}=bootstrapFixture();fail();await assert.rejects(s.roleAwareBootstrap(),/page denied/);assert.equal(s.clients[0].id,'old');assert.equal(s.followUps[0].id,'old');checks++;}
 {const {s,change}=bootstrapFixture();change();await assert.rejects(s.roleAwareBootstrap(),/تغير الحساب/);assert.equal(s.clients[0].id,'old');assert.equal(s.followUps[0].id,'old');checks++;}
 {const {s,channels,state}=chatFixture();await s.mfSubscribeChat();s.mfStopChatSubscription();assert.equal(channels[0].stopped,1);assert.equal(s.mfChatSubscription,null);await s.mfSubscribeChat();assert.equal(channels.length,2);channels[0].receive({new:{id:'stale',sender_id:'A'}});assert.equal(state.chat.length,0);channels[1].receive({new:{id:'new',sender_id:'A'}});assert.equal(state.chat.length,1);checks++;}
 {const {s,channels,db}=chatFixture();let release;s.getSecureClient=()=>new Promise(r=>release=r);const pending=s.mfSubscribeChat();s.mfStopChatSubscription();release(db);await pending;assert.equal(channels.length,0);checks++;}
 {const {s,channels,db}=chatFixture();let release;s.getSecureClient=()=>new Promise(r=>release=r);const first=s.mfSubscribeChat();s.getSecureClient=async()=>db;await s.mfSubscribeChat();release(db);await first;assert.equal(channels.length,1);checks++;}
 console.log(JSON.stringify({r8ContinuationChecks:checks,database:'mocked',realMessagesSent:0}));
})().catch(e=>{console.error(e);process.exitCode=1});
