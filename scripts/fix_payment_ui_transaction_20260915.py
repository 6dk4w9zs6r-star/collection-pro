from pathlib import Path

index_path = Path('index.html')
log_path = Path('MF-NEXA_FIX_LOG.md')
text = index_path.read_text(encoding='utf-8')
start_marker = 'async function mfApplyPayment(c,amount,date,type,status="successful",note="",receipt=null,source="manual")'
end_marker = 'async function mfUpdatePaymentStatus'
start = text.find(start_marker)
if start < 0:
    raise SystemExit('mfApplyPayment start not found')
end = text.find(end_marker, start)
if end < 0:
    raise SystemExit('mfApplyPayment end marker not found')

replacement = r'''async function mfApplyPayment(c,amount,date,type,status="successful",note="",receipt=null,source="manual"){
  const before=Math.max(num(c.arrears),num(c.dueAmount),num(c.netToPay)),applied=status==="successful",after=applied?Math.max(0,before-amount):before,no=(Number(c.paymentCount)||0)+(applied?1:0),id=mfId();
  if(amount<=0)throw new Error("أدخل مبلغًا صحيحًا");
  if(applied&&type!=="deferral_fee"&&amount>before)throw new Error(`المبلغ ${amount} أكبر من الرصيد المستحق ${before}`);

  // Persist first. The database is the financial source of truth; local state must not mutate
  // before the backend accepts and posts the payment.
  let savedPayment=null;
  if(source!=="system-sync"){
    const db={client_id:c.id,client_number:c.clientNo,amount,payment_date:date,payment_type:type,status,notes:note,balance_before:before,balance_after:after,payment_no:no,branch_code:c.branchCode||c.branch||null,receipt_url:receipt?.storagePath||null,created_by:CURRENT_AUTH_USER?.id||CURRENT_PROFILE?.id||null};
    savedPayment=await mfTryInsert("payments",db);
    if(!savedPayment)throw new Error("تعذر حفظ الدفعة في قاعدة البيانات");
  }

  if(applied){
    if(num(c.arrears)>0)c.arrears=after;
    if(num(c.dueAmount)>0)c.dueAmount=after;
    if(num(c.netToPay)>0)c.netToPay=after;
    c.paymentCount=no;c.totalPaid=num(c.totalPaid)+amount;c.lastPaymentDate=date;c.status=no===1?"دفعة 1":"دفعتان من أصل دفعتين";
    mfState().promises.filter(p=>p.clientId===mfClientKey(c)&&p.status==="pending"&&date<=p.promiseDate).forEach(p=>{p.status="kept";p.updatedAt=mfNow();p.keptByPayment=id});
  }
  const payment={id,dbId:savedPayment?.id||null,clientId:mfClientKey(c),clientNo:c.clientNo,name:c.name,employee:c.employee||"",cea:c.cea||"",branch:c.branchCode||c.branch||"",amount,date,type,status,note,receipt,source,paymentNo:no,balanceBefore:before,balanceAfter:after,balance:after,actor:mfActor(),createdAt:mfNow()};
  meta.payments.push(payment);meta.paidCustomers=meta.paidCustomers||{};
  if(applied)meta.paidCustomers[c.clientNo]={clientNo:c.clientNo,name:c.name,employee:c.employee||"",cea:c.cea||"",paymentCount:no,totalPaid:c.totalPaid,balance:after,lastPaymentDate:date,source};
  const key=c.cea||c.employee,exitLate=applied&&no>=2,exitDue=applied&&after<=0;
  if(exitLate){lateData.currentIds=mfArray(lateData.currentIds).filter(x=>x!==c.clientNo);lateData.paidIds=mfArray(lateData.paidIds);if(!lateData.paidIds.includes(c.clientNo))lateData.paidIds.push(c.clientNo);c.inLate=false}
  if(exitDue){dueData.currentIds=mfArray(dueData.currentIds).filter(x=>x!==c.clientNo);dueData.paidIds=mfArray(dueData.paidIds);if(!dueData.paidIds.includes(c.clientNo))dueData.paidIds.push(c.clientNo);c.inDue=false}
  [lateData,dueData].forEach(d=>{if(d.byEmployee?.[key]){if((d===lateData&&exitLate)||(d===dueData&&exitDue)){d.byEmployee[key].currentIds=mfArray(d.byEmployee[key].currentIds).filter(x=>x!==c.clientNo);d.byEmployee[key].paidIds=mfArray(d.byEmployee[key].paidIds);if(!d.byEmployee[key].paidIds.includes(c.clientNo))d.byEmployee[key].paidIds.push(c.clientNo)}}});
  c.history=mfArray(c.history);c.history.push({date:new Date().toLocaleString("ar-JO"),text:`دفعة ${amount} د.أ (${type}) — ${applied?`الرصيد ${before} ← ${after}`:"Pending دون ترحيل على الرصيد"}`});
  mfCommit(applied?"payment_posted":"payment_pending",c,`المبلغ ${amount}؛ الرصيد قبل ${before} وبعد ${after}`);
  return payment;
}
'''
text = text[:start] + replacement + text[end:]
index_path.write_text(text, encoding='utf-8')

log = log_path.read_text(encoding='utf-8')
entries = r'''

## 2026-09-15 — Full Audit: protected profile team membership
- Issue: `profiles.team` participates in Team Chat and team-announcement authorization; a normal user changing their own team could therefore expand content access.
- Root Cause: the original own-profile update hardening protected role/branch/supervisor/active/email but did not include team membership.
- Fix: `protect_profile_privileged_fields()` now also makes `team` Founder-managed; non-Founder self-service profile updates cannot change team membership.
- Supabase migration: `protect_profile_team_membership`.
- Status: Passed.

## 2026-09-15 — Full Audit: remaining scope and immutable-identity gaps
- Issues: Activity UPDATE rechecked creator but not target client/branch; clientless Disbursement SELECT was broader than requester/management scope; inactive authenticated profiles could still read General/Private Chat; notification recipients could update notification payload fields; operational actor fields could be rewritten after creation.
- Fix: Activity UPDATE now revalidates client/branch scope; clientless Disbursements are requester-or-management scoped; Chat SELECT requires an active profile; notifications only permit recipient read-state changes; operational creator/requester/escalator identity is immutable on update.
- Regression tests: Rawan LO cannot retarget her Activity to TEST MAHMOUD; Mahmoud LO cannot see Rawan's clientless Disbursement while Rawan and BM Kawther can; a rollback-only deactivated Rawan sees zero test General Chat rows; notification payload edit is rejected while own `is_read` update succeeds.
- Supabase migration: `close_remaining_scope_and_identity_gaps`.
- Status: Passed.

## 2026-09-15 — Full Audit: canonical payment balance and overpayment guard
- Issue: a successful payment larger than the collectible balance was accepted and could drive `paid_amount` above the debt. Historical TEST MAHMOUD also had `overdue_amount=100` with `outstanding_balance=0`, creating a DB/UI Balance Before mismatch.
- Root Cause: payment posting capped balances at zero but did not reject overpayment; posting treated only `outstanding_balance` as the pre-payment balance while the app uses the maximum of outstanding/due/overdue debt.
- Fix: active client outstanding balance is normalized to at least Due/Overdue debt; payment posting uses the canonical maximum debt balance; successful non-fee payments above that balance are rejected both before posting and in the posting function. `deferral_fee` remains non-amortizing.
- Regression tests: rollback-only partial 25 on TEST RAWAN posts 100→75; full 100 on TEST MAHMOUD posts 100→0; 101 against a 100 balance is rejected; a deferral fee leaves client balances and installment count unchanged.
- Supabase migration: `enforce_canonical_payment_balance_and_overpay_guard`.
- Frontend source fix: `mfApplyPayment` now rejects overpayment before local mutation and persists to Supabase before mutating local client/payment/Late-Due state, preventing UI state drift when backend persistence fails.
- Status: Retest Required until the deployed source commit is verified.
'''
if '## 2026-09-15 — Full Audit: protected profile team membership' not in log:
    log += entries
    log_path.write_text(log, encoding='utf-8')
