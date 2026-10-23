import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (process.env.NETLIFY === 'true' && (!key || !process.env.EXPO_PUBLIC_SUPABASE_URL?.trim())) {
    throw new Error('Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY in Netlify environment variables before building.');
  }
  // Expo loads .env files before evaluating config. Stop before Metro can inline
  // an accidentally supplied admin/legacy JWT credential into a native bundle.
  if (key && !/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) {
    throw new Error('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY must contain only a Supabase publishable client key. Never bundle secret or service-role keys.');
  }
  return { ...config, name: config.name ?? 'Wedflow', slug: config.slug ?? 'wedflowai' };
};
