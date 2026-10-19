# Preliminary database design

Status: design only. Phase 1 uses managed Supabase Auth; no domain tables, RLS
policies or application migrations have been applied. Final Phase 2 SQL must be
reviewed and tested against ordinary authenticated identities.

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
