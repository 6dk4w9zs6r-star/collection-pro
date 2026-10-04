const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const js=fs.readFileSync(path.join(__dirname,'../mf-update-20260916.js'),'utf8');
const code=js.slice(js.indexOf('window.mfOpenSourcePayments=async function(){'),js.indexOf('window.mfRenderReports=function(){',js.indexOf('window.mfOpenSourcePayments=async function(){')));
let checks=0;
(async()=>{
 for(const mode of ['ok','changed_actor','changed_epoch','error']){
  let actor='lo',epoch=1,forms=[],toasts=[],calls=[];
  const scope={window:null,uid:()=>actor,mfForm:(title,html)=>forms.push(html),money:String,safe:x=>String(x).replace(/</g,'&lt;'),mfToast:m=>toasts.push(m),dbRequired:async()=>({rpc:async name=>{calls.push(name);if(mode==='changed_actor')actor='other';if(mode==='changed_epoch')epoch++;return mode==='error'?{error:Error('denied')}:{data:[{client_number:'<client>',loan_sequence:2,employee_code:'LO512244',amount:100,payment_date:'04/10/2026',voucher_number:'V1',review_state:'account_not_in_reports'}]}}})};
  scope.window=scope;scope.mfSessionEpoch=()=>epoch;vm.createContext(scope);vm.runInContext(code,scope);await scope.mfOpenSourcePayments();
  assert.deepEqual(calls,['get_source_payment_history']);assert.equal(forms.length,mode==='ok'?1:0);checks+=2;
  if(mode==='ok'){assert(forms[0].includes('&lt;client>'));assert(forms[0].includes('الحساب غير موجود'));assert(!forms[0].includes('onclick='));checks+=3;}
  if(mode==='error'){assert.equal(toasts.length,1);checks++;}
 }
 console.log(JSON.stringify({checks,passed:true}));
})().catch(e=>{console.error(e);process.exit(1)});
