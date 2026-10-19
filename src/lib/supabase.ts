import 'react-native-url-polyfill/auto';
import { createClient, processLock } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { environment } from '../config/environment';
import { installNativeAuthCrypto } from './native-auth-crypto';
import { createSessionStorage } from './secure-storage';

installNativeAuthCrypto(globalThis);

export const supabase = environment.ready ? createClient(
  environment.supabaseUrl,
  environment.supabasePublishableKey,
  {
    auth: {
      storage: createSessionStorage(SecureStore),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
      lock: processLock,
    },
  },
) : null;
