import type { SupabaseClient } from '@supabase/supabase-js';
import type { Ceremony, CeremonyDraft, Invitation, Member, Role, Wedding, WeddingDraft, Workspace } from './models';
import { ceremonyInstant, parseIndianDate, parseRupees } from './validation';

export function createWeddingService(client: SupabaseClient) {
  async function rpc(name: string, args: Record<string, unknown>) {
    const { data, error } = await client.rpc(name, args);
    if (error) throw error;
    return data as unknown;
  }
  return {
    async weddings(): Promise<Wedding[]> {
      const { data, error } = await client.from('weddings').select('*').order('created_at');
      if (error) throw error;
      return data as Wedding[];
    },
    async details(id: string) {
      const results = await Promise.all([
        client.rpc('wf_workspace_access', { p_wedding: id }),
        client.from('ceremonies').select('*').eq('wedding_id', id).order('start_date').order('starts_at', { nullsFirst: true }),
        client.from('workspace_memberships').select('workspace_id,user_id,role,profiles(display_name)'),
        client.from('invitations').select('id,workspace_id,email,role,expires_at,accepted_at,revoked_at'),
      ]);
      for (const result of results) if (result.error) throw result.error;
      const spaces = results[0]!.data as Workspace[];
      const ids = new Set(spaces.map((s) => s.id));
      return { spaces, ceremonies: results[1]!.data as Ceremony[],
        members: (results[2]!.data as unknown as Member[]).filter((m) => ids.has(m.workspace_id)),
        invitations: (results[3]!.data as Invitation[]).filter((i) => ids.has(i.workspace_id)) };
    },
    async create(id: string, d: WeddingDraft): Promise<string> {
      return await rpc('wf_create_wedding', { p_id: id, p_title: d.title.trim(), p_date: parseIndianDate(d.date), p_start: parseIndianDate(d.start),
        p_city: d.city.trim(), p_budget: parseRupees(d.budget), p_mode: d.mode, p_format: d.format, p_name: d.name.trim(), p_family_a: d.familyA.trim(), p_family_b: d.familyB.trim() }) as string;
    },
    async update(wedding: Wedding, d: WeddingDraft) {
      await rpc('wf_update_wedding', { p_id: wedding.id, p_version: wedding.version, p_title: d.title.trim(), p_date: parseIndianDate(d.date), p_start: parseIndianDate(d.start), p_city: d.city.trim(), p_budget: parseRupees(d.budget), p_format: d.format });
    },
    async saveCeremony(id: string, wedding: string, d: CeremonyDraft, version: number | null = null) {
      await rpc('wf_save_ceremony', { p_id: id, p_wedding: wedding, p_workspace: d.workspace, p_title: d.title.trim(), p_start: parseIndianDate(d.start), p_end: parseIndianDate(d.end),
        p_all_day: d.allDay, p_starts_at: d.allDay ? null : ceremonyInstant(d.start, d.startTime), p_ends_at: d.allDay ? null : ceremonyInstant(d.end, d.endTime), p_venue: d.venue.trim(), p_version: version });
    },
    async unshareCeremony(c: Ceremony, workspace: string) { await rpc('wf_unshare_ceremony', { p_id: c.id, p_version: c.version, p_workspace: workspace }); },
    async shareCeremony(c: Ceremony) { await rpc('wf_share_ceremony', { p_id: c.id, p_version: c.version }); },
    async deleteCeremony(c: Ceremony) { await rpc('wf_delete_ceremony', { p_id: c.id, p_version: c.version }); },
    async invite(workspace: string, email: string, role: Role): Promise<string> {
      return await rpc('wf_invite', { p_workspace: workspace, p_email: email.trim(), p_role: role }) as string;
    },
    async accept(token: string, name: string): Promise<string> {
      return await rpc('wf_accept_invite', { p_token: token.trim(), p_name: name.trim() }) as string;
    },
    async revokeInvite(id: string) { await rpc('wf_revoke_invite', { p_id: id }); },
    async changeMember(workspace: string, user: string, role: Role | null) {
      await rpc('wf_change_member', { p_workspace: workspace, p_user: user, p_role: role });
    },
  };
}
