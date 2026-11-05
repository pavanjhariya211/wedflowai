# Development roadmap

Every phase: explain → implement → verify → demonstrate → commit → founder review.
Do not start the next major phase without approval. Production requires separate
explicit authorization. Maintain the app in a runnable state and label incomplete
features honestly.

| Phase | Deliverable | Exit evidence |
| --- | --- | --- |
| 1 | Mobile foundation, auth, navigation shell, docs and CI | Type/lint/tests, Android+iOS exports; configured Supabase/device auth checklist |
| 2 | Weddings, ceremonies, both workspace modes, invitations and RLS | Real persisted setup; accepted/revoked membership; cross-family isolation tests |
| 3 | Templates, custom tasks/categories, ownership, recurrence and timeline | Scheduling tests, task lifecycle, multi-ceremony views, concurrent edits/history |
| 4 | Shopping, costs, partial payments, basic budgets | Correct known totals, null handling, no double counting or privacy leakage |
| 5 | P0 dependencies, risk detection, manual approvals, in-app/basic push | Cycle/buffer tests, atomic versioned approvals, consent/deduplication, device delivery |
| 6 | Pilot hardening | End-to-end scenarios, accessibility/device checks, recovery exercise, measured performance/privacy review |
| 7 | P1 AI and offline improvements | Structured output validation, permitted context, failure fallback, approved proposals, safe sync |
| 8 | P2 validated expansion | Separate scope approval; provider/consent verification for WhatsApp |

Separate-family authorization is part of P0, even if exposed only to a controlled
beta cohort initially. Do not reduce it to a nonfunctional privacy toggle.

## First milestone

Use an Expo SDK 58 native app with real Supabase email/password integration, secure
session persistence, PKCE email verification/recovery, protected routes and
accessible form states. Add source product documents and maintain the seven core
project documents. No domain planning functionality or production deployment.

Phases 1 and 2 are implemented. Phase 2 passed live development migration/RLS and
real signed-in HTTP tests. Physical-device acceptance is still open. Founder requested the missing PRD planning flow on October 24. The core Phase 3
task/template/timeline work is authorized and implemented; it is not all of Phase 3.

Current validation state and external blockers: [progress](progress.md).

## October 23 Android preview setup

Android preview preparation is in progress within Phase 2 acceptance. The upload allowlist and cloud Supabase URL are corrected; EAS preview APK compilation succeeded. Install the APK and run device acceptance. Phase 3 core task planning was subsequently authorized on October 24.

## October 24 — Netlify browser preview

Within the approved browser-preview scope, web support and netlify.toml are
prepared. Remaining handoff: import GitHub repository into the founder's Netlify
account, add the two public build variables, deploy the testing site, register
its exact Supabase callback, and run signed-in browser acceptance. Phase 3 core task planning was subsequently authorized on October 24. The existing Android APK remains available.

## October 24 — restore the missing core planning flow

Completed core Phase 3 work: custom scoped tasks, edited optional starter plan,
primary ownership, date/status lifecycle, scoped history, filters and a master list
timeline; creation now opens the planning flow. Backend migration and real hosted
browser acceptance pass. See progress for exact evidence and the PRD gap audit
for all incomplete requirements. Do not mark Phase 3 complete: recurrence,
collaborators/delegation, full category management and calendar are still pending.
Phase 4 shopping/finance and Phase 5 dependencies/notifications remain separate
work. No public-launch/store authorization is implied.

## October 24 — guided intelligent planner

The founder explicitly approved beginning the guided planner: saved setup →
short brief → sequenced proposal → one acceptance → attention dashboard. This
first implementation and authenticated server AI intake are authorized without a
new phase approval loop. The rules path and provider-contract/error paths are
verified; actual Netlify runtime AI settings and live model delivery remain an
external setup/acceptance step. Later work includes richer intake/preferences,
real provider acceptance, durable dependencies, affected-owner date-change
proposals and approvals, calendar/recurrence, shopping/finance and notifications.
Do not claim autonomous rescheduling or complete PRD/P1 delivery.

## October 24 — Stitch UI implementation

The approved UI/UX work imports the founder's existing Stitch design direction
and replaces the basic dashboard/intake/review/timeline presentation. The actual
calendar-grid portion of Phase 3 is now implemented, including month navigation
and date filtering. Existing permission/version/history workflows stay connected.
Mobile and desktop acceptance includes real temporary-account persistence and
navigation checks. Netlify publication must be verified against the new asset
hashes after push; the old APK will still predate this redesign. Live OpenAI
provider 502 diagnosis is separate from the successful Stitch connection/UI work.
Shopping, recurrence, durable dependencies/rescheduling, notifications and other
remaining PRD gaps are still not complete.

## November 5 — theme review artifacts

Deliver a separate static gallery for comparing Berry & Marigold with Indigo &
Coral. Theme selection and changes to the working app remain the next design
step. Audio and other new functional phases are outside this artifact delivery.

## November 5 — approved Berry & Marigold implementation

Berry & Marigold implementation is authorized for the existing Netlify browser testing site. This delivers UI simplification and theme consistency; it does not add other PRD phases or update the older signed APK.

## November 6 — family invitation links and collaboration

The approved collaboration milestone improves the existing Phase 2 membership flow. It does not authorize notifications, comments/chat, automatic invitations, a broader realtime service or changes to personal/family privacy. Physical native-link acceptance and a new APK remain separate checks.

## November 6 — WhatsApp-only invitations (prepared, not deployed)

WhatsApp-only invitation UI and backend migration are prepared in a separate feature branch. This is manual user-initiated sharing through WhatsApp, not the future automated WhatsApp/provider messaging phase. Publish only after the tested schema is applied with a valid management credential; retain the functioning main branch while blocked.
