(function(){
'use strict';
const uid=()=>CURRENT_PROFILE?.id||CURRENT_AUTH_USER?.id;
function compare(a,b){if(/^\d+$/.test(String(a))&&/^\d+$/.test(String(b))){const x=BigInt(a),y=BigInt(b);return x<y?-1:x>y?1:0;}return String(a)<String(b)?-1:String(a)>String(b)?1:0;}
window.mfReadOperationalRows=async function(db,table,columns='*',filter=q=>q){
  const actor=uid(),epoch=window.mfSessionEpoch?.();if(!db||!actor)throw Error('يلزم تسجيل الدخول والاتصال لتحميل السجلات');
  const result=[];let from=0;const pageSize=500;
  for(;;){const query=filter(db.from(table).select(columns)).order('id',{ascending:true}).range(from,from+pageSize-1);
    const {data,error}=await query;if(actor!==uid()||epoch!==window.mfSessionEpoch?.())throw Error('تغير الحساب أثناء التحميل؛ أُهملت النتائج السابقة');if(error)throw error;if(!Array.isArray(data))throw Error('لم يؤكد الخادم سجلات '+table);
    if(data.length>pageSize)throw Error('عدد سجلات الصفحة غير متوقع');
    for(let i=0;i<data.length;i++){const row=data[i],prev=i?data[i-1]:null;if(row?.id===undefined||row.id===null||(typeof row.id==='number'&&!Number.isSafeInteger(row.id))||(prev&&compare(row.id,prev.id)<=0))throw Error('ترتيب سجلات '+table+' غير صالح؛ أُوقف التحميل لتجنب التكرار');result.push(row);}
    if(data.length<pageSize)return result;from+=pageSize;
  }
};
window.mfOpenAudit=async function(){
  if(!mfCan('audit'))return mfToast('سجل التدقيق غير متاح لهذه الصلاحية','bad');
  try{const actor=uid(),db=await getSecureClient(),rows=await mfReadOperationalRows(db,'audit_log');if(actor!==uid())throw Error('تغير الحساب');
    const local=(mfState().audit||[]).filter(a=>!String(a.id).startsWith('db:')&&a.actorId===actor).map(a=>({...a,details:String(a.details||'').startsWith('[سجل محلي]')?a.details:'[سجل محلي] '+(a.details||'')}));
    mfState().audit=[...local,...rows.map(a=>({id:'db:'+a.id,action:a.action,clientId:a.client_id?String(a.client_id):null,clientNo:a.metadata?.client_no||null,clientName:a.metadata?.client_name||null,details:a.metadata?.details||'',actorId:a.actor_user_id,actorName:a.metadata?.actor_name||a.actor_user_id||'',actorRole:a.metadata?.role||'',branch:a.metadata?.branch||'',createdAt:a.created_at}))];
    mfRenderAudit();if(mfState().audit.length>500)document.getElementById('mfAuditBody')?.insertAdjacentHTML('beforeend','<div class="mfPanel"><small>تُعرض أول 500 نتيجة. البحث والتصدير يشملان كامل السجل المحمّل ضمن الصلاحية.</small></div>');mfOpen('mfAuditModal');
  }catch(e){mfToast('تعذر تحميل سجل التدقيق: '+e.message,'bad');}
};
window.MF_NEXA_RELEASE='2026-09-16-r7';
})();
