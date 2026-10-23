export const statuses = ['not_started', 'in_progress', 'blocked', 'completed', 'cancelled', 'archived'] as const;
export type TaskStatus = typeof statuses[number];
export type Task = {
 id: string; wedding_id: string; workspace_id: string; title: string; category: string; notes: string;
 planned_start: string | null; due_date: string | null; owner_id: string; personal: boolean;
 status: TaskStatus; priority: 'low' | 'normal' | 'high'; date_kind: 'planned' | 'confirmed';
 template_key: string | null; version: number; task_ceremonies: { ceremony_id: string }[];
};
export type TaskInput = Omit<Task, 'version' | 'wedding_id' | 'task_ceremonies'> & { ceremony_ids: string[] };
export type TaskHistory = { id: string; actor_id: string; created_at: string; old_values: Task | null; new_values: Task };
export const labelStatus = (status: string) => status.replaceAll('_', ' ');
export const categories = ['Wedding dates and ceremonies', 'Venue and facilities', 'Food and catering', 'Decoration and setup',
 'Gold and jewellery', 'Clothing and accessories', 'Shopping and gifts', 'Guests and invitations',
 'Accommodation and transportation', 'Photography and entertainment', 'Beauty and grooming',
 'Rituals and traditions', 'Budget and vendor payments', 'Wedding-day execution'];
