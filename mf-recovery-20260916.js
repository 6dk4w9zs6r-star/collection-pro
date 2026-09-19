(function(){
'use strict';
const el=id=>document.getElementById(id),uid=()=>CURRENT_PROFILE?.id||CURRENT_AUTH_USER?.id,VERSION='phase5-20260918';
const FORMAT='mf-nexa-encrypted-archive-v1',SOURCE='thfnitjiiwdsbwcunlbs',ITERATIONS=310000,MAX_FILE=40*1024*1024;
const tables=['activities','announcement_reads','announcements','approved_accounts','attachments','audit_log','branches','call_invitations','chat_messages','client_notes','clients','deferrals','disbursements','employees','escalated_cases','field_visits','follow_ups','late_due','legal_cases','loan_requests','locations','messages','notification_preferences','notifications','payments','portfolios','profiles','promises_to_pay','promotions','teams','usage_consents','write_offs'];
async function dbRequired(){const db=await getSecureClient();if(!db)throw Error('قاعدة البيانات غير متاحة');let actor=uid();if(!actor){try{const {data,error}=await db.auth.getSession();if(!error&&data?.session?.user){CURRENT_AUTH_USER=data.session.user;actor=uid()||data.session.user.id}}catch(_){}}if(!actor)throw Error('جلسة الدخول غير متاحة');return db;}
function founder(){if(mfRole()!=='founder'){mfToast('هذه العملية متاحة للمؤسس فقط','bad');return false;}return true;}
const encode=new TextEncoder(),decode=new TextDecoder('utf-8',{fatal:true});
function base64(bytes){let text='';for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(text);}
function bytes(text){if(typeof text!=='string'||text.length>MAX_FILE||!/^[A-Za-z0-9+/]*={0,2}$/.test(text))throw Error('ترميز الملف غير صالح');return Uint8Array.from(atob(text),c=>c.charCodeAt(0));}
async function key(password,salt){
  if(typeof password!=='string'||password.length<12||password.length>1024)throw Error('استخدم كلمة مرور للنسخة من 12 حرفًا على الأقل');
  const material=await crypto.subtle.importKey('raw',encode.encode(password),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:ITERATIONS,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
window.mfValidateOperationalArchive=function(data){
  if(data?.product!=='NEXA-MF'||data.schema!=='mf-nexa-operational-archive-v2'||data.source!==SOURCE||data.disaster_recovery!==false||!Number.isFinite(Date.parse(data.exported_at))||!data.tables||!data.counts)throw Error('الملف ليس نسخة تشغيلية معتمدة لهذا المشروع');
  const keys=Object.keys(data.tables).sort();if(keys.join('|')!==[...tables].sort().join('|')||Object.keys(data.counts).sort().join('|')!==keys.join('|'))throw Error('قائمة جداول النسخة غير مكتملة');
  for(const name of tables){if(!Array.isArray(data.tables[name])||data.counts[name]!==data.tables[name].length)throw Error('عدد السجلات غير مطابق: '+name);}
  return data;
};
window.mfEncryptOperationalArchive=async function(data,password){
  mfValidateOperationalArchive(data);const plain=encode.encode(JSON.stringify(data));if(plain.length>25*1024*1024)throw Error('حجم النسخة يتطلب أداة النسخ الكاملة');
  const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12)),k=await key(password,salt);
  const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encode.encode(FORMAT)},k,plain);
  return {format:FORMAT,kdf:'PBKDF2-SHA256',iterations:ITERATIONS,cipher:'AES-256-GCM',salt:base64(salt),iv:base64(iv),payload:base64(new Uint8Array(encrypted))};
};
window.mfDecryptOperationalArchive=async function(file,password){
  if(file?.format!==FORMAT||file.kdf!=='PBKDF2-SHA256'||file.iterations!==ITERATIONS||file.cipher!=='AES-256-GCM')throw Error('صيغة التشفير غير مدعومة');
  const salt=bytes(file.salt),iv=bytes(file.iv),payload=bytes(file.payload);if(salt.length!==16||iv.length!==12||payload.length<16)throw Error('ملف النسخة تالف');
  try{const k=await key(password,salt),plain=await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:encode.encode(FORMAT)},k,payload);return mfValidateOperationalArchive(JSON.parse(decode.decode(plain)));}
  catch(e){throw Error('تعذر فتح النسخة: كلمة المرور غير صحيحة أو الملف تالف أو غير متوافق');}
};
window.mfExportBackup=async function(){
  if(!founder()||window.mfArchiveExporting)return;const password=el('mfArchivePassword')?.value||'',confirmation=el('mfArchivePasswordAgain')?.value||'';
  if(password.length<12||password!==confirmation)return mfToast('أدخل كلمة مرور للنسخة من 12 حرفًا على الأقل وأعد كتابتها مطابقة','bad');
  window.mfArchiveExporting=true;
  try{const actor=uid(),db=await dbRequired(),{data,error}=await db.rpc('export_operational_archive');if(error)throw error;if(actor!==uid())throw Error('تغير الحساب أثناء التصدير');
    const encrypted=await mfEncryptOperationalArchive(data,password);if(actor!==uid())throw Error('تغير الحساب أثناء التشفير');
    const blob=new Blob([JSON.stringify(encrypted)],{type:'application/json'}),a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download='NEXA-MF_OPERATIONAL_'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    el('mfArchivePassword').value='';el('mfArchivePasswordAgain').value='';mfToast('تم تجهيز النسخة التشغيلية المشفرة من قاعدة البيانات');
  }catch(e){mfToast('تعذر تصدير النسخة: '+e.message,'bad');}finally{window.mfArchiveExporting=false;}
};
let validationRun=0;
window.mfValidateBackupFile=async function(file){
  const run=++validationRun;window.__MF_PENDING_RESTORE=null;const out=el('mfBackupValidation');if(!founder()||!file)return;
  try{if(file.size>MAX_FILE)throw Error('الملف أكبر من الحد المسموح');const actor=uid(),raw=await file.text(),parsed=JSON.parse(raw);if(raw.length>MAX_FILE)throw Error('الملف كبير جدًا');
    if(parsed.schema==='mf-nexa-backup-v1'){if(out)out.textContent='هذه نسخة محلية قديمة؛ لا تمثل بيانات Supabase ولا يمكن استخدامها لاستبدال الأرصدة. احتفظ بها للمراجعة.';return;}
    const data=await mfDecryptOperationalArchive(parsed,el('mfArchiveOpenPassword')?.value||'');if(actor!==uid()||run!==validationRun)return;
    if(out)out.textContent='تم فتح النسخة والتحقق من سلامتها. التاريخ: '+data.exported_at+' • الجداول: '+tables.length+' • العملاء: '+data.counts.clients+' • الدفعات: '+data.counts.payments+'. لم تتغير أي بيانات. هذه نسخة بيانات تشغيلية؛ لا تشمل حسابات الدخول أو ملفات المرفقات أو مخطط قاعدة البيانات.';
  }catch(e){if(out&&run===validationRun)out.textContent='فشل التحقق: '+e.message;}
  finally{if(run===validationRun&&el('mfArchiveOpenPassword'))el('mfArchiveOpenPassword').value='';}
};
window.mfApplyValidatedRestore=function(){window.__MF_PENDING_RESTORE=null;mfToast('الاستعادة الكاملة تحتاج نسخة خادم واختبار استعادة؛ لا تُستبدل الأرصدة من ملف محلي','bad');};
window.mfReloadAuthoritativeData=async function(){
  if(!founder()||window.mfArchiveReloading)return;window.mfArchiveReloading=true;
  try{await dbRequired();await roleAwareBootstrap();await mfLoadBackendState();mfToast('تم تحديث العرض من البيانات المعتمدة في Supabase');}catch(e){mfToast('تعذر تحديث البيانات: '+e.message,'bad');}finally{window.mfArchiveReloading=false;}
};
window.mfOpenBackupRestore=function(){
  if(!founder())return;window.__MF_PENDING_RESTORE=null;
  mfForm('النسخ الاحتياطي والاستعادة',`<div class="mfPanel"><b>نسخة تشغيلية مشفرة</b><p>تصدّر سجلات المشروع الفعلية من قاعدة البيانات. احتفظ بكلمة مرور النسخة في مكان آمن؛ لا تُحفظ في النظام.</p><small>هذه ليست نسخة تعافٍ كاملة: حسابات الدخول وملفات المرفقات وإعدادات الخادم تحتاج نسخًا منفصلة. الاستعادة الكاملة تتطلب اختبار استعادة موثقًا.</small></div><div class="mfForm"><div class="mfField"><label>كلمة مرور النسخة (12 حرفًا على الأقل)</label><input id="mfArchivePassword" type="password" autocomplete="new-password"></div><div class="mfField"><label>تأكيد كلمة المرور</label><input id="mfArchivePasswordAgain" type="password" autocomplete="new-password"></div><button class="mfSubmit" onclick="mfExportBackup()">تصدير نسخة مشفرة</button><div class="mfField"><label>كلمة مرور الملف المراد فحصه</label><input id="mfArchiveOpenPassword" type="password" autocomplete="off"></div><div class="mfField"><label>فتح نسخة للتحقق فقط</label><input type="file" accept="application/json,.json" onchange="mfValidateBackupFile(this.files?.[0])"></div><div id="mfBackupValidation" class="mfPendingNotice">فحص الملف لا يغير بيانات العملاء أو الدفعات.</div><button class="mfSecondary" onclick="mfReloadAuthoritativeData()">إعادة تحميل البيانات المعتمدة</button></div>`);
};
let consentRead=null,verifiedActor=null,consentEpoch=0;
window.mfRefreshUsageConsent=async function(){
  const actor=uid();if(!actor)return false;
  if(consentRead?.actor===actor)return consentRead.promise;
  const request={actor,epoch:consentEpoch};request.promise=(async()=>{const db=await dbRequired(),{data,error}=await db.from('usage_consents').select('id,user_id,policy_version,accepted_at').eq('user_id',actor).eq('policy_version',VERSION).maybeSingle();if(actor!==uid())throw Error('تغير الحساب');if(request.epoch!==consentEpoch)return !!mfState().consents?.[actor]?.dbId;if(error)throw error;
    const state=mfState();state.consents=state.consents||{};delete state.consents[actor];if(data?.id)state.consents[actor]={dbId:data.id,version:data.policy_version,acceptedAt:data.accepted_at};verifiedActor=actor;return !!data?.id;
  })();consentRead=request;try{return await request.promise;}finally{if(consentRead===request)consentRead=null;}
};
const requireBefore=window.mfRequireConsent;
window.mfRequireConsent=async function(){
  const actor=uid();if(!actor)return;try{await mfRefreshUsageConsent();if(actor!==uid())return;requireBefore();}
  catch(e){if(actor!==uid())return;verifiedActor=null;const state=mfState();if(state.consents)delete state.consents[actor];requireBefore();mfToast('تعذر التحقق من موافقة الاستخدام: '+e.message,'bad');}
};
window.mfEnsureConsent=async function(){await mfRequireConsent();return verifiedActor===uid()&&!!mfState().consents?.[uid()]?.dbId;};
window.mfAcceptConsent=async function(){
  if(window.mfConsentSaving)return;if(!el('mfConsentCheck')?.checked)return mfToast('يجب قراءة السياسة والموافقة عليها أولًا','bad');window.mfConsentSaving=true;let saved=false;
  try{const actor=uid(),db=await dbRequired(),{data,error}=await db.rpc('accept_usage_policy',{p_version:VERSION});if(error)throw error;const r=Array.isArray(data)?data[0]:data;
    if(!r?.id||r.user_id!==actor||r.policy_version!==VERSION)throw Error('لم تؤكد قاعدة البيانات الموافقة');saved=true;if(actor!==uid())throw Error('تغير الحساب');consentEpoch++;mfState().consents=mfState().consents||{};mfState().consents[actor]={dbId:r.id,version:VERSION,acceptedAt:r.accepted_at};verifiedActor=actor;mfClose('mfConsentModal');mfToast('تم حفظ موافقة الاستخدام');
  }catch(e){mfToast((saved?'تم حفظ الموافقة؛ تعذر تحديث العرض: ':'تعذر حفظ الموافقة: ')+e.message,'bad');}finally{window.mfConsentSaving=false;}
};
const loadBefore=window.mfLoadBackendState;
window.mfLoadBackendState=async function(){await loadBefore();await mfRefreshUsageConsent();};
window.mfRecordSessionEvent=async function(action){const db=await dbRequired(),{data,error}=await db.rpc('record_session_event',{p_action:action});if(error)throw error;const row=Array.isArray(data)?data[0]:data;if(!row?.id||row.action!=='session_'+action||row.actor_user_id!==uid())throw Error('لم يؤكد الخادم حفظ سجل الجلسة');return row;};
const loginBefore=window.secureLogin,logoutBefore=window.mfSecureLogout;
window.secureLogin=async function(){await loginBefore.apply(this,arguments);if(uid()&&!document.body.classList.contains('secureLocked')){try{await mfRecordSessionEvent('login');}catch(e){mfToast('تم الدخول؛ تعذر حفظ سجل الجلسة: '+e.message,'bad');}}};
window.mfSecureLogout=async function(){try{if(uid())await mfRecordSessionEvent('logout');}catch(e){console.warn('Session logout audit unavailable');}finally{consentEpoch++;verifiedActor=null;await logoutBefore.apply(this,arguments);}};
window.secureLogout=window.mfSecureLogout;
window.MF_NEXA_RELEASE='2026-09-16-r4';
})();
