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
 console.log(JSON.stringify({approvedUpdateBehaviorChecks:count}));
})().catch(e=>{console.error(e);process.exitCode=1});
