import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { authStorage, authLock } from './auth-storage';
import { environment } from '../config/environment';
import { installNativeAuthCrypto } from './native-auth-crypto';

installNativeAuthCrypto(globalThis);

export const supabase = environment.ready ? createClient(
  environment.supabaseUrl,
  environment.supabasePublishableKey,
  {
    auth: {
      storage: authStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
      lock: authLock,
    },
  },
) : null;
