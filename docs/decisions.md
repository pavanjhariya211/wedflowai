# Decision log

## 19 October 2026 — approved planning baseline

Founder approved the presented architecture, Phase 1 and recommended defaults.

- Mobile-only Expo/React Native/TypeScript/Router; Android-first with iOS support.
- Supabase Auth/PostgreSQL/Storage; secure backend OpenAI integration in P1;
  Expo notifications; EAS for native builds; GitHub milestone source control.
- Deterministic scheduling before AI. AI task capture is P1, overriding discovery's
  earlier P0 placement. WhatsApp is P2, overriding the PRD's P1 placement.
- P0 basic push; P1 push improvements. Manual impact/approval safeguards in P0;
  advanced recovery proposals in P1.
- Personal expenses are owner-only; admins cannot bypass them. This supersedes
  discovery's tentative purchaser-plus-admin policy.
- Creator is initial admin; additional admins require explicit appointment.
- Retained tasks default to the creator as owner; reassignment is explicit.
- Use canonical shared tasks and explicit grants, not editable mirrored copies.
- Private blockers reveal even a generic marker only through permitted sharing.
- All affected owners approve initially; no automatic admin override of privacy.
- Templates suggest critical milestones; users confirm them.
- Label totals as visible expenses and show incomplete/missing-cost information.
- Sharing mode chosen at setup; defer migration between modes until safe design.
- Weekly/monthly recurrence initially; semantics finalized before feature code.
- Email/password with verification first; phone OTP deferred pending pilot need.

## 19 October 2026 — Phase 1 implementation choices

- Expo SDK 58 / React 19.3 / React Native 0.88 from the stable template and bundled
  native compatibility metadata; Node 24 LTS; npm lockfile.
- Publishable Supabase keys only; no legacy JWT client key support in the first
  configuration form, reducing accidental service-role bundling.
- PKCE-only email callbacks. Same-device verifier requirement is documented.
  Expo Crypto supplies native secure randomness and S256 hashing where needed;
  optional callback flow IDs are validated and forwarded. The default stable SDK
  redirect mode is retained; request the latest link after starting a new flow.
- Long SecureStore sessions use chunked ASCII encoding and generation manifests.
- No domain tables yet: managed Auth needs no custom migration in this phase.
- No cache/query dependency until domain fetching is implemented.
- The four task behaviours will be represented without making dependency edges
  mutually exclusive with continuous/recurring work.
- Shopping progress derives from active items; a linked task's completion remains
  an explicit action. Payment entry never implies purchase/task completion.
- Original uploaded PRD/discovery files are retained byte-for-byte in docs/product.

## 19 October 2026 — Phase 2 implementation

- Founder asked to move into app development after configuring administrative
  access. Phase 2 was implemented against the selected empty development schema.
- Use a cloud personal-access-token binding for administration; local Codex and
  browser OAuth are not prerequisites. Native MCP tool availability is separate;
  authorized Management API operations work over HTTPS.
- Invitation codes expire after seven days and are bound to the authenticated
  email. Share through the device's explicit share action; no email/SMS/WhatsApp
  delivery is simulated. Existing members retain their role when accepting an
  older invitation; role changes use a separate administrator action.
- Last workspace admin cannot leave/be removed/demoted until another is appointed.
  Workspace-role management does not automatically confer wedding administration.
- Wedding creation retries reuse a UUID. Wedding/ceremony edits use expected
  versions. Family sharing mode remains fixed as previously agreed.
- Workspace labels identify sharing destinations. Family membership lists,
  ceremonies and scoped activity remain protected independently.
- Ceremony sharing uses one canonical record. Broadening visibility is an explicit
  family-admin action; withdrawal requires ownership/wedding administration and
  destination-family admin rights. Both are version-checked and audited.
- The optional wedding-level budget is shared and labelled accordingly. Personal
  and family expense records are deferred to their separate finance schema.
- Use the session-scoped provider for now; invalidate on refresh/permission failure
  and discard out-of-order requests. No persistent offline cache or write replay.
- Migration checksums are retained; append new migrations instead of editing
  already applied SQL. Dev API smoke fetches server credentials only in memory
  for synthetic Auth fixtures; test traffic uses real user sessions.

## Decisions still requiring detail before their phase

- Task-assignment acceptance, task-owner departure and wedding-admin transfer.
- Lead-time defaults/first ceremony packs; how short-lead impossible plans appear.
- Overdue recurrence, occurrence dependencies and stop conditions.
- Budget edit permissions, overpayments/refunds and payment privacy edge cases.
- Reminder offsets, quiet hours, snooze and escalation policy.
- Retention/export/account deletion details and India privacy/legal review.
- Minimum Android/iOS support and regions/languages for pilot.
- Stable native application identifiers, Expo organization and signing ownership.

No production deployment, payments integration, AI usage or external messaging has
been authorized by this milestone approval.
