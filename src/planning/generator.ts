import type { Ceremony, Wedding } from '../wedding/models';
import type { Task, TaskInput } from './models';
import type { IntakeFacts } from './intake';
import { activeTask, shiftDay } from './templates';
export type Rule = { key: string; title: string; category: string; lead: number; days: number; after: string[]; why: string; ceremony?: string };
export const planningRules: Rule[] = [
 { key: 'budget', title: 'Agree your planning budget', category: 'Budget and vendor payments', lead: 240, days: 2, after: [], why: 'A spending envelope helps compare quotes without committing to invented prices.' },
 { key: 'guest-list', title: 'Draft your guest list', category: 'Guests and invitations', lead: 180, days: 4, after: [], why: 'A working guest count informs venue capacity, catering and accommodation.' },
 { key: 'venue', title: 'Shortlist and confirm a venue', category: 'Venue and facilities', lead: 210, days: 7, after: ['budget','guest-list'], why: 'Review capacity and budget before making the venue decision.' },
 { key: 'photo', title: 'Compare photography options', category: 'Photography and entertainment', lead: 150, days: 4, after: ['venue'], why: 'Venue and function timings make photography requirements clearer.' },
 { key: 'food', title: 'Discuss menus and catering', category: 'Food and catering', lead: 120, days: 5, after: ['venue','guest-list'], why: 'Menu planning follows the venue decision and a working guest count.' },
 { key: 'clothing', title: 'Plan outfits and fitting dates', category: 'Clothing and accessories', lead: 100, days: 7, after: ['budget'], why: 'Allow room for selection, fittings and alterations; confirm actual lead times.' },
 { key: 'decor', title: 'Review decoration ideas and quotes', category: 'Decoration and setup', lead: 90, days: 5, after: ['venue','budget'], why: 'Layout and venue rules should inform decoration choices.' },
 { key: 'invites', title: 'Review and send invitations', category: 'Guests and invitations', lead: 60, days: 4, after: ['venue','guest-list'], why: 'Only send venue details after checking the venue decision.' },
 { key: 'gifts', title: 'Prepare your shopping and gift list', category: 'Shopping and gifts', lead: 45, days: 3, after: ['budget'], why: 'An optional list keeps shopping within the spending plan; it does not execute purchases.' },
 { key: 'beauty', title: 'Confirm grooming appointments', category: 'Beauty and grooming', lead: 30, days: 2, after: [], why: 'An optional appointment checkpoint; no providers or cultural preferences are assumed.' },
 { key: 'schedule', title: 'Review the wedding-day run sheet', category: 'Wedding-day execution', lead: 14, days: 2, after: ['food','photo','decor'], why: 'Bring the main vendor decisions together before coordinating the day.' },
 { key: 'vendors', title: 'Reconfirm vendor timings and contacts', category: 'Wedding-day execution', lead: 7, days: 1, after: ['schedule'], why: 'Reconfirmation follows the draft run sheet; availability must be checked with vendors.' },
 { key: 'handoff', title: 'Share final responsibilities with your family', category: 'Wedding-day execution', lead: 2, days: 1, after: ['vendors'], why: 'Review responsibilities after the timings are checked. No messages are sent automatically.' },
];
const millis = (day: string) => new Date(`${day}T00:00:00Z`).getTime();
export const daysBetween = (a: string, b: string) => Math.round((millis(b) - millis(a)) / 86400000);
export type GeneratedTask = TaskInput & { reason: string; predecessors: string[]; risk: string | null };
export type GeneratedPlan = { tasks: GeneratedTask[]; warnings: string[]; assumptions: string[]; skipped: number };
export function generatePlan(input: { wedding: Wedding; today: string; workspace: string; owner: string; facts: IntakeFacts; existing: Task[]; ceremonies: Ceremony[]; sharedWorkspaces?: string[]; id: () => string }): GeneratedPlan {
 const { wedding, today, workspace, owner, facts, existing, id } = input;
 const start = wedding.planning_start > today ? wedding.planning_start : today;
 const available = daysBetween(start, wedding.main_date);
 if (available < 0) return { tasks: [], warnings: ['The wedding date is in the past. Update it before generating a new timeline.'], assumptions: [], skipped: 0 };
 const skipped = new Set<string>();
 if (facts.venueBooked) skipped.add('venue'); if (facts.cateringBooked) skipped.add('food'); if (facts.photographyBooked) skipped.add('photo');
 const rules = [...planningRules];
 if (facts.travelNeeded) rules.splice(8, 0, { key: 'stay', title: 'Plan guest accommodation and travel', category: 'Accommodation and transportation', lead: 75, days: 4, after: ['venue','guest-list'], why: 'Your brief mentions travel or accommodation; check options after venue and guest estimates.' });
 if (facts.guestCount && facts.guestCount > 200) rules.push({ key: 'capacity', title: 'Check guest flow, capacity and accessibility', category: 'Venue and facilities', lead: 60, days: 2, after: ['venue','guest-list'], why: `Your estimate is ${facts.guestCount} guests. Confirm usable capacity and access rather than assuming the venue can accommodate everyone.` });
 const linked = input.ceremonies.filter((c) => c.workspace_id === workspace || input.sharedWorkspaces?.includes(c.workspace_id));
 for (const c of linked) rules.push({ key: `function-${c.id}`, title: `Coordinate ${c.title}`.slice(0,160), category: 'Wedding-day execution', lead: Math.max(1, daysBetween(c.start_date, wedding.main_date) + 14), days: 2, after: ['venue'], why: `Prepare the arrangements for your saved ceremony, ${c.title}. Its actual ceremony date stays unchanged.`, ceremony: c.id });
 for (const name of facts.functions.filter((n) => !linked.some((c) => c.title.toLowerCase().includes(n.toLowerCase())))) {
  rules.push({ key: `brief-${encodeURIComponent(name.toLowerCase()).slice(0,60)}`, title: `Review arrangements for ${name}`.slice(0,160), category: 'Wedding dates and ceremonies', lead: 21, days: 2, after: ['venue'], why: 'Named in your brief. The preparation task uses the main wedding date until you add the function and confirm its actual date.' });
 }
 const byKey = new Map(rules.map((r) => [r.key, r])); const ordered: Rule[] = []; const visited = new Set<string>(), visiting = new Set<string>();
 const visit = (key: string) => {
  if (visited.has(key)) return;
  if (visiting.has(key)) throw new Error('Planning rules contain a dependency cycle');
  visiting.add(key); const rule = byKey.get(key); if (!rule) throw new Error('Planning prerequisite is missing');
  rule.after.forEach(visit); visiting.delete(key); visited.add(key); ordered.push(rule);
 }; rules.forEach((r) => visit(r.key));
 const existingByKey = new Map(existing.filter((t) => t.workspace_id === workspace && !t.personal && t.template_key?.startsWith('starter:')).map((t) => [t.template_key!.slice(8), t]));
 const finish = new Map<string, string>(); const tasks: GeneratedTask[] = []; const warnings: string[] = [];
 for (const rule of ordered) {
  const saved = existingByKey.get(rule.key);
  if (saved) { finish.set(rule.key, saved.due_date ?? start); continue; }
  if (skipped.has(rule.key)) { finish.set(rule.key, start); continue; }
  const compressedLead = Math.floor(rule.lead * Math.min(1, available / 270));
  const preferred = shiftDay(wedding.main_date, -compressedLead);
  const predecessorDates = rule.after.map((k) => finish.get(k) ?? start);
  const earliestStart = [start, ...predecessorDates.map((d) => shiftDay(d, 1))].sort().at(-1)!;
  const earliestDue = shiftDay(earliestStart, rule.days - 1);
  const due = preferred > earliestDue ? preferred : earliestDue;
  const eventDate = rule.ceremony ? input.ceremonies.find((c) => c.id === rule.ceremony)?.start_date ?? wedding.main_date : wedding.main_date;
  const risk = due > eventDate ? 'The suggested minimum lead time does not fit before its relevant event. Review or remove this task, or explicitly accept this timing risk.' : null;
  finish.set(rule.key, due);
  tasks.push({ id: id(), workspace_id: workspace, title: rule.title, category: rule.category, notes: `${rule.why}\nSuggested prerequisite decisions: ${rule.after.map((k) => byKey.get(k)!.title).join('; ') || 'None'}.`,
   owner_id: owner, personal: false, planned_start: earliestStart, due_date: due, date_kind: 'planned', status: 'not_started', priority: rule.after.length || risk ? 'high' : 'normal',
   template_key: `starter:${rule.key}`, ceremony_ids: rule.ceremony ? [rule.ceremony] : [], reason: rule.why, predecessors: rule.after, risk });
 }
 if (tasks.some((t) => t.risk)) warnings.push('Some suggested lead times do not fit before the relevant events. A tight schedule is a risk, not a guaranteed feasible plan.');
 if (existing.some((t) => t.workspace_id === workspace)) warnings.push('Your saved tasks and confirmed dates are kept as entered. This proposal only adds missing planning tasks.');
 const assumptions = ['Every new task is initially yours; responsibility changes require your choice.', 'All generated dates are suggestions, not confirmed vendor commitments.',
  `${available} days are available in this planning window. Tasks that depend on earlier decisions are sequenced after them.`];
 if (facts.guestCount) assumptions.push(`Guest estimate: ${facts.guestCount}.`);
 if (skipped.size) assumptions.push(`Already arranged according to your brief/choices: ${[...skipped].join(', ')}. Those booking tasks are omitted.`);
 if (facts.functions.length) assumptions.push('Functions mentioned without saved dates produce preparation tasks; no ceremony is created or given an invented date.');
 if (tasks.length > 60) warnings.push('This proposal contains the first 60 suggestions. After saving them, generate again to review the remaining suggestions.');
 return { tasks: tasks.slice(0,60), warnings, assumptions, skipped: skipped.size + existingByKey.size };
}
export function needsAttention(tasks: Task[], today: string) {
 const result: { task: Task; reason: string; urgency: number }[] = [];
 for (const task of tasks.filter(activeTask)) {
  if (task.status === 'blocked') result.push({ task, reason: 'Marked blocked—review the issue before progressing.', urgency: 0 });
  else if (task.due_date && task.due_date < today) result.push({ task, reason: 'Overdue—review the deadline or progress.', urgency: 1 });
  else if (task.due_date && task.due_date <= shiftDay(today,7)) result.push({ task, reason: 'Due within the next seven days.', urgency: 2 });
  else if (task.template_key?.startsWith('starter:')) {
   const rule = planningRules.find((r) => `starter:${r.key}` === task.template_key);
   const predecessor = rule?.after.map((key) => tasks.find((p) => p.workspace_id === task.workspace_id && p.personal === task.personal && p.template_key === `starter:${key}`))
    .find((p) => p && p.status !== 'completed' && task.planned_start && (p.due_date === null || p.due_date >= task.planned_start));
   if (predecessor) result.push({ task, reason: `Review the sequence: “${predecessor.title}” is unfinished and may affect the planned start.`, urgency: 3 });
  }
 }
 return result.sort((a,b) => a.urgency-b.urgency || (a.task.due_date ?? '9999').localeCompare(b.task.due_date ?? '9999'));
}
