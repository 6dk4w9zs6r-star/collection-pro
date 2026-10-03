# MF-NEXA isolated UAT — 2026-10-03

- New Supabase project: MF-NEXA-UAT / usxhunxwanwuigaoajlj, organization pfhmprdgfkguyzlpnvtj, ap-northeast-2, ACTIVE_HEALTHY. Connector quoted 0 USD/month and cost confirmation was obtained before creation.
- Read-only catalog extraction from MD-COLLECTION; no customer, employee, consent, account or storage-file rows copied. Baseline: 36 application tables, 6 security-invoker views, 52 functions, existing constraints/triggers/policies/grants. Private attachment bucket and three existing Realtime tables configured.
- Applied isolated migrations: uat_schema_only_baseline, uat_storage_and_realtime, uat_financial_hardening. Archive source identifies the isolated project. Audit role policies copied unchanged.
- limited-client-search deployed to isolated project, version 1, verify_jwt=true. Caller JWT and invoker/RLS search; no service-role search.
- Synthetic Founder, ALS and LO test identities created. Passwords remain ephemeral; no plaintext credentials file was saved. Two clearly labelled synthetic clients and one reversed synthetic payment remain for test evidence.
- Live SQL transaction passed: payment posting/replay, backend PTP, approval numbering, exact reversal/replay, original preserved, audit exactly once, immutable amount, required reason, field atomic save/overpayment rollback, LO import/match/reversal denial, manual R-O denial, LO and ALS scoped search, anon RPC denial. Transaction fixtures rolled back.
- Real simultaneous reversal requests: one duplicate=false and one duplicate=true; compensation_count=1, audit_count=1, balance=200.00, original_status=reversed.
- 16 local suites passed after frontend rebinding; index.html/app.html identical. Business logic, SW/session, calculator and Audit role policy unchanged by this continuation.
- Security advisor: three INFO notices for deliberately inaccessible private ledger tables without policies; four WARN notices for existing authenticated definer authorization/admin functions. These require review, not a claim of zero warnings. https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable

## Still incomplete

- Hosted private UAT Site has NOT been redeployed. Automatic approval rejected the required workflow stdin operation: approval required, sandbox_approval disabled. Existing hosted page therefore still uses its old source/backend. Do not test writes through that old URL.
- Auth password/Edge/REST end-to-end tests could not receive ephemeral credentials: same stdin policy rejection. No success claimed. Owner can provision/reset a test password in the isolated dashboard; no Production password needed.
- Plaintext password-file write was separately rejected by automatic approval review as unnecessary credential exposure; file was not created.
- Browser launch previously blocked by spawn EPERM. Real GPS/device save, iOS icon/install/offline/SW/session refresh and two-device communications remain untested.
- Smart Assistant shared backend inspection found active-profile authentication but no Founder-only/smart_assistant_enabled enforcement. Original request was verification only. It was not changed or deployed to isolated UAT; provider secrets were not copied.
- R-O automatic ingestion remains unconfigured; no connector invented. External payment connector remains unconfigured.
- MD-COLLECTION/Production and repository main were not modified. No Release.
