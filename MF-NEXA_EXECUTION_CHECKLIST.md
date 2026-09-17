# MF-NEXA execution register — 2026-09-16

Sources: 2026-09-14 unified master (local extracted reference), all six pages of the 2026-09-16 Arabic update, current main branch and live Supabase inspection. No completion percentage is claimed.

r8: 24 local session checks, prior suites and desktop/mobile browser pass. Startup ignores unowned operational caches; writes use account-prefixed keys; state resets on account change/logout; normal login unlocks only after bootstrap; legacy snapshot reads/writes disabled. Existing cached records preserved, never silently attributed/imported. Payment scheduling is once per account with stale-session callbacks ignored. Live anonymous REST checks on 14 sensitive tables expose no rows (2026-09-16 16:05 UTC). Actual authenticated multi-role/device E2E and old local-only record ownership/migration remain open; no database changes.

r7: 35 public HTML files checked; active entrypoints have empty embedded client datasets and 33 historical entrypoints are redirects. Original files and a verified full Git bundle are preserved locally outside the deployment repository. No database changes. Public Git history and third-party cached copies are NOT erased; historical exposure remediation and shared-browser session-state isolation remain open gates.

r6: core operational/client/vehicle/deferral/audit loading uses id cursor pages and propagates errors; bootstrap awaits operational loading. 27 mocked loading tests pass (1201 rows per each of ten operational tables), all prior suites pass, local desktop/mobile browser passes. This is not a transactional multi-request snapshot or authenticated production E2E. No new database migration.

| Requirement | Verified evidence / next acceptance gate | Status |
|---|---|---|
| Preserve identity, layout, Light/Dark and established functions | Additive changes; desktop/mobile local browser checks through r4 pass | Real-device checks open |
| Authentication, hierarchy, roles and employee IDs | Existing Founder/BM/LO accounts; no active CFMP/ALS/Lawyer accounts | Real-role E2E partly blocked |
| Client page, search, contact, voice search | Present; final authenticated browser checks required | Verify |
| Late / Rawan partial and zero-balance rules | 18 local boundary cases passed | DB and UI regression required |
| Payments, before/after, fees, classification | Confirmed writes, idempotent imports/classification and rollback SQL checks | Implemented; authenticated UI E2E open |
| Promises / follow-ups | 27 local persistence behavior tests passed | Published E2E required |
| Visits / GPS / locations | Atomic visit RPC and live rollback SQL verified; local handlers pass | Physical GPS/device E2E open |
| Open AND send saved client/guarantor location | Both controls restored, separate persisted valid locations; local checks pass | Implemented; device E2E open |
| Import, unmatched preservation, deduplication | Durable source references, raw payload, unmatched rematching; 1000-row rollback test | Official-file integration open |
| Daily payment report, branch then employee, explicit date | Date/branch/officer filters implemented and locally tested | Authenticated UI E2E open |
| Official client/disbursement/payment sources and scheduled sync | No approved source URL/feed contract available; only two regression clients and one payment | External input needed |
| Escalation, legal, lawyer, write-off, deferral, disbursement | Existing code and prior log; final regression required | Verify |
| Private attachments, chat, announcements and team content | r3 publication/receipts/notes; r5 chat replay/scope, preferences/read and call authorization verified by SQL/local tests | Real Realtime/Storage/media/team E2E open |
| Dashboard, full report set, calculators and AI | AI edge function exists; real provider availability and scope require checks | Verify |
| Notifications, PWA, push | Payment notification trigger exists; shell-cache tests pass; VAPID backend not verified | Partial |
| Backup / Restore / Disaster Recovery | r4 Founder-only 32-table consistent operational archive, encrypted file validation; local financial restore removed | Full DB/Auth/Storage recovery blocked on access and drill |
| Usage policy and session audit | r4 immutable versioned consent; server-stamped unique login/logout audit; rollback and local tests pass | Implemented; real auth E2E open |
| Training by actual role | Placeholder videos only; create final materials after UI stabilizes, without real client data | Open, follows stage 6 |
| Security | No missing-RLS advisor finding; four helper-function warnings need review; leaked-password protection disabled | Open |
| Stage 6 full-system E2E, volume, iPhone / Android / desktop | Official-volume dataset and missing real role accounts not available | Open |
| Stage 7 handover, backup and release record | Follow stage 6 and close its findings | Open |

Explicit exclusions from the update: do not add language switching; do not introduce a separate development/test deployment as a new scope item.

Data safety: preserve pre-existing working changes in Git stash `mf-nexa-preserve-local-20260916`; use rollback-only database regression checks; do not fabricate operational accounts, teams, portfolios or production records.

## Release r1 verification update

The table above records the initial acceptance gates. Location controls/persistence, classification replay, referenced imports/unmatched rematching, daily payment reports, payment/clients pagination and AI server-side scope now have implemented fixes and passing targeted checks. See `MF-NEXA_HANDOVER_20260916.md` for exact evidence and limits. Supabase additive migrations and AI version 4 are deployed. Frontend publication is tracked in the release commit and post-deployment verification.

Synthetic volume check: 1000 pending records and 1000 duplicate replays, rolled back. It does not establish official-file compatibility or performance on the user's real largest dataset. The four security-definer helper warnings were reviewed as active-user boolean authorization helpers; leaked-password protection remains disabled. No final closure percentage is assigned.

## Release r2 verification update

Atomic write-off/deferral approval and disbursement request guards are implemented and verified with rollback-only database checks. Frontend decision handling, confirmed operational writers, attachment persistence and saved deferral-date reload are implemented; 34 targeted behaviors and local desktop/mobile browser checks passed. Stage 6 real-account/device/official-data testing, full recovery, final videos and external daily feeds remain open. Baseline areas marked Verify in the initial table have not been declared complete by these targeted checks.

## Release r3 verification update

Client notes, explicit announcement publication/windows, branch/team scope, durable morning receipts and Team Spirit content are implemented. Database rollback checks and 22 targeted local checks passed, alongside all previous regression suites and local desktop/mobile browser fixtures. The private attachment opener and 30-second video validation are implemented; authenticated upload/access/device checks remain open. Initial table entries remain acceptance gates, not claims that the later fixes are absent. Full operational stage-6/7 closure is still not established.

## Release r4 verification update

Operational archive export is read from one database statement snapshot under an active-Founder check, then encrypted locally with a separate password (AES-GCM/PBKDF2). It contains 32 approved public tables and excludes Auth, file bytes, schema/functions/policies, cloud cache and external configuration. The bounded export rejects payloads over 20 MiB instead of silently truncating. File validation never applies financial state. Full recovery is still unavailable: no direct PostgreSQL/backup-management credentials or recovery tooling are configured in the available environment; access details were requested asynchronously.

Consent is versioned, immutable, audited and idempotent. Explicit UI login/logout events use a server-stamped JWT session id and unique event identity, without storing tokens. Database rollback tests and local encryption/persistence tests passed. Provider Auth logs remain the source for events outside these UI paths; real account end-to-end testing remains open.

## Release r5 verification update

Chat stable references, authoritative identity, room/attachment guards, paginated reload, Realtime deduplication and draft preservation are implemented. Notification settings and reads are DB-first; disabled-account policies cover these tables. Call state transitions and private-topic authorization are enforced in the database and requested by the UI. 23 local behaviors, rollback SQL and local browser checks pass. No live messages/calls were sent; real WebSocket, physical media, TURN, global private-channel configuration, missing official teams and authenticated device tests remain separate open gates. Morning content now follows its publication/scheduled day in Asia/Amman.


# 2026-09-16 — Report reconciliation, release r9

Continues r8 (65aeec58ce21471a6221585d6c4321edc12aee70); no schema changes, database writes, data imports, resets, deletions or history rewrites.

- Employee collection totals now exclude pending, unmatched, failed and deferral-fee entries, matching the daily report. A regression fixture reproduced 650 instead of 50 on r8; r9 returns 50.
- The paid-customer list is derived from loaded successful payment records, with current client balances; it no longer depends on a legacy local cache. Existing cache/history remains untouched. Counts are labelled payment transactions, not full installments, because partial payments are included. Reloading authoritative payments refreshes that list.
- Assigned employee IDs take precedence over matching names, and payment employee IDs take precedence over current portfolio assignment. Dashboard headline totals come from scoped records directly, including unassigned clients without summing overlapping employee portfolios; total collection is labelled all days.
- Late report uses the same positive-arrears, 30–60-day range as the existing Late counters. The broader overdue helper used elsewhere is preserved. Daily branch/employee sums accept numeric strings without concatenating them.
- 26 focused report checks plus existing local suites pass. Local browser fixtures at 1366 and 390 pixels verify daily report/paid list totals, Late/Due counts, old-cache isolation, logout, messaging, backup controls and location controls with database requests blocked. Read-only anonymous checks on 14 tables expose no rows.
- Current read-only database baseline: 2 clients, 1 successful partial payment totaling 50 JOD dated 2026-09-14, 2 follow-ups, 0 promises, Late 2, Due 1, arrears 200 JOD. These are NOT confirmed as the official complete dataset: the user clarified that all MF-NEXA project conversations/files are the references, prioritizing the latest settings task; no additional official production feed was established by the inspected references. Test fixture values mirror these aggregates without publishing customer identities.
- Official dataset reconciliation, authenticated multi-role/device E2E, source feeds, full disaster recovery and other previously open acceptance gates remain open. Publication and final data fingerprints are verified separately in this task's delivery evidence.

Reference reconciliation for r9: reviewed the latest messages and saved release evidence from «المرحلة-5 تكملة الاعدادات16-09-2026» (highest priority), the local transcript for «أصلح أمان MF-NEXA وانشره» after the app reader failed, «تحية عربية», relevant recent decisions in «تكملة التطبيق», «الملف الرئيسي» and its existing master text, and «Deployment Completion Watch». These confirm the r8 continuation, fixed employee IDs, Late 30–60, daily branch/employee reports, and outstanding real-role/device/source/DR acceptance gates. No older claim of completion overrides executable evidence. Full historic conversations were not exhaustively re-audited.


## 2026-09-17 — R8 continuation, release r10

Continues verified main ec0ee0a (r9). Complete follow-up cursor loading, fail-closed bootstrap, session-generation checks and chat subscription invalidation are implemented. 254 local behavior checks, public-shell checks and desktop/mobile browser fixtures pass; live anonymous checks on 14 tables expose no rows. No database writes or Base44 use. Phase 5 remains OPEN. See [the detailed audit and external closure gates](MF-NEXA_R8_CONTINUATION_20260917.md). Deployment and data-preservation verification are recorded separately in delivery evidence.
