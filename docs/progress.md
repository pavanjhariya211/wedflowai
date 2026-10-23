# Progress

Updated: 19 October 2026. Phases 1–2 implemented; awaiting review before Phase 3.
Founder authorized moving into app development after cloud configuration.

## What works

- Expo SDK 58 / React Native / TypeScript app with protected account navigation,
  real Supabase email/password integration, PKCE recovery and secure sessions.
- Home: create/join/select weddings; edit name, main date, planning start, city,
  celebration format and optional explicitly shared wedding budget.
- Single- and multi-day celebrations; custom ceremony names, all-day or India-time
  events, optional venues, edit/delete and stale-edit protection.
- One shared workspace OR separate families plus a shared wedding overview.
- Family-admin invitations via securely generated, email-bound codes; explicit
  acceptance; seven-day expiry; invitation revocation and role management.
- Member removal/leaving, with protection against removing the last workspace admin.
- Private family ceremonies and canonical sharing/withdrawal with explicit user
  confirmation, database authorization, version checks and backend audit records.
- Session-scoped data refresh, permission/network error handling, stale-response
  rejection and clearing private records when access is lost on refresh.

Tasks, templates, dependency scheduling, shopping, financial records, notifications
and AI are still future phases. Those screens remain clearly labelled.

## Database and live service evidence

Administrative access to the selected development project returned HTTP 200 and
ACTIVE_HEALTHY. Its public schema was empty before implementation.

Three additive, versioned migrations are applied. Tables have RLS; app roles have
read-only table grants and execute-only access to validated transactional RPCs.
The migration runner records checksums, refuses drift and safely skips repeated
applications. No production app release or store deployment was performed.

`python scripts/database.py --test` passed before and after migration application.
All synthetic SQL users/weddings are inside a transaction and rolled back. Tests
exercise authenticated/anonymous roles, cross-family and unrelated-wedding reads,
view-only permissions, direct write denial, stale versions, pre-acceptance access,
wrong-email/revoked/expired invitations, retained admin roles, removal/last-admin
checks, private audit data and canonical sharing/withdrawal.

`python scripts/smoke-wedding-api.py` passed against the hosted project using real
signed-in temporary Auth users and publishable-key app requests. It verifies:

- Actual password sign-in and wedding/ceremony persistence.
- No access before accepting an invitation.
- Correct family-admin bootstrap and invitation acceptance.
- Cross-family private read/write denial, including wedding-admin boundaries.
- Explicit sharing preserves the ceremony ID; withdrawal restores isolation.
- Anonymous access is denied.

Temporary hosted wedding records and Auth users were removed after the run. The
cloud token/server key stayed out of app code, logs and repository files.

## Automated app checks

- `npm run typecheck`: passed.
- `npm run lint`: passed without warnings.
- `npm test`: **87 passed, 13 suites; no skipped tests**.
- Unit/component tests cover validation, money/date/time handling, real form error
  and success paths, role-specific controls, auth/session safety, data invalidation
  and out-of-order responses. Their service/native dependencies are explicitly
  isolated; hosted API and database tests provide separate integration evidence.
- Android and iOS exports passed; final exports include ceremony sharing changes.
- Original PRD/discovery DOCX checksums still match the uploads.

## Remaining acceptance and limitations

- Physical Android/iOS rendering, OS keychain lifecycle and real email delivery
  still require device acceptance. Hosted sign-in used administratively confirmed
  temporary accounts; it does not establish SMTP delivery or native link routing.
- Expo project association and Android signing are configured. The internal Android APK build has finished successfully.
  Device acceptance remains pending. No local Codex is needed.
- The five tabs are not a complete MVP. Timeline currently presents ceremonies;
  the planning-task timeline and templates are Phase 3.
- Workspace mode migration, wedding-admin transfer, offline writes, account/data
  deletion and export are not implemented. Expense privacy belongs to Phase 4.
- Activity records exist with scope-aware authorization; richer history UI and
  detailed task old/new-value history follow with tasks.

## Next recommended phase

Phase 3: optional planning templates, custom categories/tasks, ownership and
collaboration, recurrence, master/ceremony task views and task history. Review the
current milestone and obtain founder approval before starting that major phase.

## October 23: Android build preparation

Expo token authentication passed with owner access. Linked the existing team project
`wedflow-ai`, set Android ID `com.wedflowai.app`, generated an Expo-managed keystore,
and configured EAS preview public Supabase variables. The publishable key passed
hosted Auth verification. Corrected the remote URL; the cloud runtime URL remains
invalid and requires correction in settings. Upload failed HTTP 403 at
`storage.googleapis.com`; a narrow allowlist draft is saved but requires publication.
No EAS build job or APK was produced. TypeScript, lint and all 87 tests passed.

## October 23: settings verified and APK build started

Cloud runtime Supabase URL is now correct. `npm run check:supabase` passes against
hosted Auth. Upload to EAS succeeded after publishing network access. Build
`4d72654f-c4e4-4e13-a8b1-c3764ac21143` finished successfully at 16:34 IST.
APK: https://expo.dev/artifacts/eas/iYbtkxRGf0VhX2zDiNpcMyT3_BLxhLn8NO87TzF8x-M.apk
Added `wedflow://auth/callback` to the Supabase development Auth redirect allowlist,
preserving existing entries. No email was sent; actual native links need device testing.

Android packaging succeeded; installation, rendering, email delivery and native callback
routing remain pending physical-device acceptance. No IPA, Netlify website or
production/store deployment was produced.
