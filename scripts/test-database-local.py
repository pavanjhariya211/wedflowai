"""Run all SQL/RLS fixtures on isolated PostgreSQL, using synthetic Auth claims.

Requires Docker. This does not establish hosted Supabase/Auth integration.
"""
from pathlib import Path
import subprocess
import time
import uuid

root=Path(__file__).resolve().parent.parent
name='wedflow-sql-'+uuid.uuid4().hex[:12]
image='postgres:17-alpine@sha256:562a6e0a66b5136bc28bef5944bbc2ddddf8ea0058d4016b96cee63f2edaf143'
bootstrap='''create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth; create table auth.users(id uuid primary key,email text);
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
create function auth.uid() returns uuid language sql stable as $$ select nullif(auth.jwt()->>'sub','')::uuid $$;
grant usage on schema auth to anon,authenticated;'''
source='begin;\n'+bootstrap+'\n'+'\n'.join(p.read_text() for p in sorted((root/'supabase/migrations').glob('*.sql')))
files=[root/'supabase/tests/workspaces.sql']+[p for p in sorted((root/'supabase/tests').glob('*.sql')) if p.name!='workspaces.sql']
source+='\n'+'\n'.join(p.read_text() for p in files)+'\nrollback;'

subprocess.run(['docker','run','--name',name,'--network','none','-e','POSTGRES_HOST_AUTH_METHOD=trust','-d',image],check=True,capture_output=True)
try:
 for attempt in range(30):
  if subprocess.run(['docker','exec',name,'pg_isready','-U','postgres'],capture_output=True).returncode==0: break
  time.sleep(1)
 else: raise RuntimeError('Isolated PostgreSQL did not become ready')
 result=subprocess.run(['docker','exec','-i',name,'psql','-U','postgres','-v','ON_ERROR_STOP=1'],input=source,text=True,capture_output=True)
 if result.returncode:
  print(result.stdout[-1200:]);print(result.stderr[-3500:]);raise SystemExit(result.returncode)
 print('PASS: all migrations and SQL/RLS fixtures on isolated PostgreSQL 17; transaction rolled back. No hosted data changed.')
finally:
 subprocess.run(['docker','rm','-fv',name],check=True,capture_output=True)
