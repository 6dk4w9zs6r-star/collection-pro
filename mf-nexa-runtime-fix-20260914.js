/* NEXA-MF runtime correctness patch — 2026-09-14
 * Fixes:
 * 1) Allocation Late classification when late-day evidence exists but inLate is stale/false.
 * 2) Smart Search access to global lexical clients/mfActiveClientIndex without bypassing mfInScope.
 *
 * This patch does not change balances, payment history, ownership, employee assignment, or permissions.
 */
(function(){
'use strict';
const PATCH='2026-09-14-late-smart-search-v1';

function list(){
  try{return Array.isArray(clients)?clients:[]}catch(_){return []}
}
function n(v){const x=Number(v);return Number.isFinite(x)?x:0}
function lateDays(c){return Math.max(n(c?.lateDays),n(c?.dueLateDays))}
function truthyLate(v){return v===true||v===1||String(v||'').toLowerCase()==='true'||String(v||'')==='1'}
function normalizeLateClassification(){
  const rows=list();
  let corrected=0;
  rows.forEach(c=>{
    if(!c||typeof c!=='object')return;
    const days=lateDays(c);
    // Master regression rule: a client with 30+ recorded late days must participate in Late views.
    // Preserve any existing true Late classification; only repair stale false/missing flags.
    if(days>=30&&!truthyLate(c.inLate)){c.inLate=true;corrected++}
  });
  return {clients:rows.length,corrected};
}
function exposeLexicalStateForSmartSearch(){
  try{
    const rows=list();
    // Smart Search audit code reads window.clients, while the application data is a top-level lexical binding.
    // Share the same array reference; no copy and no permission bypass.
    window.clients=rows;
  }catch(_){}
  try{
    const desc=Object.getOwnPropertyDescriptor(window,'mfActiveClientIndex');
    if(!desc||desc.configurable){
      Object.defineProperty(window,'mfActiveClientIndex',{
        configurable:true,
        enumerable:false,
        get(){try{return mfActiveClientIndex}catch(_){return -1}},
        set(v){try{mfActiveClientIndex=Number(v)}catch(_){}}
      });
    }
  }catch(_){}
}
function sync(){
  exposeLexicalStateForSmartSearch();
  return normalizeLateClassification();
}

// Run once after all inline scripts have initialized.
sync();

// Repair after data/bootstrap/snapshot refreshes without changing scope logic.
try{
  const oldApply=window.applySnapshot;
  if(typeof oldApply==='function'&&!oldApply.__nexaLateSmartPatch){
    const wrapped=function(){const r=oldApply.apply(this,arguments);sync();return r};
    wrapped.__nexaLateSmartPatch=true;window.applySnapshot=wrapped;
  }
}catch(_){}
try{
  const oldRender=window.render;
  if(typeof oldRender==='function'&&!oldRender.__nexaLateSmartPatch){
    const wrapped=function(){sync();return oldRender.apply(this,arguments)};
    wrapped.__nexaLateSmartPatch=true;window.render=wrapped;
  }
}catch(_){}
try{
  const oldAllocation=window.mfOpenAllocation;
  if(typeof oldAllocation==='function'&&!oldAllocation.__nexaLateSmartPatch){
    const wrapped=function(){sync();return oldAllocation.apply(this,arguments)};
    wrapped.__nexaLateSmartPatch=true;window.mfOpenAllocation=wrapped;
  }
}catch(_){}
try{
  const oldAi=window.mfOpenAi;
  if(typeof oldAi==='function'&&!oldAi.__nexaLateSmartPatch){
    const wrapped=function(){sync();return oldAi.apply(this,arguments)};
    wrapped.__nexaLateSmartPatch=true;window.mfOpenAi=wrapped;
  }
}catch(_){}

// Bootstrap can finish asynchronously after this script; re-sync a few bounded times.
[250,1000,2500,5000].forEach(ms=>setTimeout(sync,ms));
window.MF_NEXA_RUNTIME_FIX=PATCH;
})();
