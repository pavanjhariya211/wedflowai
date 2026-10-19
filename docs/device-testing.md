# Phase 1 device acceptance checklist

Status: manual tests pending configured provider and a physical device/emulator.
Automated tests use explicitly mocked responses and do not replace this list.

## Prerequisites

Configure a Supabase development project per README, including email delivery and
native redirect allowlist. Use your own test account; do not put passwords in Git
or chat. Start Expo or install an internal APK. Keep app links on the requesting
device; PKCE confirmation on another browser/device cannot use the saved verifier.

## Cases

1. Start without either public variable: setup screen, no simulated login.
2. Configure both variables and restart Metro: sign-in form appears.
3. Enter invalid email/mismatched short passwords: inline errors; no request.
4. Register a new test email: neutral check-email notice. Verify email delivery
   separately; open latest confirmation link on the same device.
5. Sign out; try an incorrect password: error, no access to Home.
6. Sign in correctly: Home identifies the account; other tabs label future work.
7. Close and reopen app: session restores; background/foreground refresh works.
8. Sign out; reopen: protected tabs are inaccessible, sign-in returns.
9. Request password recovery: neutral notice; open latest email on same device;
   set a new matching password; confirm subsequent sign-in with new credentials.
10. Try expired/reused/malformed confirmation links: retry guidance, no fake success.
11. Disconnect network during sign-in/reset: actionable error, re-enable and retry.
12. Try double-tapping requests: one in-flight operation; controls disabled.
13. Check large text, keyboard visibility, screen-reader labels and 48+ point controls.
14. Repeat core cases on iOS before claiming native iOS validation.

Record device/OS, build, date, provider settings and actual outcomes without
passwords, tokens or complete callback URLs. Never report merely requested email
as delivered. Push notifications and planning features are outside Phase 1.
