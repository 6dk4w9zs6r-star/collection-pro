/* 16 September approved additions. All financial posting remains in Postgres. */
(function(){
'use strict';
const el=id=>document.getElementById(id);
const uid=()=>CURRENT_AUTH_USER?.id||CURRENT_PROFILE?.id;
const operational=()=>['founder','cfmp','bm','als','lo'].includes(mfRole());
async function dbRequired(){const db=await getSecureClient();if(!db)throw Error('الاتصال بقاعدة البيانات مطلوب');return db;}
async function pages(build){const rows=[];for(let offset=0;;offset+=500){const {data,error}=await build().range(offset,offset+499);if(error)throw error;if(!Array.isArray(data))throw Error('تعذر تأكيد البيانات');rows.push(...data);if(data.length<500)return rows;}}
window.mfFetchAllPages=pages;
window.mfConfirmedInsert=async function(table,payload){const db=await dbRequired(),{data,error}=await db.from(table).insert(payload).select().single();if(error)throw error;if(!data?.id)throw Error('لم تؤكد قاعدة البيانات الحفظ');return data;};
window.mfConfirmedUpdate=async function(table,payload,key,value){const db=await dbRequired(),{data,error}=await db.from(table).update(payload).eq(key,value).select().single();if(error)throw error;if(!data?.id)throw Error('لم تؤكد قاعدة البيانات التعديل');return data;};
window.mfValidCoordinates=function(x){return x&&x.lat!==null&&x.lng!==null&&x.lat!==''&&x.lng!==''&&Number.isFinite(Number(x.lat))&&Number.isFinite(Number(x.lng))&&Math.abs(Number(x.lat))<=90&&Math.abs(Number(x.lng))<=180;};
window.mfLatestPartyLocation=function(c,party){
  return (mfState().locations||[]).filter(x=>String(x.clientId)===String(mfClientKey(c))&&x.dbId&&mfValidCoordinates(x)&&
    (party==='guarantor'?/^guarantor(?:_|$)/.test(x.type||''):/^(client(?:_|$)|home$|work$|other$)/.test(x.type||'')))
    .sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')))[0]||null;
};
window.mfOpenPartyLocation=function(i,party){const c=clients?.[i],x=c&&mfLatestPartyLocation(c,party);if(!x)return mfToast('لا يوجد موقع محفوظ صالح لهذا الطرف','bad');window.open('https://www.google.com/maps?q='+encodeURIComponent(x.lat+','+x.lng),'_blank','noopener,noreferrer');};
window.mfSharePartyLocation=async function(i,party){
  const c=clients?.[i],x=c&&mfLatestPartyLocation(c,party);if(!x)return mfToast('لا يوجد موقع محفوظ صالح لهذا الطرف','bad');
  const url='https://www.google.com/maps?q='+encodeURIComponent(x.lat+','+x.lng),title=party==='guarantor'?'موقع الكفيل':'موقع العميل';
  try{if(navigator.share)await navigator.share({title,url});else{await navigator.clipboard.writeText(url);mfToast('تم نسخ رابط الموقع');}}catch(e){if(e.name!=='AbortError')mfToast('تعذر إرسال الموقع: '+e.message,'bad');}
};
window.mfCapturePartyLocation=function(i,party){
  const c=clients?.[i];if(!c||!['client','guarantor'].includes(party)||!mfCan('visit',c))return mfToast('غير مصرح لك بحفظ الموقع','bad');
  if(!navigator.geolocation)return mfToast('خدمة GPS غير متاحة','bad');if(window.mfPartyGpsSaving)return;
  window.mfPartyGpsSaving=true;mfToast('جاري التقاط الموقع...');
  navigator.geolocation.getCurrentPosition(async position=>{
    let saved=false;
    try{const coords={lat:position.coords.latitude,lng:position.coords.longitude};if(!mfValidCoordinates(coords))throw Error('إحداثيات GPS غير صالحة');
      const db=await dbRequired(),{data:row,error}=await db.from('locations').insert({client_id:c.id,latitude:coords.lat,longitude:coords.lng,location_type:party,status:'صحيح',description:'GPS مباشر — '+(party==='guarantor'?'الكفيل':'العميل'),created_by:uid()}).select().single();
      if(error)throw error;if(!row?.id)throw Error('لم تؤكد قاعدة البيانات حفظ الموقع');saved=true;
      const entry={id:String(row.id),dbId:row.id,clientId:mfClientKey(c),type:party,party,lat:row.latitude,lng:row.longitude,createdAt:row.created_at,actorId:row.created_by};
      mfState().locations.push(entry);mfState().partyLocations.push(entry);mfRenderClient();mfToast('تم حفظ الموقع');
    }catch(e){mfToast(saved?'تم حفظ الموقع؛ أعد تحميل العرض دون إعادة الحفظ':e.message,'bad');}finally{window.mfPartyGpsSaving=false;}
  },e=>{window.mfPartyGpsSaving=false;mfToast('تعذر التقاط الموقع: '+e.message,'bad');},{enableHighAccuracy:true,maximumAge:0,timeout:20000});
};

window.mfRefreshAuthoritativePayments=async function(){
  const actor=uid(),db=await dbRequired(),rows=await pages(()=>db.from('payments').select('*').order('id',{ascending:true}));
  if(!actor||uid()!==actor)throw Error('تغيرت جلسة المستخدم؛ أعد تحميل البيانات');
  const byId=new Map((clients||[]).map(c=>[String(c.id),c]));
  meta.payments=rows.map(p=>{const c=byId.get(String(p.client_id));return {id:p.id,dbId:p.id,clientId:c?mfClientKey(c):String(p.client_id||''),clientNo:p.client_number,name:c?.name||'',employee:c?.employee||'',employeeId:p.employee_id||c?.assignedUserId||'',branch:p.branch_code||'',amount:Number(p.amount),date:p.payment_date,type:p.payment_type,status:p.status,balanceBefore:p.balance_before,balanceAfter:p.balance_after,balance:p.balance_after,source:p.source,reference:p.source_reference,note:p.notes||'',receipt:p.receipt_url?{storagePath:p.receipt_url,name:'إيصال',persistent:true}:null,createdAt:p.created_at};});
  const paymentClients=new Map(rows.map(p=>[p.id,p.client_id]));
  mfState().pendingPayments=meta.payments.filter(p=>p.status==='pending'&&p.type==='unclassified').map(p=>({...p,installment:Number(byId.get(String(paymentClients.get(p.id)))?.installment)||0}));
  return rows;
};
window.mfClassifyPendingPayment=async function(){
  const p=mfState().pendingPayments.find(p=>String(p.id)===el('mfPendingId')?.value),kind=el('mfPendingClass')?.value;
  if(!p?.dbId||!['partial','deferral_fee'].includes(kind))return mfToast('اختر دفعة محفوظة وتصنيفًا صحيحًا','bad');
  if(window.mfClassifyingPayment)return;window.mfClassifyingPayment=true;let saved=false;
  try{const db=await dbRequired(),{data,error}=await db.from('payments').update({payment_type:kind,status:'successful',installment_units:0}).eq('id',p.dbId).eq('status','pending').select().single();
    if(error)throw error;if(!data?.id)throw Error('لم تؤكد قاعدة البيانات التصنيف');saved=true;
    await roleAwareBootstrap();await mfRefreshAuthoritativePayments();mfFormClose();mfRenderReports();mfToast('تم اعتماد التصنيف وتحديث الرصيد من قاعدة البيانات');
  }catch(e){mfToast(saved?'تم اعتماد التصنيف؛ أعد تحميل العرض دون إعادة العملية':e.message,'bad');}finally{window.mfClassifyingPayment=false;}
};
const savePaymentBefore=window.mfSavePayment;
window.mfSavePayment=async function(){if(window.mfPaymentSaving)return;window.mfPaymentSaving=true;try{return await savePaymentBefore();}finally{window.mfPaymentSaving=false;}};

window.mfImportPaymentsFile=async function(){
  const file=el('mfPaymentsImport')?.files?.[0],status=el('mfImportStatus');if(!file)return mfToast('اختر ملف الدفعات','bad');
  if(!operational())return mfToast('غير مصرح لك باستيراد الدفعات','bad');if(window.mfImportRunning)return;
  window.mfImportRunning=true;const results=[];
  try{
    if(!window.XLSX)throw Error('قارئ Excel غير متاح');const db=await dbRequired(),source=el('mfImportSource')?.value.trim();
    if(!source)throw Error('حدد اسم المصدر الثابت المعتمد');
    const wb=XLSX.read(await file.arrayBuffer()),input=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:''});
    const rows=input.map((row,i)=>{const read=keys=>row[mfHeaderKey(row,keys)],rawDate=read(['paymentdate','date','التاريخ']),ref=read(['reference','transactionid','receiptnumber','رقمالإيصال','مرجعالدفعة']);
      const date=typeof rawDate==='number'?XLSX.SSF.format('yyyy-mm-dd',rawDate):String(rawDate||'').trim();
      return {reference:String(ref??'').trim(),client_number:String(read(['clientno','customerno','رقمالعميل','customerid'])??'').trim(),amount:Number(read(['amount','paidamount','المبلغ','قيمةالدفعة'])),payment_date:date,original:row,row:i+2};});
    if(!rows.length)throw Error('الملف خالٍ من الدفعات');
    for(const row of rows){if(!row.reference||!row.client_number||!Number.isFinite(row.amount)||row.amount<=0||!/^\d{4}-\d{2}-\d{2}$/.test(row.payment_date))throw Error('السطر '+row.row+': يلزم مرجع دفعة ثابت ورقم عميل ومبلغ موجب وتاريخ YYYY-MM-DD');}
    for(let offset=0;offset<rows.length;offset+=100){
      const {data,error}=await db.rpc('import_payment_batch',{p_source:source,p_rows:rows.slice(offset,offset+100)});if(error)throw error;
      if(!Array.isArray(data)||data.length!==Math.min(100,rows.length-offset))throw Error('لم تؤكد قاعدة البيانات كل سجلات الدفعة');results.push(...data);
      status.textContent='تمت معالجة '+results.length+' / '+rows.length;await new Promise(resolve=>setTimeout(resolve,0));
    }
    await roleAwareBootstrap();await mfRefreshAuthoritativePayments();
    const count=s=>results.filter(r=>r.status===s).length;
    status.textContent=`مرحل: ${count('successful')} • بانتظار التصنيف: ${count('pending')} • محفوظ غير مطابق: ${count('not_matched')} • مكرر: ${count('duplicate')} • أخطاء: ${count('error')}`;
    if(count('error'))status.textContent+=' — '+results.filter(r=>r.status==='error').slice(0,5).map(r=>r.reference+': '+r.error).join(' | ');
    window.mfLastImportResults=results;mfPreviewReport();mfToast(count('error')?'اكتملت المعالجة مع أخطاء موضحة في النتيجة':'اكتملت معالجة الملف دون تكرار الدفعات',count('error')?'bad':undefined);
  }catch(e){status.textContent='توقفت المعالجة بعد تأكيد '+results.length+' سجل: '+e.message+'؛ يمكن إعادة الملف بنفس المراجع دون تكرار.';mfToast(e.message,'bad');}
  finally{window.mfImportRunning=false;}
};

let syncRunning=false;
window.mfSyncPayments=async function(showToast=false){
  if(syncRunning)return false;syncRunning=true;
  try{const db=await dbRequired();if(operational()){const {data,error}=await db.rpc('match_unmatched_payments',{p_limit:200});if(error)throw error;if(data?.some(r=>r.status==='error'))console.warn('Unmatched payments require review');}
    await roleAwareBootstrap();await mfRefreshAuthoritativePayments();mfState().settings.lastPaymentSync=mfNow();save(false);
    if(showToast)mfToast('تم تحديث الدفعات والأرصدة من قاعدة البيانات');return true;
  }catch(e){if(showToast)mfToast('تعذرت المزامنة: '+e.message,'bad');return false;}finally{syncRunning=false;}
};

const renderReportsBefore=window.mfRenderReports,previewBefore=window.mfPreviewReport,rowsBefore=window.mfReportRows;
window.mfPaymentReportFilter={date:'',branch:'',employee:''};
window.mfRenderReports=function(){
  renderReportsBefore();const select=el('mfReportType');if(!select)return;
  const paymentOption=select.querySelector('option[value="payments"]');if(paymentOption)paymentOption.textContent='كشف الدفعات';
  const option=document.createElement('option');option.value='unmatched_payments';option.textContent='دفعات محفوظة غير مطابقة';select.appendChild(option);
  el('mfPaymentsImport')?.insertAdjacentHTML('beforebegin','<div class="mfForm"><div class="mfField full"><label>اسم مصدر الدفعات المعتمد (ثابت لكل عمليات الاستيراد من المصدر نفسه)</label><input id="mfImportSource" maxlength="120" placeholder="اسم المصدر"><small>أعمدة مطلوبة: reference، clientno، amount، date (YYYY-MM-DD). إعادة المرجع نفسه لا ترحّل دفعة ثانية.</small></div></div>');
};
window.mfSetPaymentReportFilter=function(key,value){mfPaymentReportFilter[key]=value;if(key==='branch')mfPaymentReportFilter.employee='';mfPreviewReport();};
window.mfReportRows=function(type){
  if(type==='unmatched_payments')return (meta.payments||[]).filter(p=>p.status==='not_matched').map(p=>({Reference:p.reference,ClientNo:p.clientNo,Amount:p.amount,Date:p.date,Source:p.source,Status:'غير مطابق'}));
  if(type!=='payments')return rowsBefore(type);
  const f=mfPaymentReportFilter,date=f.date||today();
  return (meta.payments||[]).filter(p=>p.date===date&&(!f.branch||p.branch===f.branch)&&(!f.employee||p.employeeId===f.employee))
    .map(p=>({Reference:p.reference||p.id,ClientNo:p.clientNo,Name:p.name,Amount:p.amount,Date:p.date,Type:p.type,Status:p.status,BalanceBefore:p.balanceBefore,BalanceAfter:p.balanceAfter,Employee:p.employee,Branch:p.branch,Source:p.source}));
};
window.mfPreviewReport=function(){
  const type=el('mfReportType')?.value;if(type!=='payments')return previewBefore();
  const out=el('mfReportPreview');if(!out)return;const f=mfPaymentReportFilter,date=f.date||today();
  const dayRows=(meta.payments||[]).filter(p=>p.date===date),branches=[...new Set(dayRows.map(p=>p.branch).filter(Boolean))].sort();
  const branchRows=dayRows.filter(p=>!f.branch||p.branch===f.branch),employees=new Map();
  branchRows.forEach(p=>{if(p.employeeId)employees.set(p.employeeId,p.employee||p.employeeId);});
  const total=branchRows.filter(p=>p.status==='successful'&&p.type!=='deferral_fee').reduce((sum,p)=>sum+p.amount,0),rows=mfReportRows('payments');
  out.innerHTML=`<div class="mfPanel"><div class="mfPanelTitle">كشف الدفعات للفرع</div><div class="mfForm"><div class="mfField"><label>اليوم</label><input type="date" value="${mfAttr(date)}" onchange="mfSetPaymentReportFilter('date',this.value)"></div><div class="mfField"><label>الفرع ضمن الصلاحية</label><select onchange="mfSetPaymentReportFilter('branch',this.value)"><option value="">الفروع المتاحة</option>${branches.map(b=>`<option value="${mfAttr(b)}" ${b===f.branch?'selected':''}>${safe(b)}</option>`).join('')}</select></div></div><b>التحصيل الناجح: ${money(total)}</b><small>رسوم التأجيل والمعلّق وغير المطابق لا تدخل في إجمالي التحصيل.</small></div><div class="mfPanel"><div class="mfPanelTitle">تفصيل الدفعات حسب الموظف</div><select onchange="mfSetPaymentReportFilter('employee',this.value)"><option value="">كل الموظفين ضمن النطاق</option>${[...employees].map(([id,name])=>`<option value="${mfAttr(id)}" ${id===f.employee?'selected':''}>${safe(name)}</option>`).join('')}</select><p>${rows.length} سجل • إجمالي التحصيل المحدد: ${money(rows.filter(p=>p.Status==='successful'&&p.Type!=='deferral_fee').reduce((sum,p)=>sum+p.Amount,0))}</p><div style="overflow:auto"><table class="mfTable"><thead><tr><th>العميل</th><th>المبلغ</th><th>الحالة</th><th>الموظف</th><th>الرصيد قبل / بعد</th></tr></thead><tbody>${rows.slice(0,100).map(p=>`<tr><td>${safe(p.Name||p.ClientNo)}</td><td>${money(p.Amount)}</td><td>${safe(p.Status)}</td><td>${safe(p.Employee)}</td><td>${p.BalanceBefore===null?'—':money(p.BalanceBefore)} / ${p.BalanceAfter===null?'—':money(p.BalanceAfter)}</td></tr>`).join('')}</tbody></table></div>${rows.length>100?'<small>المعاينة لأول 100 سجل؛ التصدير يشمل كامل اليوم المحدد.</small>':''}</div>`;
};
// Existing loaders initialize other operational areas; replace payment caches
// only after authoritative paginated reads succeed.
const loadBefore=window.mfLoadBackendState;
window.mfLoadBackendState=async function(){await loadBefore();await mfRefreshAuthoritativePayments();};
window.MF_NEXA_RELEASE='2026-09-16-r1';
})();
