# Consolidated product requirements

Baseline approved by founder on 19 October 2026. Checkboxes indicate implementation
status, not whether a requirement has been accepted.

## Source order

1. Latest founder instructions, including the pasted project brief.
2. PRD v1.0 (19 October 2026).
3. Discovery v0.2 (same date; hypotheses remain hypotheses).

Original documents: `docs/product/`. The PRD references a separate Task Taxonomy
v1.0 which was not supplied; use its embedded category table until provided.

## P0 checklist

- [x] Expo/TypeScript/Router mobile foundation; Android and iOS bundle targets.
- [x] Supabase Auth integration, registration, email sign-in/verification/recovery,
  native secure persistence and sign-out. Real hosted password sign-in verified;
  email delivery and physical-device validation remain pending.
- [x] Wedding creation: name/date, flexible planning start, optional city/budget,
  shared/separate family preference; editable settings with safe date-change flow.
- [x] Single- and multi-day ceremonies; multiple same-day events; optional
  traditions, arbitrary custom ceremony names and no religious assumptions.
- [ ] Configurable templates; editable preview; removable/hidden presets; no
  generated date misrepresented as a vendor-confirmed commitment.
- [ ] One master timeline with calendar/list and ceremony filters; tasks can belong
  to multiple ceremonies without duplication; upcoming/overdue/blocked views.
- [ ] Custom categories/tasks; rename/edit/reschedule/complete/reopen/cancel/archive;
  safe deletion; notes, reminders, priority, start/deadline where relevant.
- [ ] One-time, continuous, dependency-driven and recurring behaviours; relevant
  fields only; one primary owner, optional collaborators and delegated subtasks.
- [x] Shared and separate family workspaces, accepted invitations, leave/revoke,
  explicit canonical ceremony sharing/withdrawal and backend audit records.
  Task sharing and richer history views follow in Phase 3.
- [ ] Database-enforced personal/family/wedding scopes; no private data leaks in
  search, totals, notification delivery, activity, dependency markers or exports.
- [ ] Shopping collections/items: jewellery, clothing, gifts/custom; quantities,
  deadlines, responsible person, purchased/pending status and item progress.
- [ ] Optional basic budgets; estimated price, actual price and paid amounts
  distinct; partial payments; visible category totals; null is not zero.
- [ ] Finish-to-start dependencies and buffers; no cycles; confirmed-vs-suggested
  deadline distinction; explain risk without inventing vendor commitments.
- [ ] Manual date impact preview and explicit approval safeguards; no silent
  downstream edits; all affected owners approve; atomic, audited application.
- [ ] In-app inbox, reminders and basic opt-in push; assignment, due, risk and
  approval events; quiet hours, timezone, preference and permission rechecks,
  duplicate suppression, snooze/escalation policy.
- [ ] Clear loading/empty/error/offline/unauthorized/success states; no fake
  functionality; accessible touch targets, scaling, labels and contrast.
- [ ] INR/Indian date UI, Asia/Kolkata default, timezone-aware internals, English
  initially with Unicode/local-language labels and localization-ready structure.
- [ ] Development migrations and synthetic seeds; RLS and concurrency tests;
  validation for wedding-date changes and deleted predecessors.
- [ ] Consent, data minimization, export/delete flows, retention decisions,
  backups/recovery and privacy/legal review before public launch.
- [ ] Privacy-preserving metrics; proposed availability/performance targets measured
  during pilot rather than assumed achieved.

## Required taxonomy

1. Wedding dates and ceremonies
2. Venue and facilities
3. Food and catering
4. Decoration and setup
5. Gold and jewellery
6. Clothing and accessories
7. Shopping and gifts
8. Guests and invitations
9. Accommodation and transportation
10. Photography and entertainment
11. Beauty and grooming
12. Rituals and traditions
13. Budget and vendor payments
14. Wedding-day execution

All are optional/customizable. Task support does not imply marketplace, RSVP CRM
or vendor payment execution.

## P1

- [ ] AI-assisted task drafts with editable structured fields and manual fallback.
- [ ] Advanced dependency analysis, delay explanations, contextual recommendations,
  recovery proposals and approval-based rescheduling improvements.
- [ ] Improved push behaviour; authorized cached reads and carefully scoped offline
  edit queues with visible conflict handling.
- [ ] Optional basic receipt attachments/richer payment scheduling after validation;
  document intelligence remains P2.

## P2 / future

WhatsApp automation through an approved provider with individual consent and
approved templates; advanced vendor coordination, document/receipt intelligence,
expanded ceremony packs, advanced budgets and additional interface languages.
Planner multi-wedding tools require validated demand and separate scope approval.

## AI boundaries

Rules own dates, graphs, permissions, status and totals. AI drafts and explains
only authorized context, labels uncertainty and never invents confirmed dates,
prices, availability or cultural requirements. No silent changes to deadlines,
owners, budgets, privacy or ceremonies; no unapproved outbound messages.

## Acceptance scenarios retained

- Nine-month and short-lead weddings both produce editable, relevant suggestions.
- Single-day wedding supports multiple ceremonies without forcing multi-day setup.
- A private jewellery item cannot be inferred from another family's totals.
- Three of five purchased items shows 3/5; unpaid balances remain unpaid.
- Shared reception keeps one date and separate authorized family work.
- Delayed venue work produces a preview without silently moving decoration dates.
- View-only relatives cannot edit assigned work or inspect private costs.
- Complete → reopen → reassign retains authorized history.
- Concurrent edits are rejected or reconciled visibly; changed wedding dates and
  removed dependencies never silently overwrite confirmed commitments.

## Research and launch gates

Founder collaboration decisions are not evidence that relatives will adopt the
app. PRD proposes 12–15 interviews, 5–8 household usability sessions and a 10–20
wedding pilot. Validate initiation, handoffs, visibility comprehension, notification
fatigue and sustained multi-person use before public launch.

Candidate north star: critical milestones completed by confirmed deadlines.
PRD activation definition: wedding + five retained tasks + one accepted additional
member within seven days, superseding discovery's earlier three-task proposal.
Other metrics: collaboration, known-cost capture, useful alerts, muted alerts,
proposal reversals and privacy incidents. Targets require pilot evidence.

## October 23 Android preview setup

Device acceptance remains pending until an internal APK can be built and installed. Expo authentication, project linking and signing preparation are verified; the internal APK build is complete after the cloud allowlist correction. Device tests remain pending.
