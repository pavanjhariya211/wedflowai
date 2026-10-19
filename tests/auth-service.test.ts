import type { SupabaseClient } from '@supabase/supabase-js';
import { createAuthService } from '../src/auth/service';
import { exchangeAuthCallback, parseAuthCallback } from '../src/auth/callback';
import { friendlyAuthError } from '../src/auth/errors';
function setup() {
  const auth = {
    onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
    signInWithPassword: jest.fn().mockResolvedValue({ data: {}, error: null }),
    signUp: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
    resetPasswordForEmail: jest.fn().mockResolvedValue({ error: null }),
    resend: jest.fn().mockResolvedValue({ error: null }),
    updateUser: jest.fn().mockResolvedValue({ error: null }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
    exchangeCodeForSession: jest.fn().mockResolvedValue({ data: { redirectType: null }, error: null }),
  };
  const client = { auth } as unknown as SupabaseClient;
  return { auth, client, service: createAuthService(client, 'wedflow://auth/callback') };
}
describe('Supabase authentication adapter (mocked service responses)', () => {
  test('trims email but preserves the exact password', async () => {
    const { auth, service } = setup();
    await service.signIn(' user@example.in ', ' password ');
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: 'user@example.in', password: ' password ' });
  });
  test('registration without a session requires email verification', async () => {
    const { auth, service } = setup();
    expect(await service.register('user@example.in', 'long passphrase')).toEqual({ signedIn: false });
    expect(auth.signUp).toHaveBeenCalledWith(expect.objectContaining({ options: { emailRedirectTo: 'wedflow://auth/callback' } }));
  });
  test('registration with a real returned session can continue', async () => {
    const { auth, service } = setup();
    auth.signUp.mockResolvedValueOnce({ data: { session: { access_token: 'test-only' } }, error: null });
    expect(await service.register('user@example.in', 'long passphrase')).toEqual({ signedIn: true });
  });
  test('does not report success when sign-in or sign-out fails', async () => {
    const { auth, service } = setup();
    const failure = { code: 'invalid_credentials' };
    auth.signInWithPassword.mockResolvedValueOnce({ error: failure });
    await expect(service.signIn('user@example.in', 'wrong')).rejects.toBe(failure);
    auth.signOut.mockResolvedValueOnce({ error: failure });
    await expect(service.signOut()).rejects.toBe(failure);
  });
  test('password reset and resend use the allowed native callback', async () => {
    const { auth, service } = setup();
    await service.resetPassword(' user@example.in ');
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('user@example.in', { redirectTo: 'wedflow://auth/callback' });
    await service.resendVerification(' user@example.in ');
    expect(auth.resend).toHaveBeenCalledWith({ type: 'signup', email: 'user@example.in', options: { emailRedirectTo: 'wedflow://auth/callback' } });
  });
  test('updates passwords and signs out of the current device', async () => {
    const { auth, service } = setup();
    await service.updatePassword('new password phrase');
    expect(auth.updateUser).toHaveBeenCalledWith({ password: 'new password phrase' });
    await service.signOut();
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });
  test('distinguishes recovery links after PKCE exchange', async () => {
    const { auth, client } = setup();
    auth.exchangeCodeForSession.mockImplementationOnce(async () => {
      auth.onAuthStateChange.mock.calls[0]![0]('PASSWORD_RECOVERY');
      return { data: {}, error: null };
    });
    expect(await exchangeAuthCallback(client, 'wedflow://auth/callback?code=test-code')).toBe('recovery');
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith('test-code', undefined);
  });
  test('forwards the per-flow verifier identifier from native redirects', async () => {
    const { auth, client } = setup();
    await exchangeAuthCallback(client, 'wedflow://auth/callback?code=test-code&sb_flow_id=flow_123456');
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith('test-code', { flowId: 'flow_123456' });
  });
  test('rejects invalid per-flow identifiers instead of borrowing another verifier', () => {
    expect(() => parseAuthCallback('wedflow://auth/callback?code=test-code&sb_flow_id=bad')).toThrow();
  });
  test('propagates expired link failures', async () => {
    const { auth, client } = setup();
    auth.exchangeCodeForSession.mockResolvedValueOnce({ data: {}, error: { code: 'flow_state_expired' } });
    await expect(exchangeAuthCallback(client, 'wedflow://auth/callback?code=expired')).rejects.toEqual({ code: 'flow_state_expired' });
  });
  test.each(['wedflow://auth/callback', 'wedflow://auth/callback#access_token=unsafe', 'wedflow://auth/callback?error=denied&code=ignored'])('rejects incomplete, implicit-token or failed callback %s', (url) => {
    expect(() => parseAuthCallback(url)).toThrow();
  });
  test('never displays arbitrary backend error descriptions', () => {
    expect(friendlyAuthError({ message: 'private backend details' })).not.toContain('private backend details');
    expect(friendlyAuthError({ name: 'AuthRetryableFetchError' })).toContain('connection');
    expect(friendlyAuthError({ code: 'email_not_confirmed' })).toContain('Verify your email');
  });
});
