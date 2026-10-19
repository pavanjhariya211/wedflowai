# Wedflow

An India-first, mobile-only wedding timeline orchestrator for couples and families.
Built with Expo SDK 58, React Native, TypeScript, Expo Router and Supabase.

## Current milestone

Phase 1 implements account registration, email/password sign-in, verification links,
password recovery, secure native session persistence and protected navigation.
The Home/Timeline/Tasks/Shopping/Family navigation is a labelled shell; wedding
planning functionality is **not implemented**. See [progress](docs/progress.md)
for verification results and remaining setup.

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

No custom SQL migration is needed for managed Supabase Auth in Phase 1. Domain
schema and RLS migrations are deferred to Phase 2. Do not create unprotected
application tables manually.

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

## Checks

```sh
npm run check
npm run export:android
npm run export:ios
# While Metro is running on port 8081:
npm run smoke:metro
```

Unit/component tests isolate external services; they are **not** proof of live
Supabase delivery or native device operation. Native exports verify bundle
compilation, not APK signing or installation. See [device checks](docs/device-testing.md).

## Android build for device testing

Expo Go can validate the initial screens when its SDK matches. For reliable custom
scheme email links, build an internal APK with your Expo account:

1. Choose a stable Android application ID and set `expo.android.package` in
   `app.json`; also choose `expo.ios.bundleIdentifier` before iOS builds.
2. Use `npx eas-cli login`, then `npx eas-cli build:configure` to associate your project.
3. Add the two **public** Supabase values to the EAS `preview` environment.
4. Run `npx eas-cli build --platform android --profile preview` and install the APK.
5. Allow its callback URL in the Supabase development project and follow the device checklist.

`eas.json` contains only an internal preview profile. No production build,
deployment, Expo account association, signing credentials or store publication
has been created by this milestone. EAS access/network destinations may need
allowlisting outside this cloud environment.

## Project layout

- `app/`: Expo Router screens and route protection
- `src/auth/`: authentication state, forms, service adapter, validation and links
- `src/components/`: accessible shared controls and explicit future-feature screens
- `src/config/`: validated public runtime configuration
- `src/lib/`: Supabase client and chunked secure session storage
- `tests/`: meaningful auth, input, storage and configuration checks
- `supabase/migrations/`: versioned database changes, beginning with Phase 2
- `docs/`: product baseline, architecture, decisions, roadmap and progress

Each major phase requires founder review before the next phase. Production
publication always requires explicit approval.
