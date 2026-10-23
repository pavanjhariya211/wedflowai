# Architecture

Status: Phases 1–2 and the Phase 3 core task/template/timeline flow are implemented in development.

## Runtime boundaries

The Expo mobile client uses Supabase Auth with email/password, PKCE email links,
and a publishable client key. A small Expo Crypto bridge provides OS-backed random
values and SHA-256 when the native runtime lacks those WebCrypto operations,
preventing the SDK from falling back to weak randomness or plain PKCE. Supabase owns the authoritative identity. Expo
SecureStore holds session data and PKCE verifiers; long values use bounded ASCII
chunks and a generation manifest. Refresh and sign-out storage operations are
serialized. Sessions are never written to plaintext AsyncStorage.

`AuthProvider` restores sessions, subscribes to auth events, controls refresh on
foreground/background transitions, and protects signed-in/recovery routes with
Expo Router. Startup storage failures expose a retry state. Backend errors are
mapped to safe user messages; tokens and full callback URLs are not logged.

Screens use the auth service adapter; SDK calls and input validation live outside
screen markup. Domain operations live in src/wedding/service.ts with typed records, pure input
validation and a session-scoped WeddingProvider. It refreshes on tab focus and
foregrounding, discards stale request responses, clears records on permission/
network failures, and is remounted on account changes. No persistent private cache
or offline write queue is enabled. A query-cache library is deferred until the task
workflow justifies it; current domain reads use the SDK directly.

Wedding creation and domain writes use narrow SQL RPCs. Client-generated creation
IDs make wedding retries idempotent; expected versions protect updates, sharing
and deletion. Workspace-admin-only explicit sharing preserves the ceremony ID.
Withdrawing a shared ceremony requires the creator or wedding admin plus admin
permission in the destination family. Shared wedding budget is explicitly labelled
as visible to accepted members; private expenses are a later separate entity.

## Planned domain architecture

- PostgreSQL constraints, RLS and transactional functions enforce access and
  critical mutations. Client permissions are only a UX aid.
- Shared pure TypeScript business rules handle date suggestions, dependency risk
  calculation and INR arithmetic. The backend validates persisted mutations.
- Edge Functions will handle authenticated AI requests and future delivery
  operations that require privileged credentials. Invitation-code creation and
  acceptance currently run in transactional SQL RPCs.
- A durable notification outbox plus scheduled worker handles reminders, consent,
  permission rechecks and deduplication; push delivery is not guaranteed.
- Supabase Realtime may invalidate authorized queries; never subscribe to a broad
  stream and rely solely on client filtering.
- Private storage buckets and signed access protect future attachments.

A task has one canonical record, even when linked to several ceremonies or
explicitly shared across workspaces. No mirrored writable copies are planned.
Role scope, item visibility and financial visibility are separate concerns.

## Correctness and security

All-day dates use SQL `date`; exact instants use `timestamptz` plus the wedding's
IANA timezone. Default `Asia/Kolkata`; UI uses Indian formatting. Do not turn an
all-day deadline into midnight UTC. Money uses integer paise, never floating-point
rupees. Unknown costs remain null and are excluded from known totals with a label.

Use expected record versions for concurrent writes. An approved proposal applies
atomically only if every affected owner approved and source versions still match.
Dependency cycles require server-side graph validation under transaction locking.
Archive tasks by default; deleting a predecessor must not silently erase blockers.

Clear scoped caches on sign-out, revoked membership and account switching. Offline
queues are P1 and must never silently replay an unauthorized or stale write.
Private information must not leak through search, totals, logs, audit records,
notifications, dependency markers, exports or AI prompts.

## Operations

Separate development and production Supabase projects. Apply version-controlled
migrations; do not evolve production through undocumented dashboard SQL. Keep
service-role and AI keys exclusively in backend secret stores. Use minimal,
redacted analytics and evaluate India privacy/legal requirements before launch.

Node 24 LTS and Expo SDK 58 are the initial toolchain. Expo's SDK package metadata
pins compatible native libraries; npm's lockfile pins the full dependency graph.
`react-dom` and React Server Components packages satisfy Router/test peer
requirements; the app exposes no web platform or web script.

## Implemented domain boundary

Public app tables grant SELECT only to authenticated callers with RLS. Invitation
hashes are excluded even from that column grant. No direct app table writes are
granted. RPCs use fixed empty search paths, auth.uid checks, scope checks and
transaction locks; all default PUBLIC/anonymous function execution is revoked.
A family creator may bootstrap the other family's first admin but gains no access
to that family's ceremony contents. Pending invitations reveal no pre-acceptance
wedding data, expire after seven days and are bound to the authenticated email.

The Management API is used from cloud-only helpers for development migrations and
controlled tests. No server credential is imported by mobile code. Auth passwords,
MCP tokens and service keys are never persisted by these helpers.

## October 23 Android preview setup

Internal Android previews use the existing Expo team project `wedflow-ai`, package `com.wedflowai.app`, and the EAS preview environment. Only public Supabase client configuration is supplied to the mobile build.

Supabase development Auth now allows the exact native callback `wedflow://auth/callback`. Email confirmation and recovery return to the requesting app; physical-device routing remains unverified.

EAS preview build 4d72654f-c4e4-4e13-a8b1-c3764ac21143 successfully produced the signed internal Android APK on October 23. Runtime behaviour remains subject to physical-device acceptance.

## October 24 — Netlify browser preview

The founder authorized a browser preview for Netlify on October 24. Expo Router
exports a client-rendered SPA (`web.output: single`). Netlify rewrites unknown
paths to index.html so route reloads and /auth/callback work. Browser auth uses
origin-scoped localStorage and navigatorLock for cross-tab refresh, preserving
native SecureStore/processLock adapters. Native crypto installation preserves
browser WebCrypto. Browser confirm dialogs retain explicit mutation consent.
Private user data is loaded only after authentication through existing RLS/RPCs.
Netlify receives only public Supabase build variables. No Netlify site is live yet.

## Core task planning

`src/planning` separates task types, date/template rules, typed service calls,
request-state invalidation and UI. `usePlanning` discards responses for old wedding
selections and clears data on fetch failures. Tasks use optional date-only fields
in the existing Asia/Kolkata planning model, one primary owner, explicit statuses,
custom categories, notes, priority and a planning/confirmed date label.

An opt-in preview creates stable client IDs, permits exclusion/renaming/rescheduling,
shows compressed short-lead suggestions for review, and submits one atomic RPC.
Template suggestions are editorial planning guidance, never confirmed vendor dates.
No tasks are silently generated on wedding creation. Creation navigates to Tasks;
Home and Timeline link to the actual planning flow. Timeline combines ceremony
and task dates without duplicating tasks linked to multiple ceremonies.

Three new RLS tables and SECURITY DEFINER RPCs enforce accepted editor ownership,
immutable visibility during edits, personal-owner privacy, workspace authorization,
ceremony-scope validation, CAS versions and old/new history. Private links are
filtered independently when a ceremony's scope changes. Shopping, calendar grid,
collaborators, recurrence, dependencies, notifications and AI remain gaps.
