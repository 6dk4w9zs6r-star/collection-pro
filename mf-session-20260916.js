(function(){
'use strict';
const el=id=>document.getElementById(id);
let actor=null,loginRunning=false,logoutRunning=false,observedClient=null,syncActor=null,initialSync=null,sessionEpoch=0;
window.mfSessionEpoch=()=>sessionEpoch;
const emptyList=()=>({month:'',startIds:[],currentIds:[],paidIds:[],lastUpdate:'',records:{},byEmployee:{}});
function lock(){document.body.classList.add('secureLocked');if(el('authGate'))el('authGate').style.display='flex';}
function clearView(){
  clients=[];employees=[];lateData=emptyList();dueData=emptyList();meta={payments:[],monthAppearances:{},transitions:[],paidCustomers:{},chatMessages:[]};
  followUps=[];BRANCH_CACHE=[];ACTIVE_BRANCH=null;mfActiveClientIndex=-1;mfGpsCapture=null;mfCurrentChatRoom='general';mfAllocation={mode:'late',branch:'',team:'',employee:''};
  clearTimeout(pushTimer);clearTimeout(initialSync);initialSync=null;syncActor=null;clearInterval(mfPaymentSyncTimer);clearInterval(mfReminderTimer);
  for(const id of ['mfClientBody','mfAllocationBody','mfChatBody','mfReportsBody','mfAuditBody','mfFormBody'])if(el(id))el(id).innerHTML='';
  document.querySelectorAll('.mfModal.open').forEach(node=>node.classList.remove('open'));
  try{render();mfUpdateHome();}catch(_){/* Authentication gate stays closed even if an old view cannot render. */}
}
window.mfInvalidateSessionView=function(){sessionEpoch++;lock();actor=null;CURRENT_AUTH_USER=null;CURRENT_PROFILE=null;cloudUser=null;currentRole='viewer';clearView();
  if(typeof mfStopChatSubscription==='function')mfStopChatSubscription();
  try{mfCallState?.stream?.getTracks().forEach(t=>t.stop());mfCallState?.pc?.close();mfCallState?.channel?.unsubscribe();}catch(_){}mfCallState=null;
};
const bootstrapBefore=window.roleAwareBootstrap;
window.roleAwareBootstrap=async function(){let id=CURRENT_PROFILE?.id,epoch=sessionEpoch;if(!id||CURRENT_AUTH_USER?.id!==id){try{const db=await getSecureClient();const {data,error}=await db.auth.getSession();if(error)throw error;const user=data?.session?.user;if(user){CURRENT_AUTH_USER=user;if(!CURRENT_PROFILE||CURRENT_PROFILE.id!==user.id){await loadSecureProfile(user);id=CURRENT_PROFILE?.id}}}catch(_){}}if(!id||CURRENT_AUTH_USER?.id!==id)throw Error('يلزم حساب معتمد لتحميل البيانات');if(actor!==id){clearView();actor=id;}try{await bootstrapBefore.apply(this,arguments);if(epoch!==sessionEpoch||CURRENT_PROFILE?.id!==id||CURRENT_AUTH_USER?.id!==id)throw Error('تغير الحساب أثناء تحميل البيانات');}catch(e){if(epoch===sessionEpoch&&CURRENT_PROFILE?.id===id)mfInvalidateSessionView();throw e;}};
const loginBefore=window.secureLogin;
window.secureLogin=async function(){if(loginRunning||logoutRunning)return;loginRunning=true;mfInvalidateSessionView();
  try{await loginBefore.apply(this,arguments);}finally{
    loginRunning=false;
    /* A missing current-policy consent intentionally keeps secureLocked active
       while the consent modal owns the screen. Do not invalidate the freshly
       authenticated Supabase user/profile in that valid intermediate state. */
    const consentOpen=!!el('mfConsentModal')?.classList.contains('open');
    if(document.body.classList.contains('secureLocked')&&!consentOpen)mfInvalidateSessionView();
    if(el('loginPassword'))el('loginPassword').value='';
  }
};
// Operational tables, not historical browser snapshots, are authoritative.
window.pushCloud=async function(){return false;};
window.initCloud=async function(){return false;};
window.applySnapshot=function(){throw Error('أعد تحميل البيانات المعتمدة من الخادم');};
window.syncCloud=async function(show=false){try{await roleAwareBootstrap();if(show)mfToast('تم تحميل البيانات المعتمدة');return true;}catch(e){if(show)mfToast('تعذر تحميل البيانات: '+e.message,'bad');return false;}};
const logoutBefore=window.mfSecureLogout;
window.mfSecureLogout=async function(){if(logoutRunning)return;logoutRunning=true;sessionEpoch++;lock();if(typeof mfStopChatSubscription==='function')mfStopChatSubscription();clearView();try{if(typeof mfEndCall==='function')mfEndCall();await logoutBefore.apply(this,arguments);}finally{mfInvalidateSessionView();logoutRunning=false;}};
window.secureLogout=window.mfSecureLogout;
window.mfSchedulePaymentSync=function(){const id=CURRENT_PROFILE?.id;if(!id||CURRENT_AUTH_USER?.id!==id)return;if(syncActor===id)return;clearTimeout(initialSync);clearInterval(mfPaymentSyncTimer);syncActor=id;
  const run=()=>{if(CURRENT_PROFILE?.id===id&&CURRENT_AUTH_USER?.id===id&&!document.body.classList.contains('secureLocked'))mfSyncPayments(false);};
  mfPaymentSyncTimer=setInterval(run,10*60*1000);initialSync=setTimeout(run,2500);
};
window.mfObserveSession=async function(){const db=await getSecureClient();if(!db?.auth?.onAuthStateChange||observedClient===db)return;observedClient=db;
  db.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'||(CURRENT_AUTH_USER?.id&&session?.user?.id&&CURRENT_AUTH_USER.id!==session.user.id))mfInvalidateSessionView();});
};
mfObserveSession().catch(()=>{});
window.MF_NEXA_RELEASE='2026-09-19-r16';
})();
