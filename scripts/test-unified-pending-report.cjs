const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const code=fs.readFileSync(path.join(__dirname,'pending-report-ui.js'),'utf8');let checks=0;
(async()=>{
 for(const mode of ['ok','changed_actor','changed_epoch','error']){
  const type={value:'pending_payments'},out={textContent:'',innerHTML:''};let epoch=1;
  const s={CURRENT_AUTH_USER:{id:'lo'},CURRENT_PROFILE:{id:'lo'},document:{getElementById:id=>id==='mfReportType'?type:id==='mfReportPreview'?out:null},meta:{payments:[{id:'p',dbId:'p',clientNo:'A',status:'pending',type:'unclassified',amount:20},{id:'u',dbId:'u',clientNo:'B',status:'not_matched',type:'import',amount:30},{id:'done',status:'successful',amount:50}]},mfSessionEpoch:()=>epoch,mfCanImportPayments:()=>false,mfRefreshAuthoritativePayments:async()=>{},mfReportRows:()=>[],mfPreviewReport:()=>{},mfRenderReports:()=>{},mfToast:()=>{},mfForm:()=>{},money:String,safe:x=>String(x??'').replace(/</g,'&lt;'),mfAttr:x=>String(x).replace(/'/g,'&#39;'),getSecureClient:async()=>({rpc:async()=>{if(mode==='changed_actor')s.CURRENT_AUTH_USER.id='other';if(mode==='changed_epoch')epoch++;return mode==='error'?{error:Error('denied')}:{data:[{source_identity:'s',client_number:'<C>',loan_sequence:1,amount:40,review_state:'account_not_in_reports'},{source_identity:'matched',amount:100,review_state:'baseline_reconciliation_required'}]}}})};s.window=s;vm.createContext(s);vm.runInContext(code,s);await s.mfPreviewReport();
  if(mode==='ok'){assert.equal(s.mfUnifiedPendingRows().length,3);assert(out.innerHTML.includes('كشف الدفعات'));assert(out.innerHTML.includes('&lt;C>'));assert(!out.innerHTML.includes('مراجعة يدوية'));assert.equal(s.mfReportRows('pending_payments').length,3);checks+=5;}
  else{assert.equal(out.innerHTML,'');assert.equal(s.mfUnifiedPendingRows().filter(r=>r.source).length,0);checks+=2;}
 }
 console.log(JSON.stringify({checks,passed:true}));
})().catch(e=>{console.error(e);process.exit(1)});
