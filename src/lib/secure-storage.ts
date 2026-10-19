export interface SecureKeyValueStore {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
}
type Manifest = { generation: string; count: number };
const CHUNK_SIZE = 1800;
const MAX_CHUNKS = 128;

function parseManifest(value: string | null): Manifest | null {
  try {
    const data = JSON.parse(value ?? 'null') as Manifest | null;
    return data && /^[a-z0-9-]+$/.test(data.generation) &&
      Number.isInteger(data.count) && data.count > 0 && data.count <= MAX_CHUNKS ? data : null;
  } catch { return null; }
}

// Supabase JWT sessions can exceed a single SecureStore value's size limit.
// Write a new generation before publishing its manifest; interrupted writes do
// not replace the last complete session. Values never go into AsyncStorage.
export function createSecureStorage(store: SecureKeyValueStore) {
  let sequence = 0;
  let pending = Promise.resolve();
  const chunkKey = (key: string, m: Manifest, index: number) => `${key}.${m.generation}.${index}`;
  async function clearGeneration(key: string, manifest: Manifest | null) {
    if (!manifest) return;
    await Promise.all(Array.from({ length: manifest.count }, (_, i) => store.deleteItemAsync(chunkKey(key, manifest, i))));
  }
  function serialized<T>(operation: () => Promise<T>): Promise<T> {
    const result = pending.then(operation);
    pending = result.then(() => undefined, () => undefined);
    return result;
  }
  return {
    getItem: (key: string) => serialized(async () => {
      const manifest = parseManifest(await store.getItemAsync(key));
      if (!manifest) return null;
      const chunks = await Promise.all(Array.from({ length: manifest.count }, (_, i) => store.getItemAsync(chunkKey(key, manifest, i))));
      return chunks.some((chunk) => chunk === null) ? null : chunks.join('');
    }),
    setItem: (key: string, value: string) => serialized(async () => {
      // JSON sessions contain Unicode metadata. Escaping keeps each chunk's byte
      // count within SecureStore's limit and JSON.parse restores the original.
      const encoded = JSON.stringify(value).replace(/[\u007f-\uffff]/g,
        (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`);
      const count = Math.ceil(encoded.length / CHUNK_SIZE);
      if (count > MAX_CHUNKS) throw new Error('Session exceeds secure storage capacity');
      const old = parseManifest(await store.getItemAsync(key));
      const next = { generation: `${Date.now().toString(36)}-${(++sequence).toString(36)}`, count };
      try {
        for (let i = 0; i < count; i++) await store.setItemAsync(chunkKey(key, next, i), encoded.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE));
        await store.setItemAsync(key, JSON.stringify(next));
      } catch (error) {
        await clearGeneration(key, next).catch(() => undefined);
        throw error;
      }
      // An old-generation cleanup failure must not invalidate the saved session.
      await clearGeneration(key, old).catch(() => undefined);
    }),
    removeItem: (key: string) => serialized(async () => {
      const old = parseManifest(await store.getItemAsync(key));
      await store.deleteItemAsync(key);
      await clearGeneration(key, old);
    }),
  };
}

export function createSessionStorage(store: SecureKeyValueStore) {
  const storage = createSecureStorage(store);
  return {
    ...storage,
    async getItem(key: string): Promise<string | null> {
      const value = await storage.getItem(key);
      if (value === null) return null;
      try { const decoded: unknown = JSON.parse(value); return typeof decoded === 'string' ? decoded : null; } catch { return null; }
    },
  };
}
