# Stitch design handoff

Source: the founder's existing **Wedflow Wedding Planner UI** Stitch project,
`17939857750060252617`, accessed on 24 October 2026 using an environment-bound API
key. No key or MCP credential is stored here.

| Export | Source screen ID | Application adaptation |
| --- | --- | --- |
| dashboard.html | 7c4f5f0692324d15bffcaf483f1f6a61 | Today dashboard, countdown, visible task progress, attention and next actions |
| intake.html | 3e3a8e10ab2945818e7363c7700eadc1 | Guided context, brief entry, booked-service chips and actual generation feedback |
| review.html | fd9fc46417fc40c1b3916ffe91f699b1 | Category accordions, assumptions, explicit scope and one approval |
| timeline.html | f84593c2b833447ebfca3c537429ff75 | Chronological task cards, working monthly view, date/ceremony filters and task editor links |
| DESIGN.md | Project design theme | Playfair Display/Inter, forest green, warm ivory, restrained terracotta/gold |

These HTML exports are reference material, not runtime code. They use illustrative
names, roles, dates, amounts, traditions and capabilities. The live application
uses actual authorized Supabase records instead. No demo financial amounts,
notifications, avatar photographs, spiritual claims, family assignments, chat,
phone calls, simulated synchronization or future automation were imported.

The implementation uses Expo/React Native components and bundled font assets;
it does not embed Stitch HTML, execute its CDN scripts, or load fictional user
portraits as actual wedding photographs. Mobile navigation is a working tab bar;
desktop navigation is a working rail. Confirmed/suggested dates and private/shared
scope remain explicit. The month view changes only the view, never saved dates.

Reproducible browser acceptance: build `dist` with `npm run export:web`, then run
`python scripts/smoke-ui.py`. Requires development Supabase environment bindings,
Playwright (dev dependency), and Chromium (`PLAYWRIGHT_CHROMIUM_EXECUTABLE` may
override its path). The runner creates a temporary confirmed account and wedding,
uses real hosted Auth/domain requests, checks the deployed AI endpoint once with
a fictional brief, exercises desktop/mobile UI, writes screenshots under `/tmp`,
and removes temporary data in a finally block. No email is sent. Provider failure
is reported separately and exercises the honest fallback; it is not AI success.

The final live verification returned HTTP 200 with source ai and passed plan
acceptance/persistence. Netlify served the exact new UI entry asset. An earlier
502 was transient/pre-deployment and is not the final acceptance outcome.
