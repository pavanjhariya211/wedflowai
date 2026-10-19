import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import { AuthProvider, useAuth } from '../src/auth/AuthProvider';

const mockAuth = {
  getSession: jest.fn(), onAuthStateChange: jest.fn(),
  startAutoRefresh: jest.fn(), stopAutoRefresh: jest.fn(),
};
const mockUnsubscribe = jest.fn();
let mockAuthEvent: (event: string, session: unknown) => void;
jest.mock('../src/lib/supabase', () => ({ supabase: { get auth() { return mockAuth; } } }));
jest.mock('expo-linking', () => ({ createURL: () => 'wedflow://auth/callback' }));
const session = { user: { id: 'test-user', email: 'test@example.in' }, access_token: 'test-only' };

beforeEach(() => {
  jest.resetAllMocks();
  jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove: jest.fn() });
  mockAuth.onAuthStateChange.mockImplementation((callback) => {
    mockAuthEvent = callback;
    return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
  });
  mockAuth.getSession.mockResolvedValue({ data: { session }, error: null });
});
afterEach(() => { jest.restoreAllMocks(); });

describe('session lifecycle with isolated Supabase events', () => {
  test('restores a persisted session and removes subscriptions on unmount', async () => {
    const { result, unmount } = await renderHook(useAuth, { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.session?.user.id).toBe('test-user');
    expect(result.current.startupError).toBe(false);
    await unmount();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    expect(mockAuth.stopAutoRefresh).toHaveBeenCalled();
  });
  test('a late initial read cannot restore a session after a sign-out event', async () => {
    let resolve!: (value: unknown) => void;
    mockAuth.getSession.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    const { result } = await renderHook(useAuth, { wrapper: AuthProvider });
    await act(async () => { mockAuthEvent('SIGNED_OUT', null); });
    await act(async () => { resolve({ data: { session }, error: null }); });
    expect(result.current.session).toBeNull();
    expect(result.current.loading).toBe(false);
  });
  test('recovery events gate the password screen until finished or signed out', async () => {
    const { result } = await renderHook(useAuth, { wrapper: AuthProvider });
    await act(async () => { mockAuthEvent('PASSWORD_RECOVERY', session); });
    expect(result.current.recovery).toBe(true);
    await act(async () => { result.current.finishRecovery(); });
    expect(result.current.recovery).toBe(false);
    await act(async () => { result.current.beginRecovery(); mockAuthEvent('SIGNED_OUT', null); });
    expect(result.current.recovery).toBe(false);
    expect(result.current.session).toBeNull();
  });
  test('a failed session read shows a retry state and can recover', async () => {
    mockAuth.getSession.mockRejectedValueOnce(new Error('secure store unavailable'));
    const { result } = await renderHook(useAuth, { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.startupError).toBe(true));
    expect(result.current.loading).toBe(false);
    await act(async () => { await result.current.retrySession(); });
    expect(result.current.startupError).toBe(false);
    expect(result.current.session?.user.id).toBe('test-user');
  });
  test('background stops refresh and foreground starts it', async () => {
    let onChange!: (state: AppStateStatus) => void;
    const remove = jest.fn();
    const spy = jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, callback) => {
      onChange = callback;
      return { remove };
    });
    const { unmount } = await renderHook(useAuth, { wrapper: AuthProvider });
    onChange('background');
    expect(mockAuth.stopAutoRefresh).toHaveBeenCalled();
    onChange('active');
    expect(mockAuth.startAutoRefresh).toHaveBeenCalled();
    await unmount();
    expect(remove).toHaveBeenCalled();
    spy.mockRestore();
  });
});
