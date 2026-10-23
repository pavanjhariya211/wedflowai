import { createHash, randomFillSync } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { installNativeAuthCrypto } from '../src/lib/native-auth-crypto';
import { createSessionStorage } from '../src/lib/secure-storage';
import { createBrowserStorage } from '../src/lib/browser-storage';
import { exchangeAuthCallback } from '../src/auth/callback';

jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  digest: async (_algorithm: string, bytes: Uint8Array) => {
    const hash = jest.requireActual<typeof import('node:crypto')>('node:crypto').createHash('sha256').update(bytes).digest();
    return hash.buffer.slice(hash.byteOffset, hash.byteOffset + hash.byteLength);
  },
  getRandomValues: (bytes: Uint8Array) => jest.requireActual<typeof import('node:crypto')>('node:crypto').randomFillSync(bytes),
}));

// Real Supabase SDK and our native adapters, with HTTP and OS crypto bindings
// isolated. These tests do not contact a hosted Supabase project.
describe.each(['native', 'browser'])('installed Supabase SDK PKCE contract: %s', (platform) => {
  const originalCrypto = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  beforeEach(() => {
    const native = {} as Parameters<typeof installNativeAuthCrypto>[0];
    installNativeAuthCrypto(native);
    Object.defineProperty(globalThis, 'crypto', { value: native.crypto, configurable: true });
  });
  afterEach(() => {
    if (originalCrypto) Object.defineProperty(globalThis, 'crypto', originalCrypto);
    else Reflect.deleteProperty(globalThis, 'crypto');
  });

  function setup() {
    const store = new Map<string, string>();
    const storage = platform === 'browser' ? createBrowserStorage(() => ({
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => { store.set(key, value); },
      removeItem: (key: string) => { store.delete(key); },
      clear: () => store.clear(), key: () => null, length: store.size,
    })) : createSessionStorage({
      getItemAsync: async (key) => store.get(key) ?? null,
      setItemAsync: async (key, value) => { store.set(key, value); },
      deleteItemAsync: async (key) => { store.delete(key); },
    });
    const fetch = jest.fn() as jest.MockedFunction<typeof globalThis.fetch>;
    const client = createClient('https://test-project.supabase.co', 'sb_publishable_test_only', {
      auth: { storage, persistSession: true, autoRefreshToken: false, detectSessionInUrl: false, flowType: 'pkce' },
      global: { fetch },
    });
    return { client, fetch, storage };
  }

  test('registration sends S256 and persists the verifier through its platform adapter', async () => {
    const { client, fetch, storage } = setup();
    fetch.mockResolvedValueOnce(new Response(JSON.stringify({ user: { id: 'test-user', identities: [] }, session: null }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    const { error } = await client.auth.signUp({ email: 'test@example.in', password: 'test-only long phrase', options: { emailRedirectTo: 'wedflow://auth/callback' } });
    expect(error).toBeNull();
    const [url, options] = fetch.mock.calls[0]!;
    const redirect = new URL(String(url)).searchParams.get('redirect_to')!;
    expect(redirect).toBe('wedflow://auth/callback');
    const body = JSON.parse(options!.body as string);
    expect(body.code_challenge_method).toBe('s256');
    const stored = await storage.getItem('sb-test-project-auth-token-code-verifier');
    const verifier = JSON.parse(stored!) as string;
    expect(body.code_challenge).toBe(createHash('sha256').update(verifier).digest('base64url'));
    expect(body.code_challenge).not.toBe(verifier);
  });

  test('password recovery callback uses its verifier and emits recovery state', async () => {
    const { client, fetch } = setup();
    fetch.mockResolvedValueOnce(new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }));
    const { error } = await client.auth.resetPasswordForEmail('test@example.in', { redirectTo: 'wedflow://auth/callback' });
    expect(error).toBeNull();
    const redirect = new URL(String(fetch.mock.calls[0]![0])).searchParams.get('redirect_to')!;
    expect(redirect).toBe('wedflow://auth/callback');
    const now = Math.floor(Date.now() / 1000);
    const user = { id: '00000000-0000-4000-8000-000000000001', aud: 'authenticated', email: 'test@example.in', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() };
    // Nonfunctional test JWT; accepted only by the isolated SDK response below.
    const accessToken = `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url')}.${Buffer.from(JSON.stringify({ exp: now + 3600, sub: user.id })).toString('base64url')}.${randomFillSync(Buffer.alloc(32)).toString('base64url')}`;
    fetch.mockResolvedValueOnce(new Response(JSON.stringify({ access_token: accessToken, refresh_token: 'test-only-refresh', token_type: 'bearer', expires_in: 3600, user }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    expect(await exchangeAuthCallback(client, 'wedflow://auth/callback?code=test-only-code')).toBe('recovery');
    const body = JSON.parse(fetch.mock.calls[1]![1]!.body as string);
    expect(body.auth_code).toBe('test-only-code');
    expect(body.code_verifier.length).toBeGreaterThanOrEqual(43);
    expect(body.code_verifier).not.toContain('/recovery');
    fetch.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await client.auth.signOut({ scope: 'local' });
  });
});
