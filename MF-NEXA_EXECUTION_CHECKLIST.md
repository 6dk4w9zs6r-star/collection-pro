# MF-NEXA execution register — 2026-09-16

Sources: 2026-09-14 unified master (local extracted reference), all six pages of the 2026-09-16 Arabic update, current main branch and live Supabase inspection. No completion percentage is claimed.

| Requirement | Verified evidence / next acceptance gate | Status |
|---|---|---|
| Preserve identity, layout, Light/Dark and established functions | Additive fixes only; final visual regression required | In progress |
| Authentication, hierarchy, roles and employee IDs | Existing Founder/BM/LO accounts; no active CFMP/ALS/Lawyer accounts | Real-role E2E partly blocked |
| Client page, search, contact, voice search | Present; final authenticated browser checks required | Verify |
| Late / Rawan partial and zero-balance rules | 18 local boundary cases passed | DB and UI regression required |
| Payments, before/after, fees, classification | Existing posting triggers; classification replay identified | Fix in progress |
| Promises / follow-ups | 27 local persistence behavior tests passed | Published E2E required |
| Visits / GPS / locations | Atomic visit RPC exists; local checks passed | Live rollback test required |
| Open AND send saved client/guarantor location | New upstream replaced send button; restore both, validate coordinates, require persisted location | Fix in progress |
| Import, unmatched preservation, deduplication | Current import discards unmatched and lacks stable references | Fix in progress |
| Daily payment report, branch then employee, explicit date | Current reports contain history without required daily hierarchy | Fix in progress |
| Official client/disbursement/payment sources and scheduled sync | No approved source URL/feed contract available; only two regression clients and one payment | External input needed |
| Escalation, legal, lawyer, write-off, deferral, disbursement | Existing code and prior log; final regression required | Verify |
| Private attachments, chat, announcements and team content | Private storage reported in previous audit; verify UI upload/access | Verify |
| Dashboard, full report set, calculators and AI | AI edge function exists; real provider availability and scope require checks | Verify |
| Notifications, PWA, push | Payment notification trigger exists; shell-cache tests pass; VAPID backend not verified | Partial |
| Backup / Restore / Disaster Recovery | Must remain separate from operational import; full restore drill not evidenced | Open |
| Training by actual role | Placeholder videos only; create final materials after UI stabilizes, without real client data | Open, follows stage 6 |
| Security | No missing-RLS advisor finding; four helper-function warnings need review; leaked-password protection disabled | Open |
| Stage 6 full-system E2E, volume, iPhone / Android / desktop | Official-volume dataset and missing real role accounts not available | Open |
| Stage 7 handover, backup and release record | Follow stage 6 and close its findings | Open |

Explicit exclusions from the update: do not add language switching; do not introduce a separate development/test deployment as a new scope item.

Data safety: preserve pre-existing working changes in Git stash `mf-nexa-preserve-local-20260916`; use rollback-only database regression checks; do not fabricate operational accounts, teams, portfolios or production records.

## Release r1 verification update

The table above records the initial acceptance gates. Location controls/persistence, classification replay, referenced imports/unmatched rematching, daily payment reports, payment/clients pagination and AI server-side scope now have implemented fixes and passing targeted checks. See `MF-NEXA_HANDOVER_20260916.md` for exact evidence and limits. Supabase additive migrations and AI version 4 are deployed. Frontend publication is tracked in the release commit and post-deployment verification.

Synthetic volume check: 1000 pending records and 1000 duplicate replays, rolled back. It does not establish official-file compatibility or performance on the user's real largest dataset. The four security-definer helper warnings were reviewed as active-user boolean authorization helpers; leaked-password protection remains disabled. No final closure percentage is assigned.
