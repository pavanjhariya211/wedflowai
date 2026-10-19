import assert from 'node:assert/strict';

const origin = 'http://localhost:8081';
const response = await fetch(origin, {
  headers: { 'expo-platform': 'android', accept: 'application/expo+json' },
  signal: AbortSignal.timeout(30000),
});
assert.equal(response.status, 200, 'Metro must serve the Android manifest');
const manifest = await response.json();
assert.equal(manifest.extra?.expoClient?.name, 'Wedflow');
assert.equal(manifest.extra?.expoClient?.sdkVersion, '58.0.0');
const launch = new URL(manifest.launchAsset.url);
// Some hosts bind localhost to IPv6 while the manifest advertises IPv4.
// Fetch the advertised path through the same reachable local origin.
const bundleResponse = await fetch(new URL(launch.pathname + launch.search, origin), {
  signal: AbortSignal.timeout(60000),
});
assert.equal(bundleResponse.status, 200, 'Metro must compile the Android entry');
const bundle = await bundleResponse.text();
assert.ok(bundle.includes('Your planning space starts here.'), 'Expected app setup module must be present');
console.log('PASS: Android manifest and compiled development bundle served by Metro.');
console.log('This verifies bundling, not native rendering or live Supabase authentication.');
