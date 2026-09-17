# R8 continuation audit — r10, 2026-09-17

Phase 5 remains OPEN. This record does not close the full-system acceptance gates.

## Verified starting point

GitHub main was read directly as `ec0ee0a198a055f339edfcd0f97f4eb74be9bb1a` (r9). The isolated working snapshot came from that exact Git object. The old project checkout and its untracked fix script were left untouched. No Base44 was used. No database writes, imports, migrations, resets or history rewrites were performed.

The referenced Base44-level-2 preview contains no detailed R8 checklist. A read_thread tool was unavailable in this task; the executable main source, its execution register/handover and the saved project work context were used. Historical conversation claims were not treated as current proof.

## Changes

- The initial client bootstrap now reads all scoped follow-ups with the existing validated ID cursor instead of a single capped request. A failed follow-up page rejects bootstrap; client/follow-up state is published only after both reads succeed. Pending-date selection includes records on later pages.
- Operational cursor reads capture a session generation as well as account identity, rejecting results from an invalidated session even if the same account signs in again. A failed current-session bootstrap locks and clears partial runtime state.
- Session invalidation explicitly stops and resets the chat subscription. Re-entry by the same account creates a fresh subscription; callbacks and subscription setup from earlier generations are ignored. This is verified with mocks, not real WebSocket delivery.
- Public release marker and service-worker shell version are r10. Existing unowned browser caches remain untouched and are not imported.

## Verification

- 254 local behavior/boundary checks pass, including 9 added checks (6 continuation cases and 3 session cases). AI/provider, database and Realtime interactions are mocked in these suites.
- 35 HTML entrypoints checked: 2 empty-data active shells and 33 legacy redirects; inline scripts parse.
- Local Edge browser fixtures pass at 1366 and 390 pixels, including report reconciliation, login lock, old-cache isolation, logout reset, messaging controls, backup controls and location controls. Database requests are blocked. These are not physical-device or authenticated-production tests.
- Live anonymous read-only REST checks at 2026-09-17 16:58 UTC expose no rows on 14 sensitive tables.
- Read-only security advisor inspection still reports four callable SECURITY DEFINER helpers and disabled leaked-password protection. Helper definitions were re-read; no blanket privilege changes were made. [Helper advisory](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [password protection guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- Deployment and before/after database fingerprints are separate delivery evidence. Passing local tests alone does not establish publication.

## Remaining closure gates

| Gate | Evidence required before closure |
|---|---|
| Real authentication and roles | Authorized real Founder/BM/LO/CFMP/ALS/Lawyer account tests, account switching, revocation and shared-browser reload; do not invent accounts |
| Full operational regression | Authenticated end-to-end client/payment/follow-up/promise, legal/escalation/write-off/deferral/disbursement and report reconciliation with approved records |
| Official sources and volume | Approved daily feed/file contract, authoritative dataset reconciliation, scheduled-sync checks and real maximum-volume testing |
| Realtime, attachments and calling | Authorized real user/team delivery and isolation; upload/access; global private-channel configuration, TURN and physical media |
| Devices and notifications | Physical iPhone/Android/desktop, GPS, saved-location sending, PWA install and actual push/VAPID delivery |
| Recovery | Full DB/Auth/Storage/config backup access and a documented recovery drill; the operational archive is not full DR |
| Security and legacy state | Resolve/accept remaining advisor items; ownership verification for old local-only data; historical public Git/cached data exposure remediation |
| AI provider and final handover | Actual scoped provider availability, final role training, stage-6 acceptance and stage-7 handover |

Further asynchronous application paths and actual cross-tab/account timing still require authenticated E2E. These targeted generation guards do not claim a comprehensive concurrency proof or transactional snapshot across multiple REST reads.

## r11 continuation — 2026-09-17

Continues main `59a8b979bbad193f76c3346d681acdbac901d135`. Generic paginated reads now reject missing identity or changed account/session generation before returning rows. Delayed GPS capture binds its originating identity and checks the generation before the database write and before updating local state. A completed write from an invalidated session is not inserted into the next session's view; no completed server write is undone or automatically retried.

Seven new mocked regressions cover account/generation changes while reading, anonymous read rejection, GPS callback/connection/response invalidation and successful GPS persistence. The regression suite totals 261 local behavior checks. The new stale-page test failed against r10 before the fix. No real GPS, operational database write or message was performed. Existing external acceptance gates remain open; Phase 5 is not closed. Local browser and publication evidence are in the task's r11 verification output.
