import type { SupabaseClient } from '@supabase/supabase-js';

export type CallbackResult = 'signed-in' | 'recovery';
export function parseAuthCallback(url: string) {
  const parsed = new URL(url);
  if (parsed.searchParams.has('error') || parsed.searchParams.has('error_code')) {
    throw new Error('The authentication link is invalid or expired. Request a new link.');
  }
  const code = parsed.searchParams.get('code');
  if (!code || code.length > 4096) throw new Error('This link is incomplete. Open the latest email link on the device where you requested it.');
  const flowId = parsed.searchParams.get('sb_flow_id');
  if (flowId !== null && !/^[a-zA-Z0-9_-]{8,64}$/.test(flowId)) {
    throw new Error('This authentication flow is invalid. Request a new link.');
  }
  return { code, flowId };
}

// PKCE only: never accept bearer tokens injected via URL fragments.
export async function exchangeAuthCallback(client: SupabaseClient, url: string): Promise<CallbackResult> {
  const { code, flowId } = parseAuthCallback(url);
  let recovery = false;
  const { data: { subscription } } = client.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') recovery = true;
  });
  try {
    const { error } = await client.auth.exchangeCodeForSession(code, flowId ? { flowId } : undefined);
    if (error) throw error;
    return recovery ? 'recovery' : 'signed-in';
  } finally { subscription.unsubscribe(); }
}
