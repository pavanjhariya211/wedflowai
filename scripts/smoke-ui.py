"""Real Supabase browser acceptance with disposable data; no email is sent.

Requires public Supabase config, cloud SUPABASE_ACCESS_TOKEN, and Chromium.
Serves the current dist/ export locally with the Netlify SPA fallback. Only the
explicitly submitted fictional brief is forwarded to the live AI endpoint.
"""
import json, os, secrets, subprocess, threading, urllib.request, uuid
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
BASE='https://kyoabyflvstsvvenmcot.supabase.co'
MANAGEMENT=os.environ['SUPABASE_ACCESS_TOKEN']
def request(url,method='GET',body=None,key=None,token=None):
 headers={}
 if key:headers['apikey']=key
 if token:headers['Authorization']='Bearer '+token
 if body is not None:headers['Content-Type']='application/json'
 r=urllib.request.Request(url,method=method,headers=headers,data=json.dumps(body).encode() if body is not None else None)
 with urllib.request.urlopen(r,timeout=45) as result:
  raw=result.read();return json.loads(raw) if raw else None
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT/'dist'),**kwargs)
 def do_GET(self):
  if not Path(self.translate_path(self.path)).is_file():self.path='/index.html'
  super().do_GET()
 def log_message(self,*args):pass
if not (ROOT/'dist/index.html').is_file():raise SystemExit('Run npm run export:web first.')
server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
threading.Thread(target=server.serve_forever,daemon=True).start()
keys=request('https://api.supabase.com/v1/projects/kyoabyflvstsvvenmcot/api-keys',token=MANAGEMENT)
service=next(k['api_key'] for k in keys if k.get('name')=='service_role')
email=f'ui-{uuid.uuid4().hex}@example.invalid';password=secrets.token_urlsafe(24)
user=request(BASE+'/auth/v1/admin/users','POST',{'email':email,'password':password,'email_confirm':True},service,service)
try:
 result=subprocess.run(['node','--use-env-proxy',str(ROOT/'scripts/smoke-ui.cjs')],cwd=ROOT,
  input=json.dumps({'email':email,'password':password,'origin':f'http://127.0.0.1:{server.server_port}'}),text=True,timeout=240)
 if result.returncode:raise RuntimeError('Browser acceptance failed')
finally:
 request('https://api.supabase.com/v1/projects/kyoabyflvstsvvenmcot/database/query','POST',{'query':f"delete from public.weddings where creator_id='{user['id']}'::uuid"},token=MANAGEMENT)
 request(BASE+'/auth/v1/admin/users/'+user['id'],'DELETE',key=service,token=service)
 server.shutdown()
 print('Cleanup complete: temporary account/wedding removed; no email sent.')
