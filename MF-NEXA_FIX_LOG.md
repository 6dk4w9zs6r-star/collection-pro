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
