from pathlib import Path

p=Path('index.html')
text=p.read_text(encoding='utf-8')

# The role bootstrap must map each financial field from its authoritative DB column.
old='''      arrears:num(c.overdue_amount),\n      netToPay:num(c.overdue_amount),\n      dueAmount:num(c.overdue_amount),'''
new='''      arrears:num(c.overdue_amount),\n      netToPay:num(c.outstanding_balance),\n      dueAmount:num(c.due_amount),'''
if old not in text:
    raise SystemExit('financial mapper block not found')
text=text.replace(old,new,1)

start=text.find('async function mfSyncPayments(showToast=false)')
end=text.find('function mfSchedulePaymentSync()',start)
if start<0 or end<0:
    raise SystemExit('payment sync markers not found')
replacement='''async function mfSyncPayments(showToast=false){
  try{
    const s=mfState(),c=await getSecureClient();if(!c)return false;
    // Payment rows are already posted by DB triggers. Never replay them against the
    // locally loaded client balance; refresh authoritative client state instead.
    let q=c.from("payments").select("*").order("created_at",{ascending:true}).limit(1000);
    if(s.settings.lastPaymentSync)q=q.gt("created_at",s.settings.lastPaymentSync);
    const {data,error}=await q;if(error)return false;
    const rows=mfArray(data);
    let added=0;
    meta.payments=mfArray(meta.payments);
    for(const row of rows){
      const exists=meta.payments.some(p=>String(p.dbId||p.remoteId||p.id)===String(row.id)||p.remoteId==="remote:"+row.id);
      if(exists)continue;
      const cl=(clients||[]).find(x=>String(x.id||"")===String(row.client_id||"")||String(x.clientNo||"")===String(row.client_number||""));
      if(!cl)continue;
      meta.payments.push({id:String(row.id),dbId:row.id,remoteId:"remote:"+row.id,clientId:mfClientKey(cl),clientNo:row.client_number,name:cl.name||"",employee:cl.employee||"",branch:row.branch_code||"",amount:num(row.amount),date:row.payment_date,type:row.payment_type,status:row.status,note:row.notes||"",receipt:null,source:row.source||"backend",paymentNo:Number(row.payment_no||row.installment_units||0),balanceBefore:num(row.balance_before),balanceAfter:num(row.balance_after),balance:num(row.balance_after),createdAt:row.created_at});
      added++;
    }
    if(rows.length){
      await roleAwareBootstrap();
      if(typeof window.mfLoadBackendState==="function")await window.mfLoadBackendState();
    }
    s.settings.lastPaymentSync=mfNow();save(false);
    if(showToast)mfToast(added?`تمت مزامنة ${added} دفعة جديدة`:"الدفعات محدثة");
    return true;
  }catch(e){console.warn("payment sync",e?.message||e);return false}
}
'''
text=text[:start]+replacement+text[end:]
p.write_text(text,encoding='utf-8')

log=Path('MF-NEXA_FIX_LOG.md')
body=log.read_text(encoding='utf-8')
entry='''\n\n## 2026-09-15 — Full Audit: payment sync replay prevention\n- Issue: the periodic payment sync could load historical backend payment rows and call `mfApplyPayment(..., source=system-sync)` against clients whose balances were already current from Supabase, causing a historical payment to be deducted a second time in local UI state. Existing backend-loaded payment history used `dbId`, while the sync dedupe only checked `remoteId`.\n- Root Cause: realtime/scheduled synchronization treated persisted payment events as unapplied financial operations instead of treating Supabase client balances as authoritative posted state. The client mapper also mapped `netToPay` and `dueAmount` from `overdue_amount` instead of their canonical `outstanding_balance` and `due_amount` columns.\n- Fix: payment sync no longer replays backend rows through the payment posting path. It deduplicates by DB id, adds only missing history rows, then refreshes scoped clients from Supabase. Client bootstrap now maps overdue, outstanding and due balances from their respective DB columns.\n- Files: `index.html`, `MF-NEXA_FIX_LOG.md`.\n- Status: Retest Required until deployed source is verified.\n'''
if '## 2026-09-15 — Full Audit: payment sync replay prevention' not in body:
    log.write_text(body+entry,encoding='utf-8')
