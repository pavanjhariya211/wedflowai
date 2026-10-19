# Working on Wedflow

Read docs/progress.md, docs/requirements.md and docs/decisions.md before changing
product behaviour. Original references in docs/product must remain unchanged.

- Work in the existing checkout. Cloud tasks are isolated; do not create Git
  worktrees unless the user explicitly requests one.
- Follow the approved phases in docs/development-roadmap.md. Phases 1 and 2 are approved and implemented;
  Phase 3 and later major phases need founder approval. Do not deploy to production.
- Build functional mobile flows, label incomplete work, and do not claim mocked
  tests establish real service delivery or physical-device behaviour.
- Never commit .env, passwords, sessions, OpenAI or service-role keys. Only
  EXPO_PUBLIC_SUPABASE_URL and its publishable client key belong in mobile config.
- Keep UI, validation, business rules, database access and AI services separate.
- Database authorization must use RLS/server-side validation; no client-only privacy.
- Dates use Asia/Kolkata by default, currency INR with integer paise, and optional
  traditions. Never silently alter deadlines, ownership or visibility.
- Run npm run check and relevant native exports after changes. Auth changes must
  exercise failure paths, PKCE and secure persistence, not only happy-path mocks.
- Update the seven project documents and commit verified milestones. Preserve
  clear records of external blockers and checks that have not run.

Cloud commands may need npm_config_cache=/workspace/.npm-cache. Use
EXPO_OFFLINE=1 for installed SDK compatibility metadata when optional Expo APIs
are blocked; never disable TLS, signatures or checksums.

Phase 2 domain schema is applied to the selected development project. Read-only
configuration check: npm run check:supabase. Database tests:
python scripts/database.py --test (rolled-back fixtures). Controlled live Auth/RPC
smoke: python scripts/smoke-wedding-api.py (temporary accounts and cleanup).
Apply reviewed development migrations with python scripts/database.py --apply;
never edit an applied migration or automatically deploy schema in setup scripts.
SUPABASE_ACCESS_TOKEN is backend/cloud-only. Never bundle it or a service key.
