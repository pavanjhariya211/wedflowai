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

## Netlify browser acceptance

Use the final HTTPS Netlify site after adding its exact Auth callback. Browser
sessions persist in localStorage, not the OS keystore. Sign out on shared devices.

1. Open the site in desktop and mobile browsers: sign-in renders with no console
   errors. Directly reload /auth/register and /auth/forgot-password.
2. Sign in with a test account, reload and open a second tab; session persists.
   Sign out and confirm protected routes/data clear in both tabs.
3. Register/recover on the same origin/browser profile; open the latest email
   callback there. Confirm links work without redirecting to a Netlify 404.
4. Create/join a test wedding and ceremony. Refresh and confirm database persistence.
5. Cancel then accept browser confirmations for edits, deletion, ceremony sharing
   and membership changes. Cancellation must leave data untouched.
6. Test separate-family/viewer access as in the Phase 2 cases above; the browser
   must not bypass backend authorization.
7. Disable local storage or simulate network failure. Expect actionable errors;
   do not claim persistence on a failed write. Check browser back and reload.
8. Confirm no admin keys/tokens or private wedding content appear in static assets.

Local Chromium smoke used simulated failed Auth responses, not real email delivery.
Actual deployed-origin sign-in and cross-tab flows are still acceptance steps.

## Core task-plan acceptance (24 October)

The hosted local-browser smoke passes; verify the deployed Netlify build separately.

1. Existing wedding → Home → Build or review your task plan → choose an authorized
   destination → Preview suggested planning tasks. A new wedding opens Tasks.
2. Remove a suggestion, rename another and edit a date. Verify nothing is saved
   until Save reviewed tasks, then reload and check the retained list.
3. Add a custom task with/without start and deadline. Try an invalid date and an
   end before its start; no invalid save should occur.
4. Complete → completed filter → reopen → active filter. Review task history.
5. Edit deadline/owner, cancel the confirmation, then explicitly save. Other task
   and ceremony dates must not move. Test another tab's stale edit.
6. Link one task to several ceremonies in its permitted scope. The master timeline
   shows one task; ceremony views filter it without duplication. Sharing a family
   ceremony must not prevent updating its family task. Withdrawing a ceremony
   from shared visibility must hide its link from broader task readers.
7. Add an Only me task. A different family member, viewer and wedding admin must
   not see its title, history or counts. Revoked members lose access on refresh.
8. Switch weddings during a slow request. The older plan must not replace the
   selected wedding's plan. Network/permission failures clear loaded private tasks.

Calendar grid, recurrence, collaborators, shopping/finance, dependencies, push and
AI are not implemented by this milestone and must not be accepted as complete.

## Guided planner and AI acceptance

1. New wedding → guided intake automatically. Reuse the saved wedding facts. Enter
   a brief or leave it blank; check optional booked-service choices and destination.
2. Generate: verify relevant booking tasks are omitted only from the recognised
   facts displayed in assumptions. All dates must be marked suggestions.
3. Review compact cards with no required task-entry fields; accept in one action.
   Expand one card to change/exclude it. Cancel must save nothing.
4. Test a two-day planning window: timing risks must appear and require explicit
   acknowledgment. Verify existing confirmed dates remain unchanged on regeneration.
5. Confirm Home shows the saved user's blocked/overdue/near-term tasks. Another
   family's/private tasks must not appear in text, counts or dependency hints.
6. With AI off or no key/failing model, verify a labelled rules-based proposal.
   A blank brief must make no model request.
7. After configuring OPENAI_API_KEY in Netlify Functions, submit a brief on the live
   site. Verify AI source labelling, safe structured facts and actual provider output;
   test invalid session, viewer role, rapid retry, provider timeout and refusal.
8. Inspect static assets: no OpenAI/server keys or session tokens. Do not paste
   credentials or full callback URLs into acceptance records.

Live model output and final deployed-origin behaviour remain pending; mocked
provider contracts and a real Supabase rules-path smoke do not establish them.
