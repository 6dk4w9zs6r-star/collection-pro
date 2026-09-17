const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const source=fs.readFileSync(path.join(__dirname,'../mf-update-20260916.js'),'utf8');new vm.Script(source);
function setup(){
 const state={locations:[],partyLocations:[],pendingPayments:[],settings:{}},dom={},events=[];
 const c={id:2,clientNo:'T',name:'Client',installment:20};
 const scope={console,Number,Map,Set,Date,Promise,setTimeout,document:{getElementById:id=>dom[id]},navigator:{},clients:[c],meta:{payments:[]},CURRENT_AUTH_USER:{id:'user'},CURRENT_PROFILE:{id:'user'},mfRole:()=> 'lo',mfCan:()=>true,mfState:()=>state,mfClientKey:x=>String(x.id),mfToast:(message,type)=>events.push({message,type}),getSecureClient:async()=>null,mfSavePayment:async()=>{},mfRenderReports:()=>{},mfPreviewReport:()=>{},mfReportRows:()=>[],mfLoadBackendState:async()=>{},roleAwareBootstrap:async()=>events.push({reload:true}),mfRenderClient:()=>{},mfFormClose:()=>{},today:()=> '2026-09-16',mfNow:()=>new Date().toISOString(),save:()=>{},open:()=>events.push({opened:true})};scope.window=scope;vm.createContext(scope);vm.runInContext(source,scope);return {scope,state,dom,events,c};
}
(async()=>{
 let count=0;
 const {scope:s,state,c,events}=setup();
 for(const x of [{lat:null,lng:null},{lat:'',lng:''},{lat:91,lng:0},{lat:0,lng:181},{lat:NaN,lng:0}]){assert(!s.mfValidCoordinates(x));count++;}
 assert(s.mfValidCoordinates({lat:0,lng:0}));count++;
 state.locations.push({dbId:'1',clientId:'2',type:'client_home',lat:31,lng:35,createdAt:'2026-09-15'},{dbId:'2',clientId:'2',type:'guarantor_work',lat:32,lng:36,createdAt:'2026-09-16'},{dbId:'3',clientId:'2',type:'client',lat:null,lng:null,createdAt:'2026-09-17'});
 assert.equal(s.mfLatestPartyLocation(c,'client').dbId,'1');assert.equal(s.mfLatestPartyLocation(c,'guarantor').dbId,'2');count+=2;
 s.mfOpenPartyLocation(0,'client');assert(events.some(e=>e.opened));count++;
 s.meta.payments=[{id:'a',date:'2026-09-15',amount:10,status:'successful'},{id:'b',date:'2026-09-16',amount:20,status:'successful',branch:'B1',employeeId:'E1'},{id:'c',date:'2026-09-16',amount:30,status:'successful',branch:'B2',employeeId:'E2'}];
 assert.equal(s.mfReportRows('payments').length,2);s.mfPaymentReportFilter.branch='B1';assert.equal(s.mfReportRows('payments').length,1);s.mfPaymentReportFilter.date='2026-09-15';assert.equal(s.mfReportRows('payments').length,0);count+=3;
 for(const mode of ['missing','error','empty','success']){
   const {scope,dom,state,events}=setup();state.pendingPayments=[{id:'p',dbId:'p'}];dom.mfPendingId={value:'p'};dom.mfPendingClass={value:'partial'};
   scope.getSecureClient=async()=>mode==='missing'?null:{from:()=>({update:()=>({eq:()=>({eq:()=>({select:()=>({single:async()=>mode==='error'?{error:Error('denied')}:{data:mode==='empty'?null:{id:'p'}}})})})})})};
   scope.mfRefreshAuthoritativePayments=async()=>events.push({refreshed:true});
   await scope.mfClassifyPendingPayment();
   assert.equal(events.some(e=>e.reload),mode==='success');assert.equal(events.some(e=>e.refreshed),mode==='success');assert.equal(scope.mfClassifyingPayment,false);count++;
 }
 const {scope:g,state:gs}=setup();g.navigator.geolocation={getCurrentPosition:async cb=>cb({coords:{latitude:31,longitude:35}})};g.mfCapturePartyLocation(0,'client');await new Promise(r=>setImmediate(r));assert.equal(gs.locations.length,0);assert.equal(g.mfPartyGpsSaving,false);count++;
 const {scope:p}=setup();let pageCount=0;const all=await p.mfFetchAllPages(()=>({range:async(a,b)=>{pageCount++;return {data:Array.from({length:a===0?500:1},(_,i)=>i+a)};}}));assert.equal(all.length,501);assert.equal(pageCount,2);count++;
 for(const kind of ['writeOffs','deferrals','disbursements'])for(const mode of ['missing','error','empty','success','refresh_failure']){
  const {scope,state,events,c}=setup();state[kind]=[{id:'decision',dbId:'decision',status:'pending'}];c.netToPay=100;
  scope.getSecureClient=async()=>mode==='missing'?null:{from:()=>({update:()=>({eq:()=>({eq:()=>({select:()=>({single:async()=>mode==='error'?{error:Error('denied')}:{data:mode==='empty'?null:{id:'decision'}}})})})})})};
  scope.mfLoadBackendState=async()=>{if(mode==='refresh_failure')throw Error('refresh failed');events.push({loaded:true});};
  if(kind==='writeOffs')await scope.mfApproveWriteOff('decision','approved');else await scope.mfApproveOperation(kind,'decision','approved');
  assert.equal(c.netToPay,100);assert.equal(events.some(e=>e.loaded),mode==='success');
  if(mode==='refresh_failure')assert(events.some(e=>e.message?.includes('تم حفظ القرار')));
  if(['missing','error','empty'].includes(mode))assert(!events.some(e=>e.reload));count++;
 }
 const {scope:ds,state:dst,c:dc}=setup();dst.deferrals=[{id:'old',dbId:'old',clientId:'2',status:'approved',newDate:'2026-10-16',decidedAt:'2026-09-16'},{id:'new',dbId:'new',clientId:'2',status:'approved',newDate:'2026-11-16',decidedAt:'2026-09-17'},{id:'pending',dbId:'pending',clientId:'2',status:'pending',newDate:'2027-01-16',decidedAt:'2026-09-18'}];ds.mfApplySavedDeferralDates();assert.equal(dc.dueDate,'2026-11-16');count++;
 for(const change of ['account','generation']){
  const {scope}=setup();let epoch=0,calls=0;scope.mfSessionEpoch=()=>epoch;
  await assert.rejects(scope.mfFetchAllPages(()=>({range:async()=>{calls++;if(change==='account')scope.CURRENT_AUTH_USER={id:'other'};else epoch++;return {data:[{id:1}]};}})));
  assert.equal(calls,1);count++;
 }
 {const {scope}=setup();scope.CURRENT_AUTH_USER=null;scope.CURRENT_PROFILE=null;let calls=0;await assert.rejects(scope.mfFetchAllPages(()=>{calls++;return {range:async()=>({data:[]})}}));assert.equal(calls,0);count++;}
 for(const changeAt of ['gps','connect','response','none']){
  const {scope,state}=setup();let callback,epoch=0,writes=0,payload;scope.mfSessionEpoch=()=>epoch;
  scope.navigator.geolocation={getCurrentPosition:cb=>callback=cb};
  scope.getSecureClient=async()=>{if(changeAt==='connect')epoch++;return {from:()=>({insert:p=>{writes++;payload=p;return {select:()=>({single:async()=>{if(changeAt==='response')epoch++;return {data:{id:9,latitude:31,longitude:35,created_by:'user'}}}})}}})}};
  scope.mfCapturePartyLocation(0,'client');if(changeAt==='gps')epoch++;await callback({coords:{latitude:31,longitude:35}});
  assert.equal(writes,['gps','connect'].includes(changeAt)?0:1);assert.equal(state.locations.length,changeAt==='none'?1:0);assert.equal(scope.mfPartyGpsSaving,false);if(payload)assert.equal(payload.created_by,'user');count++;
 }
 console.log(JSON.stringify({approvedUpdateBehaviorChecks:count}));
})().catch(e=>{console.error(e);process.exitCode=1});
