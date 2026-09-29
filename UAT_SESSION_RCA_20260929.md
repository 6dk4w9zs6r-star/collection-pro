# Remembered-session refresh investigation — UAT only

Starting UAT commit: `2e1a61906b706420d44ec817665b29a66a7cf6e3`.
Read-only main reference: `bcbc861c4346f3feda1b5cb0f838e871bfdcb4d0`.

## Findings

- The original unconditional local sign-out on every page load explains a return to login while the remembered identifier remains. That implementation is still present in the inspected main source. Main was not modified.
- UAT already contains the previous fix (`46c8e7a`) and syntax correction (`2e1a619`). Its `secureInit` restores opted-in sessions using `getSession`, verifies the user using `getUser`, loads the approved profile, and calls `mfFinishAuthenticatedEntry`. It signs out on startup only when Remember Me is off.
- The three Supabase creation sites share the existing `cloud` client/loading promise. They do not set `persistSession:false` or supply a nonpersistent storage adapter. No evidence justified changing these options.
- The session observer invalidates the view on sign-out/account change. It does not discard a matching restored session on INITIAL_SESSION or TOKEN_REFRESHED.
- `index.html` and `app.html` are byte-identical. Neither application entry, the session module, nor the service worker was changed in this investigation: the reported remaining live defect was not reproduced against the current UAT source.
- GitHub returned no deployment records for `ref=uat`. The inspected latest GitHub Pages deployment is associated with `main`; this does not exclude an external UAT deployment.
- A previously saved private Site named MF-NEXA — UAT exists at `https://mf-nexa-uat-session.mashal-82.chatgpt.site`. Browser access reached its ChatGPT sign-in gate; authenticated app content and the Founder session were not verified. The user did not provide the specific failing UAT URL, so this Site cannot be assumed to be the failing target.

## Changes

- Added `scripts/test-session-restore.cjs`: exercises the actual shipped `secureInit`, `initRememberMe`, and authenticated-entry function across fresh contexts, with mocked auth/backend boundaries.
- Updated the stale login-path assertion in `scripts/test-session-update.cjs` to check delegation to the shared authenticated-entry function instead of expecting its old inline bootstrap/unlock implementation.

## Verification

- 11 restore checks passed: repeated page contexts with persisted opt-in, no opt-in, absent session, session error, revoked user, mismatched user, inactive profile, stale session epoch, bootstrap failure, and pending consent.
- 27 session-isolation checks passed.
- Public shell/privacy check passed: 35 HTML files, 82 inline scripts parsed, entry copies identical.
- Separate full-page JSDOM diagnostic with all six local external scripts and mocked Supabase restored the session and unlocked the page without errors. This was a local simulation, not a real browser refresh or real Supabase login.
- Existing recovery suite fails at its success-consent fixture (old policy version and absent persisted re-read); existing loading suite fails because its query mock has no `range` method. These files were unchanged and their failures are not reported as passes.
- Existing browser suite could not launch Edge (`spawn EPERM`).
- No database writes, auth configuration changes, or Production deployment occurred.

## Status / practical retest

Current UAT source passes the focused simulated restore checks. The remaining reported live defect's root cause is **not confirmed**. Deployment/source mismatch is a hypothesis, not a verified conclusion. No new runtime fix is claimed. Practical retest readiness of the deployed target is **unverified** until its exact URL/served source is matched to UAT and the real Founder login → Refresh → retained identity flow is exercised. Preserve main/Production unchanged.

