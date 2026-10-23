"""Development-only migration runner. Credentials stay in HTTPS headers.

--test executes the migration and adversarial RLS fixtures inside a rolled-back
transaction; --apply records the exact tested migration checksum atomically.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parent.parent
PROJECT = 'kyoabyflvstsvvenmcot'


def query(sql):
    token = os.environ.get('SUPABASE_ACCESS_TOKEN')
    if not token:
        raise SystemExit('Configure SUPABASE_ACCESS_TOKEN securely in environment settings.')
    request = urllib.request.Request(
        f'https://api.supabase.com/v1/projects/{PROJECT}/database/query',
        data=json.dumps({'query': sql}).encode(),
        headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'},
    )
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        # Database error text is safe for these controlled migration/test queries;
        # never use this runner to dump credential tables or arbitrary user data.
        body = json.loads(error.read())
        raise SystemExit(f'Database request failed (HTTP {error.code}): {body.get("message", "Query failed")}') from None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--test', action='store_true')
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    if args.test == args.apply:
        parser.error('Choose exactly one of --test or --apply')
    files = sorted((ROOT / 'supabase/migrations').glob('*.sql'))
    state = query("select to_regclass('public.wf_migrations') is not null as ledger, to_regclass('public.weddings') is not null as domain")
    if state[0]['domain'] and not state[0]['ledger']:
        raise SystemExit('Existing domain schema has no migration ledger. No changes applied.')
    applied = {row['name']: row['checksum'] for row in query('select name,checksum from public.wf_migrations')} if state[0]['ledger'] else {}
    known = {file.stem for file in files}
    if set(applied) - known:
        raise SystemExit('Database contains migrations missing from this checkout. Update source first.')
    pending = []
    for file in files:
        sql = file.read_text()
        checksum = hashlib.sha256(sql.encode()).hexdigest()
        if file.stem in applied:
            if applied[file.stem] != checksum:
                raise SystemExit('Applied migration checksum differs from source. No changes applied.')
        else:
            pending.append((file.stem, checksum, sql))
    combined = '\n'.join(item[2] for item in pending)
    if args.test:
        tests = (ROOT / 'supabase/tests/workspaces.sql').read_text()
        tests += '\n' + '\n'.join(p.read_text() for p in sorted((ROOT / 'supabase/tests').glob('*.sql')) if p.name != 'workspaces.sql')
        query('begin;\n' + combined + '\n' + tests + '\nrollback;')
        print('PASS: transactional wedding/workspace/planning/RLS assertions; all fixtures rolled back.')
        return
    if not pending:
        print('All migrations already applied with matching checksums; no changes.')
        return
    ledger_sql = "create table if not exists public.wf_migrations(name text primary key, checksum text not null, applied_at timestamptz not null default now()); alter table public.wf_migrations enable row level security; revoke all on public.wf_migrations from public,anon,authenticated;"
    records = '\n'.join(f"insert into public.wf_migrations(name,checksum) values('{name}','{checksum}');" for name, checksum, _ in pending)
    query('begin;\n' + ledger_sql + '\n' + combined + '\n' + records + "\nnotify pgrst, 'reload schema';\ncommit;")
    print(f'Applied {len(pending)} development migration(s) and recorded checksums.')



if __name__ == '__main__':
    main()
