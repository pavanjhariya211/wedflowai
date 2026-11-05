import { authStorage } from '../lib/auth-storage';

const key = 'wedflow.pending-invitation';
const lifetime = 24 * 60 * 60 * 1000;
export const validInvitationToken = (token: unknown): token is string => typeof token === 'string' && /^[a-f0-9]{64}$/.test(token);

export function invitationLink(token: string): string {
 if (!validInvitationToken(token)) throw new Error('Invalid invitation');
 // Fragments are not sent to the hosting server or included in Referer headers.
 return `https://wedflowai.netlify.app/join#invite=${token}`;
}
export function tokenFromInvitationUrl(url: string): string | null {
 const parsed = new URL(url);
 const token = new URLSearchParams(parsed.hash.slice(1)).get('invite');
 if (!validInvitationToken(token)) return null;
 return token;
}
export async function rememberInvitation(token: string) {
 if (!validInvitationToken(token)) throw new Error('Invalid invitation');
 await authStorage.setItem(key, JSON.stringify({token,expires:Date.now()+lifetime}));
}
export async function pendingInvitation(): Promise<string | null> {
 const raw = await authStorage.getItem(key);
 if (!raw) return null;
 try {
  const record = JSON.parse(raw);
  if (validInvitationToken(record.token) && Number.isFinite(record.expires) && record.expires > Date.now() && record.expires <= Date.now()+lifetime) return record.token;
 } catch { /* Discard malformed local state; the server remains authoritative. */ }
 await clearInvitation(); return null;
}
export async function clearInvitation() { await authStorage.removeItem(key); }

export function whatsappInvitationUrl(token: string): string {
 const message = `Join our wedding on Wedflow: ${invitationLink(token)}\nSign in and accept to join our plan. This invitation is for one person; please do not forward it.`;
 return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
