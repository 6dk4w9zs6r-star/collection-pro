/* Unified pending report: source review never posts a financial transaction. */
(function(){
'use strict';
const el=id=>document.getElementById(id),actor=()=>CURRENT_AUTH_USER?.id||CURRENT_PROFILE?.id;
let sourceRows=[],cacheActor=null,cacheEpoch=null;
const fresh=()=>cacheActor===actor()&&cacheEpoch===window.mfSessionEpoch?.();
window.mfUnifiedPendingRows=function(){
 const rows=(meta.payments||[]).filter(p=>['pending','not_matched'].includes(p.status)).map(p=>({key:'payment:'+String(p.dbId||p.id),id:p.dbId||p.id,clientNo:p.clientNo,loanSequence:p.loanSequence||'',employee:p.employee,date:p.date,amount:p.amount,reference:p.reference||p.id,reason:p.status==='not_matched'?'غير مطابقة لحساب':p.type==='unclassified'?'جزئية أو رسوم تأجيل — تحتاج تصنيفًا':'دفعة معلقة — تحتاج مراجعة',source:false,type:p.type}));
 const refs=new Set((meta.payments||[]).map(p=>p.reference).filter(Boolean));
 if(fresh())for(const p of sourceRows){if(p.review_state!=='account_not_in_reports'||refs.has(p.source_identity))continue;rows.push({key:'source:'+p.source_identity,id:p.source_identity,clientNo:p.client_number,loanSequence:p.loan_sequence,employee:p.employee_code,date:p.payment_date,amount:p.amount,reference:p.voucher_number,reason:'غير مطابقة — سداد LMIS محفوظ؛ نوعه يحتاج مراجعة',source:true,classification:p.manual_classification||'',reviewReason:p.review_reason||''});}
 return rows;
};
window.mfOpenSourcePendingReview=function(id){
 if(!mfCanImportPayments())return mfToast('صلاحية مراجعة الدفعات المستقلة مطلوبة','bad');
 const p=mfUnifiedPendingRows().find(p=>p.source&&p.id===id);if(!p)return mfToast('أعد تحميل كشف الدفعات المعلقة','bad');
 mfForm('مراجعة دفعة مصدر معلقة','<p>'+safe(p.clientNo)+' / '+safe(p.loanSequence)+' • '+money(p.amount)+' • '+safe(p.reference)+'</p><p>تسجيل القرار يحفظ المراجعة فقط؛ لا يخصم من المستحق ولا يعكس إيصال LMIS.</p><input id="mfSourcePendingId" type="hidden" value="'+mfAttr(id)+'"><label>التصنيف</label><select id="mfSourcePendingClass"><option value="needs_account">تحتاج كشف حساب</option><option value="advance">دفعة مقدمة — موثقة</option><option value="partial">دفعة جزئية — موثقة</option><option value="deferral_fee">رسوم تأجيل — موثقة</option></select><label>سبب القرار / مرجع التحقق</label><textarea id="mfSourcePendingReason" maxlength="1000"></textarea><button class="mfSubmit" onclick="mfSaveSourcePendingReview()">حفظ المراجعة</button>');
};
let saving=false;
window.mfSaveSourcePendingReview=async function(){
 if(!mfCanImportPayments())return mfToast('صلاحية مراجعة الدفعات المستقلة مطلوبة','bad');if(saving)return;
 const id=el('mfSourcePendingId')?.value,kind=el('mfSourcePendingClass')?.value,reason=el('mfSourcePendingReason')?.value.trim();if(!id||!reason)return mfToast('سبب القرار مطلوب','bad');
 const who=actor(),epoch=window.mfSessionEpoch?.();saving=true;
 try{const db=await getSecureClient();if(!db)throw Error('الاتصال بقاعدة البيانات مطلوب');const {data,error}=await db.rpc('review_source_payment',{p_source_identity:id,p_classification:kind,p_reason:reason});if(error)throw error;if(!data?.source_identity)throw Error('لم تؤكد قاعدة البيانات المراجعة');if(actor()!==who||window.mfSessionEpoch?.()!==epoch)return;mfFormClose();await mfPreviewReport();mfToast('حُفظت المراجعة وسجلها؛ لم تتغير المستحقات');}catch(e){if(actor()===who&&window.mfSessionEpoch?.()===epoch)mfToast(e.message,'bad')}finally{saving=false;}
};
const oldRows=window.mfReportRows,oldPreview=window.mfPreviewReport,oldRender=window.mfRenderReports;
window.mfReportRows=function(type){if(type!=='pending_payments')return oldRows(type);return mfUnifiedPendingRows().map(p=>({PendingId:p.id,ClientNo:p.clientNo,LoanSequence:p.loanSequence,Employee:p.employee,Amount:p.amount,Date:p.date,Reference:p.reference,Reason:p.reason,Classification:p.classification||'',ReviewReason:p.reviewReason||''}));};
window.mfRenderReports=function(){oldRender();const option=el('mfReportType')?.querySelector('option[value="pending_payments"]');if(option)option.textContent='كشف الدفعات المعلّقة';};
window.mfPreviewReport=async function(){
 if(el('mfReportType')?.value!=='pending_payments')return oldPreview();const who=actor(),epoch=window.mfSessionEpoch?.(),out=el('mfReportPreview');if(!out)return;
 out.textContent='جارٍ تحميل الدفعات المعلقة…';sourceRows=[];cacheActor=null;
 try{await mfRefreshAuthoritativePayments();const db=await getSecureClient();if(!db)throw Error('الاتصال بقاعدة البيانات مطلوب');const {data,error}=await db.rpc('get_source_payment_history');if(error)throw error;if(who!==actor()||window.mfSessionEpoch?.()!==epoch||el('mfReportType')?.value!=='pending_payments')return;sourceRows=Array.isArray(data)?data:[];cacheActor=who;cacheEpoch=epoch;
 const rows=mfUnifiedPendingRows();out.innerHTML='<div class="mfPanel"><div class="mfPanelTitle">كشف الدفعات المعلّقة • '+rows.length+'</div><p>سبب التعليق ظاهر لكل دفعة. إيصال المصدر محفوظ؛ لا يعاد خصمه تلقائيًا. عكس الدفعة المالية المُرحّلة متاح في سجل الدفعات وفق الصلاحية.</p>'+rows.map(p=>'<div class="mfListRow"><b>'+safe(p.clientNo)+' / '+safe(p.loanSequence)+'</b><small>'+safe(p.employee||'')+' • '+safe(p.date||'')+' • '+money(p.amount)+' • '+safe(p.reference)+'<br>'+safe(p.reason)+(p.classification?'<br>المراجعة المسجلة: '+safe(({advance:'مقدمة',partial:'جزئية',deferral_fee:'رسوم تأجيل',needs_account:'تحتاج كشف حساب'})[p.classification]||p.classification)+' • '+safe(p.reviewReason):'')+'</small>'+(p.source?(mfCanImportPayments()?'<button class="mfSmallBtn" onclick="mfOpenSourcePendingReview(\''+mfAttr(p.id)+'\')">مراجعة يدوية</button>':''):p.type==='unclassified'?'<button class="mfSmallBtn" onclick="mfOpenPendingPayment(\''+mfAttr(String(p.id))+'\')">تصنيف يدوي</button>':'')+'</div>').join('')+(rows.length?'':'<p>لا توجد دفعات معلّقة ضمن صلاحياتك.</p>')+'</div>';
 }catch(e){if(who===actor()&&window.mfSessionEpoch?.()===epoch)out.textContent=e.message||'تعذر تأكيد كشف الدفعات المعلقة';}
};
})();
