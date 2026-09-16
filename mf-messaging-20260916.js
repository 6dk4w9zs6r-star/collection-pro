(function(){
'use strict';
const el=id=>document.getElementById(id),uid=()=>CURRENT_PROFILE?.id||CURRENT_AUTH_USER?.id,uuid=x=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(x||''));
async function dbRequired(){const db=await getSecureClient();if(!db||!uid())throw Error('يلزم تسجيل الدخول والاتصال بقاعدة البيانات');return db;}
function message(r){return {id:String(r.id),dbId:String(r.id),roomId:r.room_id,roomType:r.room_type,senderId:r.sender_id,senderName:r.sender_name,targetId:r.target_user_id,text:r.message_text||'',createdAt:r.created_at,attachment:r.attachment_url?{name:r.attachment_name||'مرفق',storagePath:r.attachment_url,persistent:true}:null};}
window.mfMergeChatMessage=function(r){const m=message(r),state=mfState(),rows=state.chat||[],index=rows.findIndex(x=>String(x.id)===m.id);if(index<0)rows.push(m);else rows[index]=m;state.chat=rows;meta.chatMessages=rows;return m;};
window.mfRefreshChat=async function(){const actor=uid(),db=await dbRequired(),rows=await mfFetchAllPages(()=>db.from('chat_messages').select('*').order('id'));if(actor!==uid())throw Error('تغير الحساب أثناء التحميل');mfState().chat=rows.map(message);meta.chatMessages=mfState().chat;};
const roomsBefore=window.mfChatRooms;
window.mfChatRooms=function(){return roomsBefore().filter(r=>r.type==='general'||(r.type==='team'&&mfAccessibleTeams().includes(r.id.slice(5)))||(r.type==='private'&&uuid(r.target?.id)));};
const renderBefore=window.mfRenderChat;let renderedRoom=null;
window.mfRenderChat=function(){const room=mfCurrentChatRoom,text=el('mfChatText'),file=el('mfChatFile'),preserve=renderedRoom===room;renderBefore();if(preserve&&room===mfCurrentChatRoom){if(text)el('mfChatText')?.replaceWith(text);if(file)el('mfChatFile')?.replaceWith(file);}renderedRoom=mfCurrentChatRoom;};
let pending=null;
window.mfSendChat=async function(){
  if(window.mfChatSending)return;const input=el('mfChatText'),text=input?.value.trim()||'',file=el('mfChatFile'),selected=file?.files?.[0],actor=uid(),room=mfChatRooms().find(r=>r.id===mfCurrentChatRoom);
  if(!room)return mfToast('اختر غرفة متاحة ضمن صلاحيتك','bad');if(!text&&!selected)return;if(text.length>10000)return mfToast('الرسالة بحد أقصى 10000 حرف','bad');
  const fingerprint=JSON.stringify([actor,room.id,text,selected?.name,selected?.size,selected?.lastModified]);window.mfChatSending=true;let saved=false;
  try{const db=await dbRequired();if(!pending||pending.fingerprint!==fingerprint)pending={fingerprint,id:crypto.randomUUID(),attachment:null};
    if(selected&&!pending.attachment){const attachment=await mfFileData(file,5*1024*1024);if(!attachment?.storagePath)throw Error('لم يؤكد التخزين حفظ المرفق');pending.attachment=attachment;}
    if(actor!==uid())throw Error('تغير الحساب');const attempt=pending,attachment=attempt.attachment;
    const {data,error}=await db.rpc('send_chat_message',{p_id:attempt.id,p_room_id:room.id,p_room_type:room.type,p_target_id:room.type==='private'?room.target.id:null,p_team_key:room.type==='team'?room.id.slice(5):null,p_text:text||'مرفق',p_attachment_name:attachment?.name||null,p_attachment_url:attachment?.storagePath||null});if(error)throw error;
    const row=Array.isArray(data)?data[0]:data;if(!row?.id||row.id!==attempt.id||row.sender_id!==actor)throw Error('لم تؤكد قاعدة البيانات الرسالة');saved=true;if(actor!==uid())throw Error('تغير الحساب');
    mfMergeChatMessage(row);pending=null;if(input&&input.value.trim()===text)input.value='';if(file&&file.files?.[0]===selected)file.value='';mfRenderChat();mfToast('تم حفظ الرسالة وإرسالها');
  }catch(e){mfToast((saved?'تم حفظ الرسالة؛ تعذر تحديث العرض: ':'تعذر إرسال الرسالة: ')+e.message,'bad');}finally{window.mfChatSending=false;}
};
window.mfOpenChatAttachment=async function(id){const item=(mfState().chat||[]).find(x=>String(x.id)===String(id));if(!item?.attachment?.storagePath)return mfToast('المرفق غير متاح','bad');
  try{await dbRequired();const url=await mfStorageSignedUrl(item.attachment.storagePath);if(!url)throw Error('المرفق غير متاح ضمن صلاحيتك');mfForm('مرفق المحادثة',`<a class="mfSubmit" href="${mfAttr(url)}" target="_blank" rel="noopener noreferrer">فتح ${safe(item.attachment.name||'المرفق')}</a>`);}catch(e){mfToast(e.message,'bad');}
};
window.mfOpenChat=async function(){try{await mfRefreshChat();if(!mfCurrentChatRoom)mfCurrentChatRoom='general';mfRenderChat();mfOpen('mfChatModal');await mfSubscribeChat();}catch(e){mfToast('تعذر تحميل المحادثات: '+e.message,'bad');}};
let chatActor=null,chatChannel=null;
window.mfSubscribeChat=async function(){
  const actor=uid();if(!actor)return;if(chatActor===actor&&chatChannel)return;
  try{const db=await dbRequired();if(chatChannel)await db.removeChannel(chatChannel);if(typeof mfChatSubscription!=='undefined'&&mfChatSubscription)await mfChatSubscription.unsubscribe();
    if(actor!==uid())return;chatActor=actor;chatChannel=db.channel('mf-nexa-chat-v5-'+actor).on('postgres_changes',{event:'INSERT',schema:'public',table:'chat_messages'},({new:r})=>{if(actor!==uid()||!r?.id)return;const seen=(mfState().chat||[]).some(x=>String(x.id)===String(r.id));const m=mfMergeChatMessage(r);if(!seen&&r.sender_id!==actor&&mfChatVisible(m)){mfToast('رسالة داخلية جديدة');if(document.visibilityState!=='visible'&&mfState().settings.notifications!==false&&typeof mfNotify==='function')Promise.resolve(mfNotify('دائرة التمويل الصغير','رسالة داخلية جديدة')).catch(()=>{});}if(el('mfChatModal')?.classList.contains('open'))mfRenderChat();}).subscribe();
    if(typeof mfChatSubscription!=='undefined')mfChatSubscription=chatChannel;
  }catch(e){chatActor=null;chatChannel=null;console.warn('Chat realtime unavailable');}
};
function applyPreferences(row){const settings=mfState().settings;settings.notifications=row?.general_enabled??true;settings.paymentNotifications=row?.payment_enabled??true;settings.followupNotifications=row?.followup_enabled??true;}
window.mfRefreshNotificationPreferences=async function(){const actor=uid(),db=await dbRequired(),{data,error}=await db.from('notification_preferences').select('*').eq('user_id',actor).maybeSingle();if(error)throw error;if(actor!==uid())throw Error('تغير الحساب');applyPreferences(data);};
const prefsBefore=window.mfOpenNotificationSettings;
window.mfOpenNotificationSettings=async function(){try{await mfRefreshNotificationPreferences();prefsBefore();}catch(e){mfToast('تعذر تحميل إعدادات الإشعارات: '+e.message,'bad');}};
window.mfSaveNotificationSettings=async function(){
  if(window.mfPreferencesSaving)return;window.mfPreferencesSaving=true;let saved=false;
  try{const actor=uid(),db=await dbRequired(),payload={user_id:actor,general_enabled:!!el('mfPersonalGeneralNotifications')?.checked,payment_enabled:!!el('mfPersonalPaymentNotifications')?.checked,followup_enabled:!!el('mfPersonalFollowupNotifications')?.checked};
    const {data,error}=await db.from('notification_preferences').upsert(payload,{onConflict:'user_id'}).select().single();if(error)throw error;if(data?.user_id!==actor)throw Error('لم يؤكد الخادم حفظ الإعدادات');saved=true;if(actor!==uid())throw Error('تغير الحساب');applyPreferences(data);mfFormClose();mfToast('تم حفظ إعدادات الإشعارات');
    if(data.general_enabled){try{await mfEnableNotifications();}catch(e){mfToast('الإعدادات محفوظة؛ تعذر تفعيل إشعارات الجهاز','bad');}}
  }catch(e){mfToast((saved?'تم حفظ الإعدادات؛ تعذر تحديث العرض: ':'تعذر حفظ الإعدادات: ')+e.message,'bad');}finally{window.mfPreferencesSaving=false;}
};
window.mfOpenNotificationCenter=async function(){
  try{const actor=uid(),db=await dbRequired(),rows=await mfFetchAllPages(()=>db.from('notifications').select('*').eq('recipient_id',actor).order('id'));if(actor!==uid())throw Error('تغير الحساب');rows.sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)));
    mfForm('الإشعارات',`<div class="mfRowActions"><button class="mfSecondary" onclick="mfOpenNotificationSettings()">إعدادات الإشعارات</button></div><div class="mfPanel"><div class="mfPanelTitle">الإشعارات <small>${rows.length}</small></div>${rows.slice(0,200).map(n=>`<div class="mfListRow"><b>${safe(n.title||'إشعار')}</b><small>${mfDate(n.created_at)} • ${n.is_read?'مقروء':'جديد'}</small><div>${safe(n.body||'')}</div><button class="mfSecondary" onclick="mfOpenNotificationClient('${mfAttr(n.id)}')">${n.client_id?'فتح العميل':'تأكيد القراءة'}</button></div>`).join('')||'<div class="mfEmpty">لا توجد إشعارات</div>'}${rows.length>200?'<small>تُعرض أحدث 200 رسالة؛ السجل الأقدم محفوظ.</small>':''}</div>`);
  }catch(e){mfToast('تعذر تحميل الإشعارات: '+e.message,'bad');}
};
window.mfOpenNotificationClient=async function(id){
  try{const actor=uid(),db=await dbRequired(),{data,error}=await db.from('notifications').update({is_read:true}).eq('id',id).eq('recipient_id',actor).select().single();if(error)throw error;if(!data?.id||data.recipient_id!==actor)throw Error('لم يؤكد الخادم قراءة الإشعار');if(actor!==uid())throw Error('تغير الحساب');
    if(data.client_id){const index=clients.findIndex(c=>String(c.id)===String(data.client_id));if(index<0)return mfToast('حُفظت القراءة؛ العميل غير متاح في نطاقك الحالي','bad');mfFormClose();mfOpenClient(index,String(data.deep_link||'').includes('payments')?'payments':'overview');}else await mfOpenNotificationCenter();
  }catch(e){mfToast('تعذر تأكيد قراءة الإشعار: '+e.message,'bad');}
};
const visibleBefore=window.mfAnnouncementVisible;
function ammanDay(value){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Amman',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(value));return ['year','month','day'].map(k=>parts.find(p=>p.type===k).value).join('-');}
window.mfAnnouncementVisible=function(a){if(!visibleBefore(a))return false;if(a.kind!=='morning')return true;try{return ammanDay(a.startsAt||a.publishedAt||a.createdAt)===ammanDay(Date.now());}catch(_){return false;}};
const loadBefore=window.mfLoadBackendState;
window.mfLoadBackendState=async function(){await loadBefore();await Promise.all([mfRefreshChat(),mfRefreshNotificationPreferences()]);};
const rtcBefore=window.mfBeginRtc,endBefore=window.mfEndCall;
window.mfBeginRtc=async function(id,initiator,kind){try{const actor=uid(),db=await dbRequired(),{data,error}=await db.from('call_invitations').select('*').eq('id',id).single();if(error)throw error;if(!data||data.status!=='accepted'||(initiator?data.caller_id:data.callee_id)!==actor||data.call_type!==kind)throw Error('دعوة الاتصال غير معتمدة لهذا الطرف');return await rtcBefore(id,initiator,kind);}catch(e){mfToast('تعذر بدء الاتصال: '+e.message,'bad');}};
window.mfEndCall=function(){const id=typeof mfCallState!=='undefined'?mfCallState?.id:null;endBefore();if(id)mfConfirmedUpdate('call_invitations',{status:'ended'},'id',id).catch(()=>mfToast('أُغلق الاتصال محليًا؛ تعذر تحديث حالته في الخادم','bad'));};
window.MF_NEXA_RELEASE='2026-09-16-r5';
})();
