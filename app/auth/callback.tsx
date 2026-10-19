import { useEffect, useState } from 'react';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useAuth } from '../../src/auth/AuthProvider';
import { exchangeAuthCallback } from '../../src/auth/callback';
import { friendlyAuthError } from '../../src/auth/errors';
import { Button, Heading, Loading, Notice, Screen } from '../../src/components/ui';
import { supabase } from '../../src/lib/supabase';

// Module-level deduplication prevents a single-use code being exchanged twice
// during React remounts or duplicate native link events. Retain only one entry.
let currentExchange: { url: string; result: ReturnType<typeof exchangeAuthCallback> } | null = null;
export default function Callback() {
  const url = Linking.useURL();
  const { beginRecovery } = useAuth();
  const [failure, setFailure] = useState('');
  useEffect(() => {
    if (!url || !supabase) return;
    let active = true;
    if (currentExchange?.url !== url) currentExchange = { url, result: exchangeAuthCallback(supabase, url) };
    void currentExchange.result.then((result) => {
      if (!active) return;
      if (result === 'recovery') beginRecovery();
      router.replace(result === 'recovery' ? '/auth/update-password' : '/');
    }).catch((error: unknown) => {
      if (active) setFailure(error instanceof Error && !('code' in error) ? 'This link could not be verified. Request a new link in the app on this device.' : friendlyAuthError(error));
    });
    return () => { active = false; };
  }, [url, beginRecovery]);
  useEffect(() => {
    const timeout = setTimeout(() => setFailure('No usable authentication link was received. Request a fresh link in the app.'), 20000);
    return () => clearTimeout(timeout);
  }, []);
  if (failure) return <Screen><Heading title="Let’s try a fresh link." /><Notice error>{failure}</Notice>
    <Button title="Continue" onPress={() => router.replace('/')} /></Screen>;
  return <Loading message="Verifying your secure link…" />;
}
