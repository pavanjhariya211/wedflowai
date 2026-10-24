# Progress

Updated: 24 October 2026. Phases 1–2 and core Phase 3 planning implemented; the PRD remains incomplete.
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

Core custom tasks and reviewed starter templates are now implemented. Recurrence,
dependency scheduling, shopping, financial records, notifications and AI remain
incomplete. See the PRD gap audit.

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

## Next implementation work

Core Phase 3 task planning is implemented. Finish calendar, recurring/continuous
behaviours, collaborators/delegation and category management. Shopping/finance,
dependency approvals, notifications and AI remain separate major phases. Review
the PRD gap audit; do not treat the current task milestone as the complete PRD.

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

## October 24 — Netlify browser preview

Browser preview code is ready; no Netlify site has been published because no
account connection/token is available in this session. Added react-native-web,
platform auth storage/locking, browser confirmations and Netlify SPA routing.
Web and Android bundle exports pass. Browser smoke in local Chromium verifies
sign-in rendering, validation, simulated API failure UI, registration route reload,
390px layout, and invalid PKCE callback guidance with no runtime exceptions.
The smoke deliberately intercepts failed Auth responses; it does not establish
hosted browser sign-in or email delivery. Supabase SDK tests exercise S256 verifier
persistence and recovery through both native and browser adapters. Tests also
cover browser storage errors and confirmation cancellation. Netlify deployment,
exact web callback allowlisting and real account browser acceptance remain pending.
See README for one-time import and public variable setup; no secrets were committed.

Final web milestone checks: TypeScript, ESLint and **95 tests in 15 suites** pass.
Web and Android exports pass; final web output was regenerated after the last copy
change. A scan found no cloud Supabase access token or Expo token in the web output.

## October 24 — hosted email redirect corrected

Founder reported that verification redirected to localhost. Supabase Auth's default
site URL still used localhost, and the earlier hosted-site check aborted on a
network restriction before configuring the web callback. Updated the default
site URL to `https://wedflowai.netlify.app/auth/callback` and added that exact
redirect to the allowlist, preserving existing entries and the native callback.
Management API readback confirms both changes and email confirmation remains
enabled. Existing confirmed accounts can try signing in; otherwise request a
fresh verification link on the live origin in the same browser profile. Real
email delivery and successful browser code exchange remain user acceptance checks.

## October 24 — core task plan and master timeline

Founder reported the missing PRD planning flow. Implemented actual saved task
planning rather than treating placeholder tabs as a complete product. New wedding
setup now opens Tasks; existing Home pages link to planning and Timeline.

- Editable optional starter-plan preview; remove/rename/re-date suggestions before
  one atomic save; short-lead compression is visibly explained for review.
- Custom task/category/notes/priority, optional start/deadline, accepted primary
  owner, planning/confirmed date certainty and explicit owner/date edit consent.
- Personal-only and permitted family/shared scopes, no silent scope changes,
  multi-ceremony links, status filters/search/mine/overdue, completion/reopen and
  cancelled/archived history-preserving states.
- Master chronological task/ceremony timeline, ceremony filtering and scoped
  old/new task history. One task linked to several ceremonies stays one record.
- Additive development migration tested and applied; no pre-existing wedding or
  user data was populated or edited. Old Android APK does not contain these screens.

Verification: TypeScript and ESLint pass, **106 tests in 18 suites** pass, web and
Android exports pass. SQL/RLS fixtures passed transactionally before and after
migration, covering privacy, viewer/direct-write denial, history, version conflicts,
invalid owners/ceremony links, bulk atomicity and request retries. Chromium used a
real temporary confirmed Supabase account: browser sign-in → create wedding → Tasks
navigation → exclude one suggestion and rename another → save 13 tasks → reload →
complete/reopen → custom personal task → master timeline. Browser API requests
were forwarded through the cloud's Node HTTPS proxy to the real hosted backend;
responses were not mocked. No runtime exceptions occurred. Temporary wedding
records and the Auth account were removed afterward; no email was sent.

The local web export is verified. Netlify publication of the pushed commit is not
yet independently verified because this cloud's network blocks that hostname.
PRD remains incomplete: calendar, recurrence, collaborators/delegation, category
management, shopping/finance, dependencies/approvals, notifications, AI and launch
acceptance. See [gap audit](prd-gap-audit.md). Do not claim full Phase 3/P0 completion.

A second additive scope-compatibility migration preserves links when family
ceremonies are shared, and hides withdrawn private ceremony IDs from shared task
links for every reader. Multi-ceremony linkage and sharing/withdrawal tests pass.
The final Chromium check waited for the actual timeline panel and visually
confirmed that dated task cards render (not only that hidden DOM text exists).

## October 24 — guided intelligent planner

The founder approved building the guided intelligent planner. Delivered:

- New wedding setup opens guided intake automatically. Saved date/city/planning
  window are reused; one optional brief and optional booking choices replace
  mandatory task-by-task template editing.
- Rules select relevant tasks, order prerequisite decisions, allocate dates within
  the available window with suggested minimum lead times, flag infeasible short
  windows, preserve existing tasks/confirmed dates, and avoid duplicate sources.
- AI brief interpretation uses an authenticated Netlify function, strict schema,
  runtime validation, bounded input/output/time, no tools, no raw logs, and an
  atomic per-user/workspace-authorized quota. Source is honestly labelled, and
  model failures/missing settings fall back to rules. Empty briefs make no AI call.
- Compact proposal cards, optional adjustments and one Accept plan action persist
  all selected suggestions atomically. Dates/owners/sharing are explained before
  acceptance; high timing risks need acknowledgment. Home surfaces visible blocked,
  overdue, near-term and catalog-sequence issues; it does not silently reschedule.

Verification: TypeScript/ESLint, **116 Jest tests in 20 suites plus 6 Node function
contract tests**, web/Android exports and server-function esbuild bundling pass.
The quota migration and SQL role/scope/cooldown/daily-limit/privacy fixtures passed
before and after application. Chromium used a temporary real Supabase account:
create wedding → guided intake → “300 guests, venue booked, reception” → generate →
clearly labelled rules fallback → accept 14 tasks in one action → reload → complete/
reopen → private blocked task → rendered master timeline → Home attention card.
Real Auth/domain requests were forwarded to hosted Supabase through the cloud
proxy; only the unavailable AI endpoint was simulated. Temporary wedding and Auth
fixtures were removed; no email or model request was sent.

Live AI is not yet verified: this cloud session has no OpenAI key or Netlify account
connection. Netlify must have a server-only OPENAI_API_KEY and runtime access to
the two public Supabase variables. See README. Netlify live-origin function routing,
actual model output and deployed-origin acceptance remain pending. The previously
shared APK predates these screens. Shopping, calendar/recurrence, durable custom
dependencies/owner-approved rescheduling, notifications and broader AI remain gaps.

Generated preparation tasks also respect the actual date of saved family/shared
ceremonies; feasibility is checked against that event rather than only the main
wedding date. Shared ceremony links retain the existing scope compatibility rules.

## October 24 — Stitch UI implementation

Stitch key authentication succeeded via the MCP endpoint. Located the founder's
existing Wedflow Wedding Planner UI project and imported its dashboard, intake,
review, timeline and design-system exports as references. Implemented the design
in actual Expo/React Native components, preserving the working Supabase services.

- Bundled Playfair/Inter, forest/ivory tokens, reusable badges/chips/progress/sections,
  desktop rail and mobile tabs, and more compact accessible form primitives.
- Today dashboard: actual wedding countdown, visible event/task counts and progress,
  priority attention, next actions, ceremonies and contextual planning entry point.
  Administrative settings collapse out of the primary dashboard flow.
- Guided setup/review: saved context, booked-service chips, honest generation state,
  expandable category groups, visible assumptions/scope/source/risks and atomic
  acceptance. No fixed sample people, prices or vendor claims from the mockups.
- Master timeline: month sections, confirmed/suggested labels, actual monthly grid,
  month/day/ceremony filters, scoped task cards and links into role-checked editing.
- Existing task cards now progressively disclose details/history and retain real
  completion/reopening/version checks. No database/policy/schema changes.

The real temporary-account Chromium smoke passed at 1440px and 390px: sign-in,
wedding setup, grouped review expansion, actual atomic acceptance, completion/
reopening, month/date navigation, deep-link editing/cancel, dashboard, mobile
calendar, session reload, no page overflow, loaded brand fonts and no runtime
exceptions. Actual Auth/domain calls use hosted Supabase via the cloud proxy.
Temporary records/account were removed and no email was sent. Screenshots were
visually inspected. Source UI/component tests isolate native glyph/font loading;
browser/export tests use real assets.

Live endpoint checks: Netlify responds 200 and the function GET responds 405.
An authenticated fictional brief reached the deployed AI endpoint but returned
502 ai_unavailable; the UI used the explicit rules fallback. Live AI is therefore
not verified. Added safe provider-failure categories for diagnosis after redeploy.
No Stitch or server key was copied to Git/app code. The shared Android APK is still
from the older milestone and must not be described as containing this redesign.

Final UI milestone validation: TypeScript and ESLint pass without lint warnings;
118 Jest tests in 21 suites and 7 Node handler tests pass (125 total). Web and
Android exports and server-function esbuild bundling pass. Browser screenshots
were inspected at desktop and phone widths. No new APK or store release was made.
