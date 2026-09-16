const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const html=fs.readFileSync(require('path').join(__dirname,'../index.html'),'utf8');let n=0;
for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi))if(!/\bsrc=/.test(m[1])&&m[2].trim()){new vm.Script(m[2]);n++}
const scope={num:Number};vm.createContext(scope);vm.runInContext(html.slice(html.indexOf('function mfLateDaysValue('),html.indexOf('function mfAllocationRows(')),scope);
for(const amount of [0,0.01,100])for(const days of [0,29,30,40,60,61]){
const c={arrears:amount,lateDays:days,inLate:false,dueLateDays:0};assert.equal(scope.mfIsLate30to60(c),amount>0&&days>=30&&days<=60);assert.equal(scope.mfIsLate(c),amount>0&&days>=30);
}
let handlers={},stored=[],deleted=[];const cache={put:async(r)=>stored.push(r.url),match:async()=>new Response('shell'),addAll:async()=>{}};
const sw={URL,Response,self:{registration:{scope:'https://example.org/app/'},addEventListener:(n,f)=>handlers[n]=f,clients:{claim:async()=>{}},skipWaiting:async()=>{}},caches:{open:async()=>cache,keys:async()=>['mf-nexa-v5.3.2-20260914','unrelated-app'],delete:async k=>deleted.push(k)},fetch:async()=>new Response('ok'),clients:{}};
vm.createContext(sw);vm.runInContext(fs.readFileSync(require('path').join(__dirname,'../sw.js'),'utf8'),sw);
(async()=>{
for(const url of ['https://api.supabase.co/rest/v1/clients','https://example.org/app/private.pdf','https://example.org/app/index.html?token=secret']){
let intercepted=false;handlers.fetch({request:new Request(url),respondWith:()=>intercepted=true});assert(!intercepted);
}
let result;handlers.fetch({request:new Request('https://example.org/app/index.html'),respondWith:p=>result=p});await result;assert.equal(stored.length,1);
handlers.fetch({request:new Request('https://example.org/app/index.html',{headers:{authorization:'Bearer test'}}),respondWith:()=>assert.fail('auth request intercepted')});
let cleanup;handlers.activate({waitUntil:p=>cleanup=p});await cleanup;assert.deepEqual(deleted,['mf-nexa-v5.3.2-20260914']);
sw.fetch=async()=>{throw Error('offline')};handlers.fetch({request:new Request('https://example.org/app/index.html'),respondWith:p=>result=p});assert.equal(await (await result).text(),'shell');
const source=html.slice(html.lastIndexOf('window.mfSaveVisit=async function(){'),html.indexOf('/* Keep the approved branding',html.lastIndexOf('window.mfSaveVisit=async function(){')));
for(const mode of ['missing','error','empty','success']){
 const state={locations:[],visits:[]},events=[],c={id:2,clientNo:'TEST'},values={mfVisitIndex:'0',mfVisitTarget:'client',mfVisitDescription:'test',mfVisitAmount:'10',mfVisitLocationType:'home'};
 const context={clients:[c],byId:id=>({value:values[id]||''}),mfGpsCapture:{lat:31,lng:35,accuracy:5},mfCan:()=>true,num:Number,getSecureClient:async()=>mode==='missing'?null:{rpc:async()=>{events.push('rpc');return mode==='error'?{error:Error('denied')}:{data:mode==='empty'?null:{location_id:'l',visit_id:'v',payment_id:'p'}}}},mfFileData:async()=>null,mfActor:()=>({id:'actor',at:'now'}),mfClientKey:()=> '2',mfState:()=>state,mfCommit:()=>events.push('commit'),mfFormClose:()=>{},roleAwareBootstrap:async()=>events.push('reload'),mfLoadBackendState:async()=>{},mfSetClientTab:()=>{},mfToast:(s,t)=>events.push(t==='bad'?'error':'success')};context.$f=context.byId;context.st=context.mfState;context.mfNow=()=>"now";context.window=context;vm.createContext(context);vm.runInContext(source,context);await context.mfSaveVisit();
 if(mode!=='success'){assert.equal(state.visits.length,0);assert(!events.includes('success'))}else {assert.equal(state.visits.length,1);assert(events.indexOf('rpc')<events.indexOf('commit'));assert.equal(context.mfGpsCapture,null);}
}
console.log(JSON.stringify({inlineScripts:n,lateBoundaryCases:18,serviceWorkerChecks:7,fieldVisitHandlerChecks:4}));
})().catch(e=>{console.error(e);process.exitCode=1});
