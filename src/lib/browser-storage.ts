// Browser storage is origin-scoped, not an OS keychain. Keep tokens out of URLs,
// logs and exports. Storage failures must surface instead of pretending to persist.
export function createBrowserStorage(resolve: () => Storage | null) {
  return {
    getItem: (key: string) => resolve()?.getItem(key) ?? null,
    setItem: (key: string, value: string) => {
      const storage = resolve();
      if (!storage) throw new Error('Browser session storage is unavailable.');
      storage.setItem(key, value);
    },
    removeItem: (key: string) => { resolve()?.removeItem(key); },
  };
}
