(function(){
'use strict';
const el=id=>document.getElementById(id),uid=()=>CURRENT_PROFILE?.id||CURRENT_AUTH_USER?.id;
async function dbRequired(){const db=await getSecureClient();if(!db||!uid())throw Error('يلزم تسجيل الدخول والاتصال بقاعدة البيانات');return db;}
const manager=()=>['founder','cfmp','bm','als'].includes(mfRole());
const allContent=()=>[...(mfState().announcements||[]),...(mfState().morningContent||[]),...(mfState().teamSpiritContent||[])];
function mapNote(r){return {id:String(r.id),clientId:String(r.client_id),text:r.note_text,createdAt:r.created_at,authorId:r.created_by};}
window.mfRefreshClientNotes=async function(){
  const actor=uid(),db=await dbRequired(),rows=await mfFetchAllPages(()=>db.from('client_notes').select('*').order('id'));
  if(actor!==uid())throw Error('تغير الحساب أثناء التحميل');mfState().clientNotes=rows.map(mapNote);
};
const timelineBefore=window.mfTimelineRows;
window.mfTimelineRows=function(c){return [...timelineBefore(c),...(mfState().clientNotes||[]).filter(n=>n.clientId===String(c.id)).map(n=>({type:'note',title:'ملاحظة محفوظة',text:n.text,date:n.createdAt}))].sort((a,b)=>String(b.date).localeCompare(String(a.date)));};
window.mfSaveNote=async function(){
  if(window.mfNoteSaving)return;const c=clients?.[Number(el('mfNoteIndex')?.value)],text=el('mfNoteText')?.value.trim();
  if(!c||!mfCan('edit',c))return mfToast('لا تملك صلاحية إضافة ملاحظة','bad');
  if(!text||text.length>5000)return mfToast('الملاحظة مطلوبة وبحد أقصى 5000 حرف','bad');
  window.mfNoteSaving=true;let saved=false;
  try{const actor=uid();await dbRequired();const row=await mfConfirmedInsert('client_notes',{client_id:c.id,note_text:text,created_by:actor});saved=true;
    if(actor!==uid())throw Error('تغير الحساب');const state=mfState();state.clientNotes=state.clientNotes||[];state.clientNotes.push(mapNote(row));mfFormClose();mfRenderClient();mfToast('تم حفظ الملاحظة في قاعدة البيانات');
  }catch(e){mfToast((saved?'تم حفظ الملاحظة؛ تعذر تحديث العرض: ':'تعذر حفظ الملاحظة: ')+e.message,'bad');}finally{window.mfNoteSaving=false;}
};
window.mfRefreshCommunications=async function(){
  const actor=uid(),db=await dbRequired();
  const [rows,reads]=await Promise.all([mfFetchAllPages(()=>db.from('announcements').select('*').order('id')),mfFetchAllPages(()=>db.from('announcement_reads').select('*').eq('user_id',actor).order('id'))]);
  if(actor!==uid())throw Error('تغير الحساب أثناء التحميل');const readIds=new Set(reads.map(r=>String(r.announcement_id)));
  const mapped=rows.map(r=>({id:String(r.id),dbId:String(r.id),kind:r.content_type,title:r.title,text:r.body,audience:r.audience,branch:r.branch_code,team:r.team_key,authorId:r.created_by,authorName:r.created_by===actor?mfActor().name:'إدارة المحتوى',createdAt:r.created_at,isPublished:r.is_published,publishedAt:r.published_at,startsAt:r.starts_at,endsAt:r.ends_at,mandatory:r.mandatory,readBy:readIds.has(String(r.id))?[actor]:[],attachment:r.attachment_url?{name:r.attachment_name,type:r.attachment_type,storagePath:r.attachment_url}:null}));
  const state=mfState();state.announcements=mapped.filter(a=>a.kind==='announcement');state.morningContent=mapped.filter(a=>a.kind==='morning');state.teamSpiritContent=mapped.filter(a=>a.kind==='team_spirit');
};
window.mfAnnouncementVisible=function(a){
  if(!a.dbId||a.isPublished!==true)return false;const now=Date.now();
  if(a.startsAt&&(!Number.isFinite(Date.parse(a.startsAt))||Date.parse(a.startsAt)>now))return false;
  if(a.endsAt&&(!Number.isFinite(Date.parse(a.endsAt))||Date.parse(a.endsAt)<now))return false;
  return true; // Audience visibility is enforced by announcement RLS on every read.
};
window.mfOpenCommunicationAttachment=async function(id){
  const a=allContent().find(x=>x.id===id);if(!a?.attachment?.storagePath)return;
  try{await dbRequired();const url=await mfStorageSignedUrl(a.attachment.storagePath);if(!url)throw Error('المرفق غير متاح ضمن الصلاحية');
    const media=String(a.attachment.type).startsWith('video/')?`<video controls class="mfCommMedia" src="${mfAttr(url)}"></video>`:`<img class="mfCommMedia" src="${mfAttr(url)}" alt="مرفق">`;
    mfForm('مرفق المحتوى',media);
  }catch(e){mfToast('تعذر فتح المرفق: '+e.message,'bad');}
};
const formBefore=window.mfOpenAnnouncementForm;
window.mfOpenAnnouncementForm=function(kind='announcement'){
  if(!manager())return mfToast('لا تملك صلاحية إدارة المحتوى','bad');formBefore(kind);
  const audience=el('mfCommAudience');if(audience){for(const option of [...audience.options]){if((mfRole()==='bm'&&option.value==='all')||(mfRole()==='als'&&option.value!=='team'))option.remove();}}
  const teams=mfAccessibleTeams();audience?.insertAdjacentHTML('afterend',`<label>الفريق عند اختيار جمهور الفريق</label><select id="mfCommTeam"><option value="">اختر فريقًا متاحًا</option>${teams.map(t=>`<option value="${mfAttr(t)}">${safe(t)}</option>`).join('')}</select>`);
  el('mfCommText')?.insertAdjacentHTML('afterend','<label><input id="mfCommPublish" type="checkbox" checked> نشر المحتوى بعد الحفظ</label><label>بداية العرض (اختياري)</label><input id="mfCommStarts" type="datetime-local"><label>نهاية العرض (اختياري)</label><input id="mfCommEnds" type="datetime-local">');
  const button=document.querySelector('[onclick="mfSaveCommunicationFinal()"]');if(button)button.textContent='حفظ المحتوى';
};
async function videoDuration(file){
  if(!file||!file.type.startsWith('video/'))return null;
  return new Promise((resolve,reject)=>{const video=document.createElement('video'),url=URL.createObjectURL(file);let timer;
    const finish=(error,value)=>{clearTimeout(timer);video.onloadedmetadata=null;video.onerror=null;video.removeAttribute('src');video.load();URL.revokeObjectURL(url);error?reject(error):resolve(value);};
    timer=setTimeout(()=>finish(Error('تعذر التحقق من مدة الفيديو')),15000);video.preload='metadata';video.onloadedmetadata=()=>{const d=video.duration;finish(!Number.isFinite(d)||d<=0||d>30?Error('يجب ألا تتجاوز مدة الفيديو 30 ثانية'):null,Math.ceil(d));};video.onerror=()=>finish(Error('تعذر قراءة الفيديو'));video.src=url;
  });
}
window.mfSaveCommunicationFinal=async function(){
  if(window.mfCommunicationSaving)return;if(!manager())return mfToast('لا تملك صلاحية إدارة المحتوى','bad');
  const title=el('mfCommTitle')?.value.trim(),body=el('mfCommText')?.value.trim(),kind=el('mfCommKind')?.value||'announcement',audience=el('mfCommAudience')?.value;
  if(!title||!body)return mfToast('العنوان والنص مطلوبان','bad');window.mfCommunicationSaving=true;let saved=false;
  try{await dbRequired();const actor=uid(),a=mfActor(),start=el('mfCommStarts')?.value,end=el('mfCommEnds')?.value,starts=start?new Date(start).toISOString():null,ends=end?new Date(end).toISOString():null;
    if(starts&&ends&&ends<=starts)throw Error('نهاية العرض يجب أن تكون بعد البداية');
    const team=el('mfCommTeam')?.value||null;if(audience!=='all'&&!a.branch)throw Error('لا يوجد فرع محدد للحساب');if(audience==='team'&&(!team||!mfAccessibleTeams().includes(team)))throw Error('اختر فريقًا متاحًا ضمن صلاحيتك');
    const duration=await videoDuration(el('mfCommAttachment')?.files?.[0]),attachment=await mfFileData(el('mfCommAttachment'),12*1024*1024);
    if(attachment&&!attachment.storagePath)throw Error('لم يؤكد التخزين حفظ المرفق');if(actor!==uid())throw Error('تغير الحساب');
    const published=!!el('mfCommPublish')?.checked;
    await mfConfirmedInsert('announcements',{content_type:kind,title,body,audience,branch_code:audience==='all'?null:a.branch,team_key:audience==='team'?team:null,attachment_name:attachment?.name||null,attachment_url:attachment?.storagePath||null,attachment_type:attachment?.type||null,attachment_duration_seconds:duration,mandatory:!!el('mfCommMandatory')?.checked,created_by:actor,is_published:published,starts_at:starts,ends_at:ends});saved=true;mfFormClose();
    await mfRefreshCommunications();mfRenderCommunications();mfToast(!published?'تم حفظ المسودة':starts&&Date.parse(starts)>Date.now()?'تم حفظ المحتوى وجدولة عرضه':'تم حفظ المحتوى المنشور');
  }catch(e){mfToast((saved?'تم حفظ المحتوى؛ تعذر تحديث العرض: ':'تعذر حفظ المحتوى: ')+e.message,'bad');}finally{window.mfCommunicationSaving=false;}
};
window.mfMarkMorningRead=async function(id){
  if(window.mfAcknowledging)return;window.mfAcknowledging=true;let saved=false;
  try{const actor=uid(),db=await dbRequired(),{data,error}=await db.rpc('acknowledge_announcement',{p_announcement_id:id});if(error)throw error;
    const r=Array.isArray(data)?data[0]:data;if(!r?.id||String(r.announcement_id)!==String(id)||r.user_id!==actor)throw Error('لم تؤكد قاعدة البيانات القراءة');saved=true;
    await mfRefreshCommunications();mfShowMorningFinal();mfToast('تم حفظ تأكيد القراءة');
  }catch(e){mfToast((saved?'تم حفظ تأكيد القراءة؛ تعذر تحديث العرض: ':'تعذر تأكيد القراءة: ')+e.message,'bad');}finally{window.mfAcknowledging=false;}
};
window.mfSetCommunicationPublished=async function(id,publish){
  if(window.mfPublicationSaving)return;window.mfPublicationSaving=true;let saved=false;
  try{await dbRequired();await mfConfirmedUpdate('announcements',{is_published:!!publish},'id',id);saved=true;await mfRefreshCommunications();mfRenderCommunications();mfToast(publish?'تم تفعيل نشر المحتوى':'تم إيقاف نشر المحتوى');
  }catch(e){mfToast((saved?'تم حفظ حالة النشر؛ تعذر تحديث العرض: ':'تعذر تغيير النشر: ')+e.message,'bad');}finally{window.mfPublicationSaving=false;}
};
const renderBefore=window.mfRenderCommunications;
window.mfRenderCommunications=function(){renderBefore();if(!manager())return;
  const rows=allContent().filter(a=>a.authorId===uid()||['founder','cfmp'].includes(mfRole()));
  el('mfCommsBody')?.insertAdjacentHTML('beforeend',`<div class="mfPanel"><div class="mfPanelTitle">إدارة المحتوى والمسودات</div>${rows.map(a=>`<div class="mfListRow"><b>${safe(a.title)}</b><small>${a.isPublished?(mfAnnouncementVisible(a)?'منشور':'مجدول أو منتهي'):'مسودة / موقوف'}</small><button class="mfSecondary" onclick="mfSetCommunicationPublished('${mfAttr(a.id)}',${!a.isPublished})">${a.isPublished?'إيقاف النشر':'نشر'}</button></div>`).join('')||'<div class="mfEmpty">لا يوجد محتوى لإدارته</div>'}</div>`);
};
const spiritBefore=window.mfShowTeamSpirit;
window.mfShowTeamSpirit=function(){spiritBefore();const rows=(mfState().teamSpiritContent||[]).filter(mfAnnouncementVisible);
  el('mfCommsBody')?.insertAdjacentHTML('beforeend',`<div class="mfPanel"><div class="mfPanelTitle">محتوى Team Spirit</div>${manager()?'<button class="mfSubmit" onclick="mfOpenAnnouncementForm(\'team_spirit\')">إضافة محتوى للفريق</button>':''}${rows.map(a=>`<div class="mfListRow"><b>${safe(a.title)}</b><div>${safe(a.text)}</div>${a.attachment?`<button class="mfSecondary" onclick="mfOpenCommunicationAttachment('${mfAttr(a.id)}')">عرض المرفق</button>`:''}</div>`).join('')}</div>`);
};
const openBefore=window.mfOpenCommunications;
window.mfOpenCommunications=async function(){try{await mfRefreshCommunications();openBefore();}catch(e){mfToast('تعذر تحميل المحتوى: '+e.message,'bad');}};
const loadBefore=window.mfLoadBackendState;
window.mfLoadBackendState=async function(){await loadBefore();await Promise.all([mfRefreshClientNotes(),mfRefreshCommunications()]);};
window.MF_NEXA_RELEASE='2026-09-16-r3';
})();
