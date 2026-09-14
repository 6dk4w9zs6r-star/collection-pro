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
