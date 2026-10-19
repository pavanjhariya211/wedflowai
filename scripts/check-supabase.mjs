import assert from 'node:assert/strict';

// Read public client configuration only; never print keys, response bodies or
// auth tokens. --use-env-proxy lets Node 24 honor the cloud HTTPS proxy.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
assert.ok(url && key, 'Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY first.');
const origin = new URL(url);
assert.equal(origin.protocol, 'https:', 'Use an HTTPS Supabase project URL.');
assert.equal(origin.pathname, '/', 'The project URL must not contain a path.');
assert.ok(!origin.username && !origin.password && !origin.search && !origin.hash, 'Use the project origin only.');
assert.match(key, /^sb_publishable_[A-Za-z0-9_-]+$/, 'Use a publishable client key, never a secret or service-role key.');
const response = await fetch(new URL('/auth/v1/settings', origin), {
  headers: { apikey: key }, signal: AbortSignal.timeout(20000),
});
assert.equal(response.status, 200, 'Supabase Auth must accept the client configuration.');
const settings = await response.json();
assert.equal(settings.external?.email, true, 'Enable email authentication in Supabase.');
assert.equal(settings.mailer_autoconfirm, false, 'Enable email confirmation for this development workflow.');
console.log('PASS: Supabase Auth is reachable and accepts the publishable key.');
console.log('Email sign-in and email confirmation are enabled.');
console.log('This read-only check does not establish account sign-in, email delivery or database migration access.');
