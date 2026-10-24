# Preliminary database design

Status: Phase 2 and core Phase 3 tables and five migrations are applied to the selected development
project. The broader entity map below still includes future task/finance work.

Implemented: profiles, weddings, wedding_memberships, workspaces,
workspace_memberships, ceremonies, invitations, activity_events and an admin-only
wf_migrations checksum ledger. Every one has RLS enabled. Read permissions are
explicit; app mutations are only through validated RPCs.

Migration files:

- 202610190001_wedding_workspaces.sql — core model, authorization and mutations.
- 202610190002_explicit_ceremony_sharing.sql — canonical sharing and one shared
  overview per wedding.
- 202610190003_withdraw_ceremony_sharing.sql — explicit permission-checked withdrawal.

The creator is the wedding admin. Workspace admins manage only their permitted
workspace; an empty second family can receive a first-admin invitation without
revealing private records to the creator. Workspace names are permitted sharing
metadata; membership lists, ceremonies and scoped audit events have narrower RLS.

Invitations contain only a SHA-256 token hash, intended email, role and expiry;
plaintext codes are returned once. Acceptance cannot overwrite an existing role,
replay a revoked membership, or bypass expiry/email matching. Scope-row locks
serialize membership changes and first-admin bootstrap; version fields reject
stale wedding/ceremony edits. Leave/remove preserves a last workspace admin.

Ceremony times are actual timestamptz values checked against India local dates;
all-day records have no invented time. A change of wedding date does not move
ceremonies silently. Sharing-mode migration is deferred by the approved decision.


| Entity | Principal fields / relationships |
| --- | --- |
| profiles | auth user ID, display name, language preference |
| weddings | title, main date, city, timezone, sharing mode, creator |
| workspaces | wedding ID, shared/family kind, label |
| wedding_memberships | wedding/user, accepted status, wedding role |
| workspace_memberships | workspace/user, role, active/revoked state |
| invitations | scope, intended role, hashed token, expiry, accepted/revoked timestamps |
| ceremonies | wedding, title, timed/all-day date range, venue, visibility |
| ceremony_access | explicit authorized workspace access |
| categories | default/custom label, wedding/workspace scope, archived state |
| planning_templates / template_tasks | versioned optional task packs, relative windows, ceremony applicability |
| tasks | scope, title, description, behaviour, primary owner, status, priority, planned dates, suggested/confirmed deadline provenance, visibility, version, archival timestamp |
| task_ceremonies | task/ceremony links without task duplication |
| task_collaborators / subtasks | delegated work and authorized contributors |
| task_dependencies | predecessor/successor, finish-to-start, buffer days |
| recurrence_rules / task_occurrences | frequency, timezone, end condition, per-occurrence state |
| task_shares | canonical task and explicitly authorized additional workspace |
| shopping_collections / shopping_items | owner, item quantity, purchase status/dates, estimated/actual cost, item visibility |
| expense_records | task/item reference, estimated/actual amount, financial visibility, payer optional |
| payment_entries | referenced purchase/expense, amount paid, date, payer, visibility; separate from item cost |
| budgets | authorized individual/family/wedding scope, optional planned amount |
| timeline_proposals / proposal_changes | source versions, proposed values, assumptions, provenance, status |
| proposal_approvals | affected owner, approval/rejection, decision time |
| reminders / notifications | schedule, dedupe key, recipient, authorized source, delivery state |
| push_devices / notification_preferences | device token, user, opt-in, quiet hours and offsets |
| activity_events | actor, authorized scope, old/new relevant values, timestamp |
| attachments | private object path, owning record, MIME/type/size metadata; later phase |

## Constraints and indexes

- UUID keys; explicit foreign keys and unique membership/link constraints.
- Validate same-wedding relationships rather than trusting caller-supplied IDs.
- Active task owner required; zero or more authorized collaborators.
- Status: not_started, in_progress, blocked, completed, cancelled. Reopening is audited.
- Model dependencies independently so recurring/continuous tasks can also depend
  on another task. Define occurrence-level dependency semantics before enabling
  combinations that could be ambiguous.
- Nonnegative integer paise; distinguish null, zero, price, paid and budget.
  Refund/overpayment semantics need review before supporting them.
- Costs have one canonical source per purchase. Financial projections must not
  duplicate a cost as both a shopping item and an independent expense.
- Index active scope memberships, task scope/status/deadline, ceremony time,
  dependency endpoints, notification recipient/time and invitation hashes.
- Validate dependency cycles inside transactions; reject stale version writes.

## Authorization contract

Accepted membership is necessary but not sufficient. Personal records are owner-
only; family records require active matching family membership; wedding-wide
records require permitted wedding access. Administrative roles cannot override
personal visibility. View-only users cannot mutate domain records.

Use RLS for reads/writes plus narrowly scoped transactional RPCs for protected
updates. Check column-level mutation permissions: access to a task does not imply
permission to change its owner, visibility or deadline. SECURITY DEFINER functions,
if needed, must fix search_path and independently validate auth.uid and scope.

Notifications, summaries and activity rows must enforce equivalent visibility.
A private predecessor may expose a neutral marker only through an explicit,
authorized sharing relationship. Revocation must remove access immediately on
server requests; local cached data requires invalidation too.

## Migration strategy

1. Profiles, weddings, scopes, accepted memberships and invitations + RLS tests.
2. Ceremonies/categories/tasks and ownership/access constraints.
3. Dependencies, recurrence, revision history and conflict checks.
4. Shopping/finance and visibility-safe summaries.
5. Atomic proposals, reminder outbox and notification preferences.

Seed only synthetic users/data in development. Test cross-family reads, writes,
aggregates, role escalation, revoked access and malformed foreign-key references.

## Validation and remaining boundaries

supabase/tests/workspaces.sql tests ordinary authenticated and anonymous roles,
not just admin reads. It covers pre-acceptance isolation, cross-family/unrelated-
wedding access, viewers, stale writes, revoked/expired/wrong-email invitations,
last-admin preservation, canonical sharing/withdrawal, and private audit access.
All fixtures are rolled back. A separate hosted HTTP smoke uses real signed-in
temporary Auth users and cleans up their wedding and accounts.

Task/expense personal visibility, dependencies, proposal approvals, notifications,
account deletion/export and retention are not implemented by these migrations.
Auth user deletion needs an application data lifecycle because profile references
protect active wedding records. Do not claim this is a complete launch schema.

## October 23 Android preview setup

Android packaging introduces no schema changes. The existing Supabase project and RLS/RPC model remain the backend; Expo receives only public client configuration.

Native Auth callback allowlisting was updated through project Auth configuration only. No database tables, RLS policies or migrations changed.

The successful APK build uses the existing development schema; packaging success does not replace Auth/RLS integration checks or device acceptance.

## October 24 — Netlify browser preview

The browser target reuses the existing development database, roles, RLS and
transactional RPCs. No schema/migration changes were needed. After a Netlify URL
exists, add its exact /auth/callback to the Auth redirect allowlist while retaining
the native callback. That web-origin change is pending; no wildcard was added.

## Applied core planning schema (24 October)

`202610240001_planning_tasks.sql` adds:

- `planning_tasks`: wedding/workspace, title/category/notes, optional planned start
  and due date, primary owner, personal flag, status/priority/date certainty,
  optional template source, creator, version and creation time.
- `task_ceremonies`: canonical many-to-many links; RLS requires both task and
  ceremony visibility so withdrawn family events do not leak their IDs.
- `task_history`: task-scoped old/new JSON snapshots and actor/time. No public audit
  records reveal personal-task existence.

`wf_task_save` locks the workspace alongside membership changes, validates owner
membership and scope, rejects stale versions and implicit visibility changes, and
writes history atomically. Personal tasks are owner-only and cannot be reassigned
to another user. `wf_task_plan` accepts a bounded reviewed batch, retries stable
IDs safely and commits all retained rows together. Source uniqueness prevents
reapplying the same starter task in the same workspace/personal visibility scope.
No direct app writes are granted. Read policies apply to every new table; anonymous
read/execute access is revoked. Task dates are not changed by wedding-date edits.

The migration was tested transactionally before and after application. Fixtures
cover private/family/shared reads, history privacy, viewer/direct-write denial,
CAS conflicts, invalid owners/links, atomic batch rollback and idempotent retry.
No existing wedding records were populated with tasks or altered by migration.

`202610240002_task_ceremony_scope.sql` preserves family-task links to shared
ceremonies and filters withdrawn private links from broader tasks even when the
reader can access both scopes. Its migration and additional multi-link/share/
withdraw assertions passed before and after application. Both migrations are
additive; the previously applied SQL/checksums remain unchanged.

## October 24 — guided intelligent planner

`202610240003_planner_ai_quota.sql` adds `planner_ai_attempts` (identity ID,
auth user ID, creation time). RLS is enabled, direct app/anonymous access is revoked,
and no brief, task context, response or credential is stored in the table.
`wf_claim_planner_ai(wedding,workspace)` verifies current editing authority and
wedding/workspace consistency, serializes per-user reservations, enforces a
30-second cooldown and 20 attempts per rolling 24 hours, and prunes that caller's
counters older than two days on their next reservation. It is authenticated-only;
no service-role key is required by the Netlify function. SQL fixtures cover role
and scope denial, cooldown, daily quota and counter privacy, inside rollback.
The additive migration is tested and applied to the selected development project.
No existing task dates/owners/visibility or wedding records were changed.

## October 24 — Stitch UI implementation

The Stitch UI milestone introduces no database schema, migration, policy or
privilege changes. All data, statistics, timeline cells and deep links rely on
existing authorized records and RPCs. Dashboard progress excludes cancelled and
archived tasks, and includes only tasks actually returned for the signed-in user.
Calendar navigation only filters views. No sample Stitch records or fictional
financial data were inserted. Browser acceptance creates an isolated temporary
wedding/account and deletes them afterward.
