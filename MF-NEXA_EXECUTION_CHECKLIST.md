# MF-NEXA execution register — 2026-09-16

Sources: 2026-09-14 unified master (local extracted reference), all six pages of the 2026-09-16 Arabic update, current main branch and live Supabase inspection. No completion percentage is claimed.

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
| Private attachments, chat, announcements and team content | r3 scoped publication/receipts, notes and active-account Storage policy verified; chat/device media E2E remains | Partial |
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
