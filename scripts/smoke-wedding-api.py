"""Hosted development smoke test with temporary users and deterministic cleanup.

Service-role key is fetched into process memory only for temporary Auth users.
Application RPC requests use the publishable key and real signed-in user JWTs.
No credentials, tokens, raw API bodies or test passwords are printed or saved.
No email is sent: temporary accounts are administratively confirmed.
"""
import json
import os
import secrets
import urllib.error
import urllib.request
import uuid

PROJECT = 'kyoabyflvstsvvenmcot'
BASE = os.environ['EXPO_PUBLIC_SUPABASE_URL'].rstrip('/')
assert BASE == f'https://{PROJECT}.supabase.co'
PUBLISHABLE = os.environ['EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY']
MANAGEMENT = os.environ['SUPABASE_ACCESS_TOKEN']


def request(base, path, method='GET', body=None, key=None, token=None, expected=(200, 201, 204)):
    headers = {}
    if key:
        headers['apikey'] = key
    if token:
        headers['Authorization'] = 'Bearer ' + token
    if body is not None:
        headers['Content-Type'] = 'application/json'
    req = urllib.request.Request(base + path, data=None if body is None else json.dumps(body).encode(), method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            assert response.status in expected
            raw = response.read()
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as error:
        if error.code in expected:
            return None
        raise RuntimeError(f'Expected {expected}, received HTTP {error.code} at {path.split("?")[0]}') from None


def main():
    keys = request('https://api.supabase.com', f'/v1/projects/{PROJECT}/api-keys', token=MANAGEMENT)
    service_key = next(item['api_key'] for item in keys if item.get('name') == 'service_role')
    wedding = str(uuid.uuid4())
    users = []
    cleanup_errors = []
    try:
        for _ in range(2):
            email = f'wf-test-{uuid.uuid4().hex}@example.invalid'
            password = secrets.token_urlsafe(32)
            user = request(BASE, '/auth/v1/admin/users', 'POST', {'email': email, 'password': password, 'email_confirm': True}, key=service_key, token=service_key)
            users.append({'id': user['id'], 'email': email})
            session = request(BASE, '/auth/v1/token?grant_type=password', 'POST', {'email': email, 'password': password}, key=PUBLISHABLE)
            users[-1]['jwt'] = session['access_token']
        a, b = users

        def rpc(actor, name, args, expected=(200, 201, 204)):
            return request(BASE, '/rest/v1/rpc/' + name, 'POST', args, key=PUBLISHABLE, token=actor['jwt'], expected=expected)

        created = rpc(a, 'wf_create_wedding', {'p_id': wedding, 'p_title': 'Temporary API verification', 'p_date': '2027-12-12', 'p_start': '2026-10-19', 'p_city': 'Bhopal', 'p_budget': None, 'p_mode': 'separate', 'p_format': 'multi', 'p_name': 'Test A'})
        assert created == wedding
        spaces = rpc(a, 'wf_workspace_access', {'p_wedding': wedding})
        own = next(s['id'] for s in spaces if s['kind'] == 'family' and s['can_edit'])
        other = next(s['id'] for s in spaces if s['bootstrap'])
        shared = next(s['id'] for s in spaces if s['kind'] == 'shared')

        def ceremony(actor, scope, title, expected=(200, 201, 204)):
            ceremony_id = str(uuid.uuid4())
            rpc(actor, 'wf_save_ceremony', {'p_id': ceremony_id, 'p_wedding': wedding, 'p_workspace': scope, 'p_title': title, 'p_start': '2027-12-12', 'p_end': '2027-12-12', 'p_all_day': True, 'p_starts_at': None, 'p_ends_at': None, 'p_venue': '', 'p_version': None}, expected)
            return ceremony_id

        ceremony(a, own, 'Private A')
        ceremony(a, shared, 'Shared reception')
        before = request(BASE, f'/rest/v1/weddings?id=eq.{wedding}&select=id', key=PUBLISHABLE, token=b['jwt'])
        assert before == []
        code = rpc(a, 'wf_invite', {'p_workspace': other, 'p_email': b['email'], 'p_role': 'admin'})
        assert rpc(b, 'wf_accept_invite', {'p_token': code, 'p_name': 'Test B'}) == wedding
        rows_b = request(BASE, f'/rest/v1/ceremonies?wedding_id=eq.{wedding}&select=title', key=PUBLISHABLE, token=b['jwt'])
        assert [row['title'] for row in rows_b] == ['Shared reception']
        private_b = ceremony(b, other, 'Private B')
        ceremony(b, own, 'Denied cross-family write', expected=(403,))
        rows_a = request(BASE, f'/rest/v1/ceremonies?wedding_id=eq.{wedding}&select=title', key=PUBLISHABLE, token=a['jwt'])
        assert {row['title'] for row in rows_a} == {'Private A', 'Shared reception'}
        rpc(b, 'wf_share_ceremony', {'p_id': private_b, 'p_version': 1})
        shared_row = request(BASE, f'/rest/v1/ceremonies?id=eq.{private_b}&select=id,workspace_id', key=PUBLISHABLE, token=a['jwt'])
        assert shared_row == [{'id': private_b, 'workspace_id': shared}]
        rpc(b, 'wf_unshare_ceremony', {'p_id': private_b, 'p_version': 2, 'p_workspace': other})
        hidden_row = request(BASE, f'/rest/v1/ceremonies?id=eq.{private_b}&select=id', key=PUBLISHABLE, token=a['jwt'])
        assert hidden_row == []
        request(BASE, '/rest/v1/weddings?select=id', key=PUBLISHABLE, expected=(401, 403))
        print('PASS: real Auth sign-in, persisted wedding/ceremonies, invitation acceptance, and cross-family API isolation.')
    finally:
        try:
            request('https://api.supabase.com', f'/v1/projects/{PROJECT}/database/query', 'POST', {'query': f"delete from public.weddings where id='{wedding}'::uuid"}, token=MANAGEMENT)
        except Exception:
            cleanup_errors.append('temporary wedding')
        for user in users:
            try:
                request(BASE, '/auth/v1/admin/users/' + user['id'], 'DELETE', key=service_key, token=service_key)
            except Exception:
                cleanup_errors.append('temporary Auth user')
        if cleanup_errors:
            raise RuntimeError('Cleanup needs attention: ' + ', '.join(cleanup_errors))
        print('Cleanup complete: temporary wedding records and Auth users removed.')


if __name__ == '__main__':
    main()
