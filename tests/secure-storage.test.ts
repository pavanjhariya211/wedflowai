import { Buffer } from 'node:buffer';
import { createSessionStorage, type SecureKeyValueStore } from '../src/lib/secure-storage';
function setup() {
  const values = new Map<string, string>();
  const store: SecureKeyValueStore = {
    getItemAsync: jest.fn(async (key) => values.get(key) ?? null),
    setItemAsync: jest.fn(async (key, value) => { values.set(key, value); }),
    deleteItemAsync: jest.fn(async (key) => { values.delete(key); }),
  };
  return { store, values, storage: createSessionStorage(store) };
}
describe('native session storage', () => {
  test('round trips a large Unicode session using bounded secure chunks', async () => {
    const { storage, values } = setup();
    const session = JSON.stringify({ access_token: 'x'.repeat(5000), user: { name: 'पवन 👰'.repeat(100) } });
    await storage.setItem('session', session);
    expect(await storage.getItem('session')).toBe(session);
    expect(values.size).toBeGreaterThan(3);
    expect([...values.values()].every((value) => Buffer.byteLength(value, 'utf8') <= 1800)).toBe(true);
  });
  test('keeps the previous session when a replacement write fails', async () => {
    const { storage, store } = setup();
    await storage.setItem('session', 'old-session');
    jest.mocked(store.setItemAsync).mockRejectedValueOnce(new Error('device locked'));
    await expect(storage.setItem('session', 'new-session')).rejects.toThrow('device locked');
    expect(await storage.getItem('session')).toBe('old-session');
  });
  test('removes superseded chunks and deletes all session material on sign out', async () => {
    const { storage, values } = setup();
    await storage.setItem('session', 'x'.repeat(5000));
    await storage.setItem('session', 'new');
    expect(values.size).toBe(2);
    await storage.removeItem('session');
    expect(values.size).toBe(0);
    expect(await storage.getItem('session')).toBeNull();
  });
  test('fails closed when a chunk is missing or the manifest is corrupt', async () => {
    const { storage, values } = setup();
    await storage.setItem('session', 'session-value');
    const chunk = [...values.keys()].find((key) => key !== 'session')!;
    values.delete(chunk);
    expect(await storage.getItem('session')).toBeNull();
    values.set('session', '{bad-json');
    expect(await storage.getItem('session')).toBeNull();
  });
  test('serializes concurrent refresh and sign-out operations', async () => {
    const { storage, values } = setup();
    await Promise.all([storage.setItem('session', 'refreshed'), storage.removeItem('session')]);
    expect(await storage.getItem('session')).toBeNull();
    expect(values.size).toBe(0);
  });
  test('continues processing after a failed write', async () => {
    const { storage, store } = setup();
    jest.mocked(store.setItemAsync).mockRejectedValueOnce(new Error('full'));
    await expect(storage.setItem('session', 'first')).rejects.toThrow();
    await storage.setItem('session', 'second');
    expect(await storage.getItem('session')).toBe('second');
  });
});
