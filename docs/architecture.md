# Architecture

Status: approved foundation; only authentication and navigation implemented.

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
screen markup. The current app has no OpenAI integration, data cache, wedding
records or business data services. Introduce TanStack Query with actual domain
queries in Phase 2 rather than shipping unused infrastructure now.

## Planned domain architecture

- PostgreSQL constraints, RLS and transactional functions enforce access and
  critical mutations. Client permissions are only a UX aid.
- Shared pure TypeScript business rules handle date suggestions, dependency risk
  calculation and INR arithmetic. The backend validates persisted mutations.
- Edge Functions handle authenticated AI requests, invitation workflows and
  delivery operations that require privileged credentials.
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
