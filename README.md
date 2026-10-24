# Wedflow

An India-first mobile and browser wedding timeline orchestrator for couples and families.
Built with Expo SDK 58, React Native, TypeScript, Expo Router and Supabase.

## Current milestone

The app now includes the Phase 2 wedding/family/ceremony foundation and the core
Phase 3 task plan: custom tasks, optional reviewed templates, primary owners,
private/family/shared scope, editable dates/statuses, history and a master list
timeline. **It is not the complete PRD.** See the [gap audit](docs/prd-gap-audit.md).

**Try the flow:** sign in → create a wedding → describe the plan in one short
brief (optional) → Generate my timeline → review assumptions and dates → Accept
plan. Existing weddings use Tasks → Generate my guided timeline. Per-task editing
is optional. Home highlights visible blocked/overdue/near-term tasks and sequence
risks; it does not silently move deadlines or assign relatives.

The planner uses deterministic prerequisite sequencing, minimum suggested lead
times and the available India-date planning window. It adapts to explicit booking
status, guest estimate, travel and named functions, preserves existing tasks and
flags infeasible short windows. AI can interpret the brief on the server, but
live AI is not yet verified. A clearly labelled rules-based fallback works without
an AI key. Shopping, full dependency/rescheduling workflows, recurrence and push
remain incomplete.

See [progress](docs/progress.md) for checks and limitations and
[device testing](docs/device-testing.md) for the acceptance checklist.

## Product sources

The original files are preserved unchanged in [docs/product](docs/product):

- [PRD v1.0](docs/product/India_Wedding_Timeline_Orchestrator_PRD_v1.0.docx)
- [Product Discovery v0.2](docs/product/India_AI_Wedding_Timeline_Orchestrator_Product_Discovery_v0.2.docx)

The founder's latest instructions take precedence over the PRD, which takes
precedence over discovery hypotheses. See [requirements](docs/requirements.md).

## Local development

1. Install Node.js 24 LTS (24.19.0 used here) and npm.
2. Run `npm ci` in this directory.
3. Copy `.env.example` to `.env` and enter your **development** Supabase project URL
   and **publishable** client key. Never use a service-role or `sb_secret_` key.
4. Run `npm start`. Restart Expo after changing public variables.
5. Scan the QR code with a matching Expo Go version on Android. Use the same Wi-Fi
   network; local USB/emulator development is another option.

Without Supabase configuration the app displays an honest setup screen. It does
not simulate successful authentication. The client key is public by design;
row-level security must protect future application tables.

### Supabase Auth setup

In the **development project** dashboard:

- Enable email/password sign-in and email confirmation.
- Set the password minimum to at least 12 characters to match the app.
- Under URL configuration, allow `wedflow://auth/callback` for native builds.
- For Expo Go, also allow the **exact** Metro development redirect for your
  machine, typically `exp://<your-lan-ip>:8081/--/auth/callback`. Use an appropriate
  development-only wildcard only if necessary; never carry it into production.
- Keep the standard confirmation/recovery email templates' `ConfirmationURL`
  link. PKCE redirects return a `code`; do not replace them with bearer-token links.
- Open confirmation and recovery links on the same device that requested them:
  the PKCE verifier is stored securely there. Request a fresh link if it expires.
- Configure an email provider/authorized recipients for testing. Supabase's default
  email service may limit delivery to project-team addresses and has rate limits.
  Do not interpret a neutral UI response as proof an email was delivered.

Three versioned development migrations are applied to the configured project.
Writes go through validated transactional RPCs; reads use RLS. See
[database schema](docs/database-schema.md). Do not create unprotected application
tables manually or use the administrative token inside the mobile app.

### Cloud configuration

Set these environment variables in environment settings, then restart Metro:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Allow your exact Supabase project hostname in restricted network settings. Do not
put public client configuration into a proxy-only secret binding. Never put admin
keys, OpenAI keys, passwords, or live tokens in Git, chat or `EXPO_PUBLIC_*` values.
This cloud machine uses `npm_config_cache=/workspace/.npm-cache` because its default
npm cache path is not writable. `EXPO_OFFLINE=1` uses installed Expo metadata when
Expo's optional online checks are blocked; it does not disable TLS or integrity checks.
`DOTSLASH_CACHE=/workspace/.cache/dotslash` keeps optional React Native DevTools
artifacts in a writable cache.

## Development database checks

All development can run in this cloud workspace. Supabase administration uses the
secure `SUPABASE_ACCESS_TOKEN` binding; browser OAuth/local Codex are unnecessary.
The supplied helpers are pinned to the selected development project. Never run
them against a production project.

```sh
# Test migration changes and RLS fixtures in a rolled-back transaction:
python scripts/database.py --test
# Apply reviewed development migrations with checksum tracking:
python scripts/database.py --apply
# Real signed-in API checks, with temporary accounts/data and cleanup:
python scripts/smoke-wedding-api.py
```

The API smoke helper fetches a server key only into process memory to create and
remove temporary confirmed Auth users. App requests use their real JWTs and the
publishable key. It never stores/prints credentials and sends no email. It is a
controlled development test, not an app dependency or a production health probe.
Do not run live database tests automatically for untrusted pull requests.

## Checks

```sh
npm run check
# With the two Supabase values configured (read-only live-provider check):
npm run check:supabase
npm run export:android
npm run export:ios
# While Metro is running on port 8081:
npm run smoke:metro
```

Unit/component tests isolate external services. The separate hosted API smoke
verifies real sign-in and domain operations; neither proves email delivery or
native device operation. Native exports verify bundle
compilation, not APK signing or installation. See [device checks](docs/device-testing.md).

## Android build for device testing

Expo Go can validate the initial screens when its SDK matches. For reliable custom
scheme email links, build an internal APK with your Expo account:

The app is linked to `@pavanjhariya211s-team/wedflow-ai` (project
`27914ae3-994f-40c7-aba8-8369b6eea723`) with Android ID `com.wedflowai.app`.
Expo manages the generated Android keystore. The EAS `preview` environment has
both public Supabase values; admin credentials are excluded.

With `EXPO_TOKEN` configured securely in this cloud environment:

```sh
npm_config_cache=/workspace/.npm-cache npx --yes eas-cli@25.3.0 whoami
npm_config_cache=/workspace/.npm-cache npx --yes eas-cli@25.3.0 build --platform android --profile preview --non-interactive
```

The cloud upload allowlist and Supabase runtime URL are now corrected. The
publishable key passed a real Auth settings check. Supabase allows
`wedflow://auth/callback` for native email confirmation and password recovery;
actual delivery and link routing still require device testing.

Android preview build (finished successfully on October 23):
https://expo.dev/accounts/pavanjhariya211s-team/projects/wedflow-ai/builds/4d72654f-c4e4-4e13-a8b1-c3764ac21143

[Download the Android APK](https://expo.dev/artifacts/eas/iYbtkxRGf0VhX2zDiNpcMyT3_BLxhLn8NO87TzF8x-M.apk). Install it and follow the device checklist.
iOS identifiers/signing remain unconfigured. No production/store deployment is
authorized.

## Project layout

- `app/`: Expo Router screens and route protection
- `src/auth/`: authentication state, forms, service adapter, validation and links
- `src/components/`: accessible shared controls and explicit future-feature screens
- `src/config/`: validated public runtime configuration
- `src/lib/`: Supabase client and chunked secure session storage
- `tests/`: meaningful auth, input, storage and configuration checks
- `supabase/migrations/`: applied versioned domain schema and authorization changes
- `docs/`: product baseline, architecture, decisions, roadmap and progress

Each major phase requires founder review before the next phase. Production
publication always requires explicit approval.

## Browser preview on Netlify

Browser support was added on October 24 for the current Phase 1–2 app. This does
not implement the future tasks, shopping, finance or AI phases.

1. In [Netlify](https://app.netlify.com/start), choose **Add new project → Import an
   existing project → GitHub**. Authorize access to `pavanjhariya211/wedflowai` and
   select that repository and branch `main`.
2. Keep the base directory at the repository root. `netlify.toml` sets build command
   `npm run export:web`, publish directory `dist`, and Node 24.19.0.
3. Before deploying, add `EXPO_PUBLIC_SUPABASE_URL` with value
   `https://kyoabyflvstsvvenmcot.supabase.co` and
   `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` with the same publishable client key used
   by the app. Set them for the site's build context. These public values are
   embedded at build time; changing them requires a new build. Netlify builds
   refuse missing values. Never add Supabase admin/service keys, Expo tokens or
   Netlify tokens to the web environment.
4. Deploy the browser testing site. Netlify provides an HTTPS `*.netlify.app` URL.
5. Add that site's exact `https://<site>.netlify.app/auth/callback` to Supabase
   Authentication → URL Configuration → Redirect URLs, preserving the Android
   callback and other existing entries. Share the site URL with the cloud agent
   if you want it configured here. No wildcard is needed.
6. Sign in on the site, then run [device/browser acceptance](docs/device-testing.md).
   Registration/recovery links must open in the same browser profile and origin
   where requested, so that the PKCE verifier can be found.

The founder deployed the browser preview at https://wedflowai.netlify.app.
Its exact Auth callback and the Supabase default redirect now point to
`https://wedflowai.netlify.app/auth/callback` (verified by configuration readback).
No Netlify account connection/token was available during implementation;
the site was imported and published by the founder. Existing Expo/EAS environment variables are
separate from Netlify settings. Repository import requires account authorization
in your Netlify browser session; no local Codex installation is required.

For local web compilation, with the two public variables set:

```sh
npm ci
npm run export:web
```

The browser stores sessions in origin-scoped localStorage and uses Web Locks to
coordinate refresh between tabs. This is browser storage, not native SecureStore;
sign out on shared computers. Android/iOS continue using the chunked OS keystore
adapter. Netlify serves only `dist`, with an SPA fallback for direct routes and
PKCE callbacks; private wedding data is fetched after sign-in and is not exported
as static pages. Browser confirmations gate changes in visibility and membership.

## Enable server-side AI brief interpretation on Netlify

The authenticated function is `/.netlify/functions/plan-intake`, bundled by Netlify
with esbuild. No Netlify token or OpenAI key is available to this cloud session,
so account settings and real OpenAI output have not been verified here.

In the Netlify project's environment variables:

- Add `OPENAI_API_KEY` with **Functions** scope only. Do not use an `EXPO_PUBLIC_`
  prefix, place it in app code/Git, or paste the key into chat.
- Optional `OPENAI_MODEL` (Functions scope); default is `gpt-4.1-mini`.
- Ensure the existing two public Supabase variables are available in **Builds and
  Functions**. They remain publishable client configuration; no service key is used.
- Redeploy, then test a brief. A successful model response is labelled
  **AI-interpreted brief · dates calculated by planning rules**. Missing settings,
  provider failure, timeout, refusal or invalid output yield an explicit rules fallback.

Only the explicitly submitted brief is sent to OpenAI; saved family tasks,
financial records, member lists and sessions are not included. The UI explains
this before Generate and permits opting out. Responses use strict JSON schema
plus runtime validation and `store: false`. That setting is not a promise of zero
provider retention. The model cannot choose dates, owners or mutate the database.

The endpoint verifies the Supabase session and workspace editing authority,
reserves an atomic quota (one attempt per 30 seconds, at most 20 in a rolling
24 hours per user), limits input/output and provider time, and never logs brief or
credential bodies. The quota table stores only user ID/time and prunes that user's
old counters on their next request. Model output is only a preview until accepted.

`npm run check` includes Node handler tests with simulated providers. The web/native
exports and temporary-account browser smoke establish the rules-based path;
production-origin function routing and actual OpenAI delivery still need live acceptance.
