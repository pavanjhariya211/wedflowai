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

## Phase 2 acceptance on device

The hosted database/API checks already pass; native interaction remains unverified.
Use the Expo Go/development build workflow in README. A signed internal APK needs
an Expo/EAS account connection; no local Codex installation is needed for coding.

1. Sign in → Home → Create your wedding. Enter a name, DD/MM/YYYY dates and optional
   city/budget; select shared or separate families. Submit and reopen the app;
   confirm the persisted workspace is restored.
2. Create a single-day celebration with several events, then a multi-day example.
   No religious/ceremony defaults should be forced.
3. Timeline → Add ceremony: choose shared or a permitted family scope. Try all-day
   and timed events, cross-midnight India dates and invalid end times.
4. Edit a ceremony and confirm persistence. Edit the same record from another
   device; the stale version must request refresh rather than overwrite changes.
5. Family → Create invitation code for another consenting tester's email. Use
   Share explicitly. No email/SMS/WhatsApp delivery is implied by code creation.
6. Tester signs in with that email → Home → Join with invitation code → Accept.
   They should gain only the assigned role/scope; a different email must fail.
7. In separate mode, the second-family admin must not see the first family's
   private ceremonies or private audit rows. The wedding creator must likewise
   not bypass the second family's privacy.
8. Share a family ceremony after confirmation: both families see the same record
   and date. Withdraw sharing into an authorized family: the other family's API
   view loses access. Try unauthorized sharing/withdrawal and stale versions.
9. Invite a viewer: no ceremony edit controls; backend mutation attempts denied.
   Revoke an unused invite; expired/revoked codes must fail to join.
10. Remove a member, refresh/foreground their device and confirm access disappears.
    Prevent the last workspace admin from leaving or being demoted.
11. Change the wedding date: review/confirm the new anchor; ceremony dates must
    remain explicitly controlled rather than silently shifted.
12. Try network failure during creation and retry. The same creation request ID
    must not produce duplicate wedding workspaces.

Record outcomes, device/OS and build without passwords, invite codes or tokens.
