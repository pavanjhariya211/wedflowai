import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';
import * as Linking from 'expo-linking';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { createAuthService } from './service';

type AuthContextValue = {
  session: Session | null;
  loading: boolean;
  recovery: boolean;
  startupError: boolean;
  retrySession: () => Promise<void>;
  finishRecovery: () => void;
  beginRecovery: () => void;
  service: ReturnType<typeof createAuthService> | null;
};
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [startupError, setStartupError] = useState(false);
  const [recovery, setRecovery] = useState(false);
  const service = useMemo(() => supabase ? createAuthService(supabase, Linking.createURL('auth/callback')) : null, []);
  const retrySession = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setStartupError(false);
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      setSession(data.session);
    } catch { setStartupError(true); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    let authEventReceived = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      authEventReceived = true;
      if (!active) return;
      setSession(nextSession);
      setLoading(false);
      setStartupError(false);
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      if (event === 'SIGNED_OUT') setRecovery(false);
    });
    // Do not let a slower initial read overwrite a newer sign-in/sign-out event.
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active || authEventReceived) return;
      if (error) setStartupError(true);
      else setSession(data.session);
      setLoading(false);
    }).catch(() => {
      if (active) { setStartupError(true); setLoading(false); }
    });
    const refresh = (state: string | null | undefined) => {
      if (state === 'active') supabase?.auth.startAutoRefresh();
      else supabase?.auth.stopAutoRefresh();
    };
    refresh(AppState.currentState);
    const listener = AppState.addEventListener('change', refresh);
    return () => { active = false; subscription.unsubscribe(); listener.remove(); supabase?.auth.stopAutoRefresh(); };
  }, []);

  const beginRecovery = useCallback(() => setRecovery(true), []);
  const finishRecovery = useCallback(() => setRecovery(false), []);

  return <AuthContext.Provider value={{ session, loading, recovery, startupError, retrySession, service,
    beginRecovery, finishRecovery }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
