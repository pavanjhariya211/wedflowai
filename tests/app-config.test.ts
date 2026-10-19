import type { ConfigContext } from 'expo/config';
import appConfig from '../app.config';
const context = { config: { name: 'Wedflow', slug: 'wedflowai' } } as ConfigContext;
const originalKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
afterEach(() => {
  if (originalKey === undefined) delete process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  else process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalKey;
});
test('refuses to evaluate bundle config with a secret key', () => {
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_secret_test_only';
  expect(() => appConfig(context)).toThrow('Never bundle secret or service-role keys');
});
test('allows unconfigured setup and does not copy client values into extra metadata', () => {
  delete process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  expect(appConfig(context).name).toBe('Wedflow');
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test_only';
  expect(appConfig(context).extra).toBeUndefined();
});
