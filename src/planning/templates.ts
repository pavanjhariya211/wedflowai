import type { Task, TaskInput } from './models';
// Editorial planning suggestions, not cultural rules or vendor commitments.
const starter = [
 ['budget', 'Agree your planning budget', 'Budget and vendor payments', 240],
 ['venue', 'Shortlist and confirm a venue', 'Venue and facilities', 210],
 ['guest-list', 'Draft your guest list', 'Guests and invitations', 180],
 ['photo', 'Compare photography options', 'Photography and entertainment', 150],
 ['food', 'Discuss menus and catering', 'Food and catering', 120],
 ['clothing', 'Plan outfits and fitting dates', 'Clothing and accessories', 100],
 ['decor', 'Review decoration ideas and quotes', 'Decoration and setup', 90],
 ['stay', 'Plan guest accommodation and travel', 'Accommodation and transportation', 75],
 ['invites', 'Review and send invitations', 'Guests and invitations', 60],
 ['gifts', 'Prepare your shopping and gift list', 'Shopping and gifts', 45],
 ['beauty', 'Confirm grooming appointments', 'Beauty and grooming', 30],
 ['schedule', 'Review the wedding-day run sheet', 'Wedding-day execution', 14],
 ['vendors', 'Reconfirm vendor timings and contacts', 'Wedding-day execution', 7],
 ['handoff', 'Share final responsibilities with your family', 'Wedding-day execution', 2],
] as const;
export function shiftDay(day: string, days: number) {
 const date = new Date(`${day}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + days); return date.toISOString().slice(0, 10);
}
export function previewPlan(weddingDate: string, start: string, workspace: string, owner: string,
 existing: Task[], id: () => string): (TaskInput & { originalSuggestion: string })[] {
 return starter.filter(([key]) => !existing.some((t) => t.workspace_id === workspace && !t.personal && t.template_key === `starter:${key}`))
 .map(([key, title, category, lead]) => {
  const suggested = shiftDay(weddingDate, -lead);
  return { id: id(), workspace_id: workspace, title, category, notes: '', personal: false, owner_id: owner,
   planned_start: null, due_date: suggested < start ? start : suggested, originalSuggestion: suggested,
   date_kind: 'planned', status: 'not_started', priority: 'normal', template_key: `starter:${key}`, ceremony_ids: [] };
 });
}
export function activeTask(t: Task) { return !['completed', 'cancelled', 'archived'].includes(t.status); }
export function validateTask(t: TaskInput): string {
 if (!t.title.trim() || t.title.trim().length > 160) return 'Enter a task name of up to 160 characters.';
 if (!t.category.trim() || t.category.trim().length > 80) return 'Enter a category of up to 80 characters.';
 if (t.notes.length > 4000) return 'Use up to 4,000 characters for notes.';
 if (!t.owner_id || !t.workspace_id) return 'Choose a permitted workspace and owner.';
 if (t.planned_start && t.due_date && t.planned_start > t.due_date) return 'The deadline must be on or after the start date.';
 return '';
}
