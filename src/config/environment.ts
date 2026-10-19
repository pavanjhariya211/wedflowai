export type AppEnvironment =
  | { ready: true; supabaseUrl: string; supabasePublishableKey: string }
  | { ready: false; message: string };

export function validateEnvironment(url?: string, key?: string): AppEnvironment {
  if (!url?.trim() || !key?.trim()) {
    return { ready: false, message: 'Connect your Supabase development project to enable sign in.' };
  }
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password ||
        parsed.pathname !== '/' || parsed.search || parsed.hash) {
      throw new Error('invalid URL');
    }
    // Only current client publishable keys are accepted. Secret/service-role keys
    // must never be bundled into an Expo application.
    if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key.trim())) {
      return { ready: false, message: 'Use the Supabase publishable client key, never a secret or service-role key.' };
    }
    return { ready: true, supabaseUrl: parsed.origin, supabasePublishableKey: key.trim() };
  } catch {
    return { ready: false, message: 'The Supabase project URL must be a valid HTTPS origin.' };
  }
}

// Expo requires static property access to inline public variables into native bundles.
export const environment = validateEnvironment(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);
