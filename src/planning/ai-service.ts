import type { Session } from '@supabase/supabase-js';
import { validateFacts } from './intake';
export async function interpretBrief(session: Session, wedding: string, workspace: string, brief: string) {
 const endpoint = typeof window !== 'undefined' && window.location?.protocol?.startsWith('http')
  ? new URL('/.netlify/functions/plan-intake', window.location.origin).toString()
  : 'https://wedflowai.netlify.app/.netlify/functions/plan-intake';
 const result = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
  body: JSON.stringify({ wedding, workspace, brief }), signal: AbortSignal.timeout(30000) });
 if (!result.ok) throw new Error('AI assistance is unavailable. A rules-based proposal is ready instead.');
 const data = await result.json() as { source?: string; facts?: unknown };
 if (data.source !== 'ai') throw new Error('AI interpretation was not returned.');
 return validateFacts(data.facts);
}
