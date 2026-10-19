export type Role = 'admin' | 'member' | 'viewer';
export type Wedding = {
  id: string; title: string; main_date: string; planning_start: string; city: string | null;
  budget_paise: number | null; sharing_mode: 'shared' | 'separate'; format: 'single' | 'multi';
  timezone: string; creator_id: string; version: number;
};
export type Workspace = { id: string; name: string; kind: 'shared' | 'family'; can_edit: boolean; can_manage: boolean; bootstrap: boolean };
export type Ceremony = { created_by: string; id: string; wedding_id: string; workspace_id: string; title: string; start_date: string; end_date: string; all_day: boolean; starts_at: string | null; ends_at: string | null; venue: string | null; version: number };
export type Member = { workspace_id: string; user_id: string; role: Role; profiles: { display_name: string } };
export type Invitation = { id: string; workspace_id: string; email: string; role: Role; expires_at: string; accepted_at: string | null; revoked_at: string | null };
export type WeddingDraft = { name: string; title: string; date: string; start: string; city: string; budget: string; mode: 'shared' | 'separate'; format: 'single' | 'multi'; familyA: string; familyB: string };
export type CeremonyDraft = { title: string; start: string; end: string; allDay: boolean; startTime: string; endTime: string; venue: string; workspace: string };
