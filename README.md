# Wedflow

An India-first, mobile-only wedding timeline orchestrator for couples and families.
Built with Expo SDK 58, React Native, TypeScript, Expo Router and Supabase.

## Current milestone

Phase 2 implements wedding creation/settings, single- or multi-day ceremonies,
shared or separate family workspaces, accepted invitations, workspace roles,
revocation, and explicit ceremony sharing/withdrawal with database-enforced access.
Task templates, planning tasks, shopping and AI remain future milestones.

**Try the flow:** sign in → Home → Create your wedding → Timeline → Add ceremony →
Family → Create invitation code. The recipient signs in with the invited email and
uses Home → Join with invitation code. Invitation creation does not send email.

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

The first upload was blocked by network policy (HTTP 403 at
`storage.googleapis.com`). Its allowlist change is saved for environment publication;
no build or APK exists yet. The local cloud Supabase URL must be the HTTPS project
origin, `https://kyoabyflvstsvvenmcot.supabase.co`; the saved runtime value was invalid
on October 23 and needs correction in environment settings. The EAS preview URL
has already been corrected, and its publishable key passed a real Auth check.

After a successful build, install the APK, allow its callback URL in Supabase and
follow the device checklist. iOS identifiers/signing remain unconfigured. No
production/store deployment is authorized.

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
