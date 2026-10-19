# Development migrations

Three Phase 2 migrations define weddings, family scopes, invitations, ceremonies,
authorization and explicit sharing/withdrawal. See docs/database-schema.md.

The cloud-only runner uses the secure SUPABASE_ACCESS_TOKEN binding:

- `python scripts/database.py --test`: validates pending SQL plus adversarial RLS
  fixtures inside BEGIN/ROLLBACK. No permanent fixtures remain.
- `python scripts/database.py --apply`: applies pending reviewed development SQL
  atomically, records checksums and requests a PostgREST schema reload.

Do not edit already applied SQL, reset a database or run these helpers against
production. Append a new migration for subsequent changes. No administrative
credential belongs in the mobile app or a committed environment file.
