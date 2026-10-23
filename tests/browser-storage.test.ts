import { createBrowserStorage } from '../src/lib/browser-storage';

function browserStore() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
    clear: () => values.clear(), key: () => null,
    get length() { return values.size; },
  };
}

test('browser sessions and PKCE verifier persist across adapter recreation; sign-out removes them', () => {
  const local = browserStore();
  const first = createBrowserStorage(() => local);
  first.setItem('session', 'test-session');
  first.setItem('verifier', 'test-pkce');
  const reloaded = createBrowserStorage(() => local);
  expect(reloaded.getItem('session')).toBe('test-session');
  expect(reloaded.getItem('verifier')).toBe('test-pkce');
  reloaded.removeItem('session');
  reloaded.removeItem('verifier');
  expect(first.getItem('session')).toBeNull();
  expect(local.length).toBe(0);
});

test('server rendering reads no session and unavailable persistence fails explicitly', () => {
  const storage = createBrowserStorage(() => null);
  expect(storage.getItem('session')).toBeNull();
  expect(() => storage.setItem('session', 'test')).toThrow('unavailable');
});

test('browser security/quota failures are propagated to auth error handling', () => {
  const denied = createBrowserStorage(() => { throw new Error('Storage disabled'); });
  expect(() => denied.getItem('session')).toThrow('Storage disabled');
  const local = browserStore();
  local.setItem = () => { throw new Error('Quota exceeded'); };
  expect(() => createBrowserStorage(() => local).setItem('session', 'test')).toThrow('Quota exceeded');
});
