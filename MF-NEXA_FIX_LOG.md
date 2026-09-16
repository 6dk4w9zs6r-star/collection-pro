# MF-NEXA Fix Log

## 2026-09-14 — Allocation Late + Smart Search

### Issue 1 — Allocation / Late
- Status before fix: **FAILED / Fix Required**
- Regression fixture: `TEST RAWAN` / employee `Rawan KHALED`.
- Observed: client profile reports 40 late days, but the client/employee was absent from Allocation Late.
- Root cause class: Late views depend on `inLate`, while a client can carry valid late-day evidence (`lateDays` / `dueLateDays`) with a stale or false `inLate` flag.
- Fix: runtime normalization preserves existing true Late state and repairs false/missing `inLate` when recorded late days are 30+.
- Data safety: no balance, payment history, ownership, employee, branch, or permission fields are changed.
- Status after code deployment: **Retest Required**.

### Issue 2 — Smart Search scope summary
- Status before fix: **FAILED / Fix Required**
- Observed: Smart Search showed Clients 0 / Due 0 / Late 0 while accessible clients existed.
- Root cause: Smart Search audit code read `window.clients` and `window.mfActiveClientIndex`, while the application stores those as top-level lexical bindings. This produced an empty Smart Search data source even though normal search could see the clients.
- Fix: expose the same live clients array and active-client index to the Smart Search runtime. Existing `mfInScope` permission filtering remains unchanged and is not bypassed.
- Status after code deployment: **Retest Required**.

### Deployment
- Runtime patch: `mf-nexa-runtime-fix-20260914.js`
- Service worker cache/version updated to load the runtime correctness patch.
- Required regression tests:
  1. Allocation Late shows `Rawan KHALED` / `TEST RAWAN` with 40 late days.
  2. Existing Mahmoud Late result remains correct.
  3. Smart Search portfolio summary reports the real permitted client count and non-stale Late/Due counts.
  4. Main search still finds `TEST RAWAN`.
  5. Results remain limited by the signed-in user's existing permissions/scope.

Do not mark either issue **Closed** until the UI retest passes.


## 2026-09-14 — Direct source correction (Allocation Late + Smart Search)
- Issue: TEST RAWAN has 40 late days but was absent from Allocation → Late 30–60.
- Root cause: Allocation filtered on stored `inLate` instead of actual late-day range.
- Fix: Allocation Late 30–60 now uses 30–60 days directly without changing test data, balances, ownership, or payment history.
- Issue: Smart Search used `window.clients` and could return portfolio output for a general question.
- Root cause: wrong state binding plus unsafe fallback and unguarded General-QA leakage.
- Fix: direct `clients` binding, `mfInScope` enforcement, canonical Late logic, General-QA fallback, leakage reject/retry.
- Removed: service-worker injection and runtime hotfix file.
- Files: `index.html`, `sw.js`, `MF-NEXA_FIX_LOG.md`.
- Status: Retest Required.


## 2026-09-14 — Late eligibility active-state correction
- Issue: TEST RAWAN had 40 overdue days but was still excluded from the loaded Late set because `paid_amount > 0` was incorrectly treated as fully inactive.
- Root cause: client bootstrap computed `active = paid_amount <= 0`; a partial payment therefore removed a still-overdue client from Late/Due.
- Fix: Late/Due eligibility now follows overdue days directly; partial payment no longer removes a client that still has overdue days. Branch Late/Due counters use the same rule.
- Data changed: none. TEST RAWAN remains unchanged.
- Files: `index.html`, `MF-NEXA_FIX_LOG.md`.
- Status: Retest Required.

## 2026-09-14 — Full Audit: profile privilege escalation hardening
- Issue: `profiles_update_own` allowed authenticated users to update their own profile row without preventing changes to privileged fields such as `role`, `branch_code`, `supervisor_email`, `is_active`, or login email.
- Root Cause: row-level ownership policy restricted which row could be changed, but did not protect privileged columns on that row.
- Fix: added `protect_profile_privileged_fields()` and a `BEFORE UPDATE` trigger. Non-Founder users may not change privileged profile fields; Founder administration remains permitted.
- Test: attempted to change Rawan KHALED from `lo` to `founder` under her auth UID; trigger blocked the operation and the stored role remained `lo`.
- Permissions tested: LO escalation blocked; Founder bypass retained by `is_founder()`.
- Supabase migration: `harden_profile_and_null_scope_permissions`.
- Status: Passed.

## 2026-09-14 — Full Audit: legal/client scope permission leak
- Issue: `can_legal_access_client(client_id)` returned true for any existing client, allowing authenticated users to pass legal/location/message/attachment policies for clients outside their assigned scope.
- Root Cause: helper function checked only that the client row existed; it did not evaluate collection scope or Lawyer branch scope.
- Fix: `can_legal_access_client` now requires either `can_access_client(assigned_user_id, branch_code)` or `can_lawyer_view_client(branch_code)`.
- Test: Rawan LO can access TEST RAWAN and is denied TEST MAHMOUD; Mahmoud LO gets the inverse result; BM B1 can access both branch clients.
- Affected policy consumers: Legal Cases, Locations, Attachments, Messages.
- Supabase migration: `fix_legal_client_scope_permission_leak`.
- Status: Passed.

## 2026-09-14 — Full Audit: unscoped null-record and insert hardening
- Issue: clientless Messages/Attachments and clientless Audit records could be broadly readable; Activities and Disbursements inserts did not fully enforce client/branch scope.
- Root Cause: permissive `client_id IS NULL` SELECT branches and ownership-only INSERT checks.
- Fix: clientless Messages/Attachments are limited to their creator or Founder; Audit null-client rows are limited to actor or Founder/CFMP; Activities inserts now validate client and branch scope; Disbursement inserts now validate accessible client or requester's branch/management scope.
- Supabase migration: `harden_profile_and_null_scope_permissions`.
- Status: Passed.

## 2026-09-14 — Full Audit: client/employee and Late-Due consistency backfill
- Issue: existing clients had valid `assigned_user_id` links but `employee_id` was null, and TEST MAHMOUD qualified for current Late 30–60 but had no corresponding current-month `late_due` row.
- Root Cause: operational client data predated or bypassed later employee/late_due synchronization logic.
- Fix: backfilled `clients.employee_id` from `employees.auth_user_id`, then upserted current-month Late/Due derived rows from current client state without changing balances, payments, ownership, overdue days, or assignments.
- Test: both TEST MAHMOUD and TEST RAWAN now have correctly linked employee IDs; current Late rows exist for both; TEST RAWAN Due remains open and linked to Rawan.
- Consistency audit after backfill: 0 duplicate client numbers, 0 missing client assignments, 0 missing employee IDs, 0 bad branch links, 0 orphan Late/Due rows, 0 orphan payments, 0 negative payments, 0 successful-unposted payments, 0 missing current Late 30–60 rows.
- Supabase migration: `backfill_client_employee_and_late_due_consistency`.
- Status: Passed.

## 2026-09-14 — Full Audit: Follow-up / Promise / Field Visit audit-trigger failure
- Issue: valid in-scope inserts into `follow_ups`, `promises_to_pay`, and `field_visits` failed during DB audit logging, while out-of-scope inserts were correctly blocked by RLS.
- Root Cause: shared trigger function `log_collection_activity()` accessed table-specific `NEW` fields directly (`updated_by`, `resolved_by`, etc.). On tables that do not contain those columns PostgreSQL raised `record "new" has no field ...`, aborting valid writes.
- Fix: rewrote the trigger to serialize `NEW`/`OLD` to JSONB first and read optional actor/client/id fields safely by key, so the same trigger works across all four collection tables without referencing nonexistent record fields.
- Regression test: under Rawan KHALED's authenticated LO context, own-client inserts now pass for Follow Up, Promise to Pay, Activity and Field Visit; equivalent inserts against TEST MAHMOUD are rejected by RLS. Test transaction was rolled back, so no test rows were persisted.
- Permissions tested: LO own scope allowed; LO out-of-scope blocked.
- Supabase migration: `fix_collection_audit_trigger_generic_row_access`.
- Status: Passed.

## 2026-09-14 — Full Audit: Team Chat room scope leakage
- Issue: Team Chat RLS allowed any active user in the same branch to read or send to a team room because branch equality was accepted as team membership.
- Root Cause: `chat_messages` team policies used `(p.team = team_key OR p.branch_code = branch_code)`.
- Fix: team-room read/write now requires exact active-profile team membership, with Founder retained as the global administrative exception. General and Private room behavior remains separate.
- Requirement checked: each Team Room is restricted to its team and users must not read a room outside their authorization.
- Supabase migration: `harden_team_chat_room_scope`.
- Status: Passed.

## 2026-09-14 — Full Audit: Announcements publish/read workflow
- Issue: backend schema had announcement content/audience but no Publish/Unpublish state, active date window, or read-confirmation records; existing SELECT policy could expose records without a publication lifecycle.
- Root Cause: announcement support table was only a partial implementation of the MASTER workflow.
- Fix: added publication state/timestamps, start/end window, optional media duration cap (30 seconds), `announcement_reads`, own-read tracking RLS, management update/delete policies, and recipient SELECT rules that require published + active-window content unless the requester is the creator or Founder.
- Supabase migration: `complete_announcements_publish_read_workflow`.
- Status: Passed.

## 2026-09-14 — Full Audit: Legal / Location / Message scope regression
- Test: under Rawan KHALED's authenticated LO context, inserts for TEST RAWAN passed for Legal Case, Location and Message; the same operations against TEST MAHMOUD were blocked by RLS. Entire test transaction was rolled back.
- Status: Passed.

## 2026-09-14 — Full Audit: Chat sender identity and private-room scope
- Issue: `chat_messages.sender_name` was supplied by the client, so a user could submit another employee's display name. Private-room SELECT also trusted a room-id string containing the viewer UUID, which was weaker than participant identity columns.
- Root Cause: sender identity was only checked through `sender_id`; display name was not canonicalized, and private-room authorization included a string-matching fallback.
- Fix: added `normalize_chat_sender()` to require the authenticated sender and overwrite `sender_name` from the active profile; removed the private `room_id LIKE %uuid%` authorization fallback; Team rooms remain exact-team scoped and Founder retains the administrative exception.
- Regression test: Rawan inserted a rollback-only General Chat message with `sender_name='IMPERSONATED NAME'`; stored/returned sender name was normalized to `Rawan KHALED`.
- Supabase migration: `harden_chat_sender_and_private_room_scope`.
- Status: Passed.

## 2026-09-14 — Full Audit: Call participant identity hardening
- Issue: call records rely on `caller_id`/`callee_id`; participant UPDATE permissions could otherwise be abused to mutate call identity fields after creation.
- Root Cause: RLS limited update rows to participants but did not make caller/callee/room/type immutable.
- Fix: added authenticated caller normalization/validation and a BEFORE UPDATE guard that makes `caller_id`, `callee_id`, `room_id`, and `call_type` immutable. The live schema has no client-supplied caller-name field, so identity is represented by the authenticated caller UUID.
- Regression test: Rawan created a rollback-only call invitation and the caller UUID remained her authenticated UID; spoofed caller identity is rejected.
- Supabase migrations: `harden_call_caller_identity`, `fix_call_identity_trigger_schema`, `protect_call_participant_identity`.
- Status: Passed.

## 2026-09-14 — Full Audit: Payment reversal state restoration
- Issue: `payments.status` supports `reversed`, but the database only posted successful payments; changing a posted successful payment to reversed did not restore client balances, paid amount, installment count, or Late/Due-derived state.
- Root Cause: `apply_successful_payment()` handled only successful posting and there was no symmetric reversal trigger.
- Fix: added `reverse_successful_payment()` for successful→reversed transitions. It restores outstanding/overdue/due balances, subtracts the payment from paid amount, restores installment units, recalculates last successful payment date, refreshes payment balance-after, and lets existing client Late/Due synchronization run from the client update.
- Regression test: rollback-only reversal of TEST RAWAN's 50 partial payment restored outstanding 100→150, overdue 100→150, due 100→150, paid 50→0, installment units 2→3, and payment `balance_after` to 150. Transaction was rolled back, leaving regression data unchanged.
- Supabase migration: `restore_client_state_on_payment_reversal`.
- Status: Passed.

## 2026-09-14 — Full Audit: operational audit-log coverage
- Issue: Activities, Announcements, Attachments, Locations, Messages, Chat Messages and Call Invitations had no database audit trigger, leaving important operational changes outside the central audit trail.
- Root Cause: audit triggers had been added for core collection/legal/payment tables but not for several newer modules.
- Fix: attached `audit_admin_module_change()` to INSERT/UPDATE/DELETE on all seven uncovered operational tables.
- Regression test: rollback-only Chat insert under Rawan produced exactly one matching `audit_log` row; no test data was persisted.
- Supabase migration: `complete_operational_audit_trigger_coverage`.
- Status: Passed.

## 2026-09-14 — Full Audit: role-scope regression matrix
- Founder Mashal: sees both regression clients and all three current Late/Due rows.
- BM Kawther (B1): sees both B1 regression clients and all three current Late/Due rows.
- LO Rawan: sees only TEST RAWAN and her permitted payment/Late/Due records.
- CFMP / ALS / Lawyer: no real active accounts currently exist, so only rollback-only profile-role simulations were used to validate core RLS without persisting fabricated identities. Simulated CFMP saw both clients; simulated Lawyer B1 saw both B1 clients; simulated ALS with Rawan as direct report saw only TEST RAWAN.
- Data safety: all simulated role/profile edits were inside transactions and rolled back.
- Status: Retest Required for real-account E2E; core database scope logic Passed.

## 2026-09-15 — Full Audit: Deferral / Escalation / Write-Off / Disbursement workflow permissions
- Initial retest issue: the first audit query used obsolete test column names (`fee`, `level`); live schema uses `deferral_fee` and `escalation_level`. This was a test-harness mismatch, not an application failure.
- Corrected regression test under Rawan LO: own-client Deferral and Escalation inserts passed; equivalent TEST MAHMOUD inserts were blocked by RLS. Own-client Write-Off and Disbursement inserts passed in their earlier scoped tests; out-of-scope inserts were blocked.
- Approval segregation: Rawan LO could not approve her own Deferral or Write-Off. BM Kawther B1 could approve the branch Deferral, Write-Off and Disbursement in rollback-only tests.
- Data safety: all workflow test rows were rolled back.
- Status: Passed.

## 2026-09-15 — Full Audit: Notifications and preferences scope
- Test under Rawan LO: exactly her own notification row was visible; own `notification_preferences` upsert passed; attempting to modify Mahmoud's preferences was blocked by RLS; direct end-user INSERT into `notifications` was blocked.
- Realtime publication includes `notifications`, `chat_messages`, and `call_invitations`.
- Data safety: preference test transaction was rolled back.
- Status: Passed.

## 2026-09-15 — Full Audit: Announcement visibility/read regression
- Test: BM Kawther created rollback-only B1 branch announcements in published and unpublished states. Rawan LO could see the published active-window announcement, could not see the unpublished one, and could record her own read confirmation.
- Scope note: BM cannot publish audience=`all`; Founder/CFMP own that global scope by design. BM is limited to branch/team audiences in the BM branch.
- Status: Passed.

## 2026-09-15 — Full Audit: secure attachment storage backend
- Verification: private Supabase Storage bucket `mf-nexa-attachments` exists with a 10 MB limit and explicit allowed MIME types for common image/PDF/text/DOCX attachments.
- Storage RLS: upload requires authenticated ownership and a UID-scoped path; reads require ownership or access through the related scoped Message/Chat/Payment/Announcement/Attachment record; delete is owner-only.
- Bucket is not public. Backend storage persistence is therefore present; production UI binary-upload E2E remains part of final UI regression.
- Status: Passed for backend/RLS; Retest Required for production UI E2E.

## 2026-09-15 — Full Audit: historical payment employee attribution
- Issue: the existing successful TEST RAWAN payment was correctly linked to client 2 and branch B1 but `payments.employee_id` was null, causing employee-attributed payment dashboard/report output to lose the LO identity.
- Root Cause: the payment predates the later client→employee backfill; it was posted while the client employee link was still null. Current posting logic already fills employee attribution for future payments.
- Fix: migration backfilled only missing `payments.employee_id` from the canonical linked `clients.employee_id` (and retained/coalesced branch). The posted-payment immutability guard was disabled only for this controlled migration update and immediately re-enabled; amount, status, client, balances, payment date and payment history were not altered.
- Regression test: under Rawan's authenticated scope, `payment_dashboard` now reports employee `13b5863f-77e0-4ab4-a08d-577b073e1e7b` (Rawan), total payments 1, successful amount 50.00.
- Supabase migration: `backfill_payment_employee_attribution_admin`.
- Status: Passed.


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
- Frontend source fix: `mfApplyPayment` rejects overpayment before local mutation and persists to Supabase before mutating local client/payment/Late-Due state, preventing UI state drift when backend persistence fails.
- Status: Retest Required until the deployed source commit is verified.


## 2026-09-15 — Full Audit: payment sync replay prevention
- Issue: the periodic payment sync could load historical backend payment rows and call `mfApplyPayment(..., source=system-sync)` against clients whose balances were already current from Supabase, causing a historical payment to be deducted a second time in local UI state. Existing backend-loaded payment history used `dbId`, while the sync dedupe only checked `remoteId`.
- Root Cause: realtime/scheduled synchronization treated persisted payment events as unapplied financial operations instead of treating Supabase client balances as authoritative posted state. The client mapper also mapped `netToPay` and `dueAmount` from `overdue_amount` instead of their canonical `outstanding_balance` and `due_amount` columns.
- Fix: payment sync no longer replays backend rows through the payment posting path. It deduplicates by DB id, adds only missing history rows, then refreshes scoped clients from Supabase. Client bootstrap now maps overdue, outstanding and due balances from their respective DB columns.
- Files: `index.html`, `MF-NEXA_FIX_LOG.md`.
- Status: Retest Required until deployed source is verified.


## 2026-09-15 — Full Audit: Deferral fail-closed persistence
- Issue: the final Deferral UI override could create a local pending deferral when the secure Supabase client was unavailable, displaying success for a record that was never persisted.
- Root Cause: the handler treated a missing DB client as an offline/local fallback and generated a local id.
- Fix: Deferral now requires the secure Supabase client and a successful `deferrals` insert before mutating local state or showing success.
- Files: `index.html`.
- Status: Retest Required until deployed source is verified.

## 2026-09-15 — Follow-up and Promise durable persistence
- Root cause: final UI handlers overrode earlier DB-first code. Follow-ups mutated local state before insert; promises treated a missing DB client as success; status updates did not verify affected rows; rescheduling was local-only. Follow-up "not_completed" was incorrectly rewritten as "pending".
- Fix: final handlers require confirmed returned DB rows before local changes. Create operations reject repeated clicks while pending. Updates and rescheduling require a persisted DB id and exactly one returned row. Kept promises collect the actual fulfillment date required by the schema.
- Promise/client changes are atomic through SECURITY INVOKER RPC record_promise_atomic; existing RLS applies. PUBLIC/anon cannot execute it. Migration: record_promise_atomic_invoker.
- Follow-ups now reload from scoped Supabase records, removing local-only records from the operational list. Promises reload their fulfillment dates.
- Validation: all 15 inline scripts parse; 27 behavior tests passed for missing DB, network rejection, RLS error, empty response, success ordering and repeated clicks. 27 rollback SQL assertions passed for own-scope CRUD, out-of-scope denial, retarget denial, BM/Founder access and valid/invalid atomic promises. Promise DELETE remains denied by its existing policy.
- Existing accounts used: Rawan, Mahmoud, BM Kawther, Founder Mashal. No accounts, teams or portfolios fabricated; regression transactions rolled back.
- Status: backend and isolated handler tests Passed; production UI E2E and deployment verification Retest Required. Browser opening timed out in this session, so no UI result is claimed.
- Reproducible checks: scripts/test-collection-persistence.cjs and scripts/test-collection-rls.sql.

## 2026-09-15 — Login bootstrap crash
- Issue: login succeeded at Auth but post-login client bootstrap crashed with `paid is not defined`, leaving the login gate visible.
- Root cause: the client mapper referenced `paid` without deriving it from authoritative `clients.paid_amount`.
- Fix: define `paid = num(c.paid_amount)` inside the mapper before calculating payment count and total paid.
- Status: source fixed; deployment and authenticated UI retest required.



## 2026-09-15 — Production UI retest (Founder)
- Authenticated Founder Mashal Dawud successfully reached the NEXA-MF home dashboard.
- Verified visible role identity (Founder, ALS, branch B1), Home search filters, Smart Search entry, and Allocation modal.
- Allocation modal rendered Late 30–60, Due, Late (2), and B1 branch summary without a JavaScript error.
- Status: Passed for the available Founder account; other role/device E2E remains Retest Required.


## 2026-09-15 — Corrected deployment evidence and entrypoint drift
- Earlier blanket Founder Passed and cache-cause claims were unsupported. Only login, Allocation navigation and client read views were verified; CRUD/device/role E2E is NOT closed.
- Fetched actual GitHub blobs: index.html c1eb796 lacked the paid binding, while app.html 2911f28 had the binding but lacked the atomic Field Visit RPC handler.
- Fixed the missing paid binding in the atomic/DB-first source and published identical index.html and app.html blobs 92d64431abf24f8c581192529ad445c4eb42dc30. Commits 9ef3d71 and 86b3e1c.
- Actual UI checks: Founder navigated B1/team/Rawan and Mahmoud; TEST RAWAN displayed 100 JOD / 40 days, TEST MAHMOUD 100 JOD / 35 days. Mahmoud's two follow-ups (pending/completed) appeared; Rawan had none. Read-only SQL confirmed both persisted follow-ups belong to client 1.
- No business data modified in these UI checks. Latest Pages artifact and authenticated post-deployment regression remain Retest Required.
# 2026-09-16 — Approved update implementation, release r1

- Reconciled current upstream `16d4264` with preserved local work. Both public HTML entry points now load the same additive update; identity and established layout are retained.
- Restored Send Location beside Open Location. GPS save is DB-first; client and guarantor destinations are separate; null/out-of-range coordinates are rejected. Field-visit success followed by refresh failure reports that the visit was already saved.
- Added durable referenced payment imports and immutable original payloads. Unique `(source, source_reference)` prevents replay. Unmatched records persist without posting; scoped rematching and mandatory under-installment classification preserve financial rules.
- Classification updates the existing payment and reloads authoritative balances; no system-sync replay or second local deduction. Pending/fee helpers require confirmed database rows. Repeated Save clicks are guarded.
- Added date/branch/employee payment reports and paginated client/payment loading. Daily totals exclude fees and unposted payments. Account-switch checks protect payment refreshes.
- Supabase migrations: `durable_idempotent_payment_import`, `payment_import_active_scope_and_identity`. Both additive; no existing balance rewritten. Inactive-account and unmatched branch access are restricted.
- AI edge `mf-nexa-ai` deployed as version 4: custom Auth validation retained, active-profile check added, client/summary read under caller RLS, untrusted browser summary ignored, raw Responses output parsed correctly, general questions omit customer context, `store:false`. Five mocked tests passed; live unauthenticated call returns 401. Authenticated provider E2E remains open.
- Local checks passed: 15 inline scripts parse; 27 follow-up/promise behaviors; 18 update behaviors; 18 Late boundaries; 7 service-worker checks; 4 field-visit checks; 5 AI scope checks. Desktop/mobile browser fixture checks passed with all database requests blocked.
- Live rollback-only SQL: atomic field visit/payment, import replay/classification/payload/unmatched/ownership, rematching, inactive-user access. A synthetic 1000-record import plus 1000 replays passed without balance changes. All temporary rows and temporary account changes rolled back.
- New handover and execution checklist explicitly retain open stage-6/7 requirements: real-role/device E2E, official-volume sources and daily connector, full disaster recovery, push backend, final training videos, leaked-password protection setting. This release is not a 100% project closure claim.
# 2026-09-16 — Atomic approval completion, release r2

- Write-off approval and the actual client balance change now run inside one database transaction. Only the approved amount is written off; remaining debt is preserved, Before/After and approver identity are recorded, and repeated decisions are rejected.
- Deferral approval atomically shifts the approved installment amount out of current overdue/due balances, preserves total outstanding principal, records before_state/after_state, and creates no collection payment. Saved approved dates are reapplied when the client reloads.
- LO cannot approve these requests or insert them already approved. Disbursement INSERT also requires an unapproved pending request; authorized management can approve it afterwards.
- UI approvals no longer call legacy local balance mutation. They require one confirmed pending-row update and reload authoritative state. A refresh failure after successful approval is distinguished from a failed approval.
- Shared operational inserts/updates now reject empty responses and silent RLS denials. Legal insertion requires a returned id; write-off attachment paths are persisted.
- Migrations: `atomic_writeoff_and_deferral_decisions`, `disbursement_requests_require_approval`. Rollback-only tests passed for partial write-off, no duplicate application, deferral principal preservation/no payment creation, saved evidence, LO denial and BM approval. No operational rows were retained from tests.
- Local update behaviors: 34 passed. Existing 27 collection behaviors, 18 Late boundaries, 7 cache checks and 4 field-visit checks passed. Browser layout checks passed at desktop/mobile widths with database traffic blocked. Authenticated production E2E remains a separate uncompleted gate.

# 2026-09-16 — Durable notes and publication, release r3

- Client notes now require a confirmed database insert and reload from `client_notes`; local-only history is preserved but not silently imported as official records. RLS enforces client scope, authentic authors and immutable notes; database audit and server timestamps are recorded.
- Announcements explicitly save published/draft state, optional start/end times and server publication timestamps. Branch/team payloads retain the actual branch; team selection uses available teams and rejects invented defaults. Scoped managers can publish or stop publication. Draft, future and expired content are excluded from the public list.
- Morning read acknowledgement is a database RPC, unique per user/content and idempotent. Receipts reload after login; inactive accounts and inaccessible/unpublished content cannot acknowledge. Team Spirit content uses the existing approved content type.
- Private attachments open through a fresh signed URL; uploads must return a persistent path. Videos are checked for a duration of at most 30 seconds before upload. Actual video/device/storage E2E is still required.
- Private Storage now additionally requires an active profile for every authenticated operation (`private_storage_requires_active_account`). This closes the owner-policy path for disabled accounts; previously issued signed URLs remain usable until their existing expiry. The policy is inspected in the live schema; authenticated Storage API/device E2E remains open.
- Additive migration `durable_notes_and_publication_receipts` deployed. Rollback-only database tests passed for notes, cross-officer denial, author spoof rejection, branch management, publication windows, repeated receipts, unpublishing and inactive accounts. No test records or account changes retained.
- 22 targeted local behavior checks passed; all existing targeted suites passed. Desktop/mobile browser fixtures now include notes, announcements, management controls and form fields, with database traffic blocked. Publication evidence is verified separately after push.
