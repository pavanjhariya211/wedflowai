# Progress

Updated: 19 October 2026. Active milestone: Phase 1 — mobile account foundation.
Founder approved Phase 1 and original document upload. Phase 2 is not authorized yet.

## Implemented

- Expo SDK 58 / React Native 0.88 / React 19.3 / TypeScript foundation.
- Expo Router protected routes and five-tab mobile navigation shell.
- Supabase email/password registration and sign-in, resend verification, password
  reset and update, current-device sign-out and session lifecycle subscription.
- PKCE native callback exchange, recovery routing, safe error messages, input
  validation, duplicate-request guards and loading/failure states.
- Expo SecureStore sessions split into bounded ASCII chunks, serialized writes,
  rollback on failed replacement and old-session cleanup.
- Expo Crypto bridge for secure randomness and S256 PKCE when WebCrypto is missing;
  bundle configuration rejects non-publishable Supabase keys before inlining.
- Configurable setup screen when provider settings are absent; no simulated login.
- Original PRD/discovery DOCX files, SHA-256 integrity record and consolidated docs.
- Automated CI definition and internal Android APK build profile; neither implies
  a hosted CI pass, generated APK, account linking or production deployment.

## Verification

- Clean locked dependency reinstall: `npm ci` passed (1,362 packages).
- `npm run typecheck`: passed.
- `npm run lint`: passed without warnings.
- `npm test`: **53 passed, 9 suites; no skipped tests**.
- Tests cover validation, configuration, safe error mapping, secure storage failure
  and concurrency, session restore/revocation races, recovery/refresh lifecycle,
  form outcomes and the real installed Supabase SDK's S256/verifier contract with
  isolated HTTP and native-crypto bindings.
- Final Android and iOS exports: passed after the native crypto/security changes.
- Final Metro startup and `npm run smoke:metro`: passed; Android manifest and
  compiled development bundle returned HTTP 200 with the expected app module.
- Original DOCX bytes match upload checksums.

Unit/component/SDK contract tests isolate external services. They do not establish
live email delivery, hosted sign-in or OS keychain behaviour. Exports verify native
bundle compilation, not installed app rendering or signed APK/IPA generation.

## External prerequisites still pending

Reusable install_script and start_skill were saved in the cloud configuration
draft; saving does not apply runtime variables or publish the environment.
The draft declares EXPO_PUBLIC_SUPABASE_URL and
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY. At the last runtime check, neither value was
present in this machine. Founder indicated they will configure environment settings.

After values are saved/applied:

1. Recheck presence without displaying values and permit the exact Supabase host
   in restricted network settings.
2. Restart Metro; verify provider configuration and the auth endpoint.
3. Configure development email delivery, confirmation and native callback allowlist.
4. Complete docs/device-testing.md on Android (and iOS before native iOS claims).

No Supabase project administration, email-provider configuration, test account,
Expo/EAS account association, signing identity or physical device is available to
this task. No domain tables or RLS policies have been deployed. Phase 1 is therefore
**implemented with local automated verification; live/device acceptance remains open**.

## Next review

Finish live authentication/device acceptance, then request founder approval for
Phase 2: wedding creation, ceremonies, both workspace modes, invitations and RLS.
No wedding/task/shopping functionality is claimed complete. No production release.
