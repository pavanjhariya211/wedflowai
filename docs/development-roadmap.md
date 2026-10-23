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
real signed-in HTTP tests. Physical-device acceptance is still open. Founder
review is required before Phase 3 (templates, tasks, owners and master timeline).

Current validation state and external blockers: [progress](progress.md).

## October 23 Android preview setup

Android preview preparation is in progress within Phase 2 acceptance. The upload allowlist and cloud Supabase URL are corrected; EAS preview APK compilation succeeded. Install the APK and run device acceptance. Phase 3 remains unapproved.
