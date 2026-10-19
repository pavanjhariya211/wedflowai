import type { SupabaseClient } from '@supabase/supabase-js';

export function createAuthService(client: SupabaseClient, redirectUrl: string) {
  return {
    async signIn(email: string, password: string) {
      const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
    },
    async register(email: string, password: string) {
      const { data, error } = await client.auth.signUp({
        email: email.trim(), password,
        options: { emailRedirectTo: redirectUrl },
      });
      if (error) throw error;
      return { signedIn: Boolean(data.session) };
    },
    async resetPassword(email: string) {
      const { error } = await client.auth.resetPasswordForEmail(email.trim(), { redirectTo: redirectUrl });
      if (error) throw error;
    },
    async resendVerification(email: string) {
      const { error } = await client.auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: redirectUrl } });
      if (error) throw error;
    },
    async updatePassword(password: string) {
      const { error } = await client.auth.updateUser({ password });
      if (error) throw error;
    },
    async signOut() {
      const { error } = await client.auth.signOut({ scope: 'local' });
      if (error) throw error;
    },
  };
}
