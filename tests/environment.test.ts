import { validateEnvironment } from '../src/config/environment';
const key = 'sb_publishable_test_only';
describe('mobile configuration', () => {
  test('fails closed without configuration', () => { expect(validateEnvironment().ready).toBe(false); });
  test.each(['http://example.supabase.co', 'https://user:password@example.supabase.co', 'https://example.supabase.co/path', 'not-a-url'])('rejects unsafe project URL %s', (url) => {
    expect(validateEnvironment(url, key).ready).toBe(false);
  });
  test.each(['sb_secret_do_not_bundle', 'eyJhbGciOiJIUzI1NiJ9.service-role', 'placeholder'])('rejects non-publishable keys', (value) => {
    expect(validateEnvironment('https://example.supabase.co', value).ready).toBe(false);
  });
  test('normalizes a valid HTTPS project origin', () => {
    expect(validateEnvironment(' https://example.supabase.co/ ', ` ${key} `)).toEqual({ ready: true, supabaseUrl: 'https://example.supabase.co', supabasePublishableKey: key });
  });
});
