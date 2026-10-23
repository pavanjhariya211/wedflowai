import { useState, useRef } from 'react';
import { randomUUID } from 'expo-crypto';
import { useAuth } from '../auth/AuthProvider';
import { Body, Button, Card, Field, Notice } from '../components/ui';
import { useWedding } from '../wedding/WeddingProvider';
import { indianDate, parseIndianDate, todayIndia, weddingError } from '../wedding/validation';
import { previewPlan, validateTask } from './templates';
import type { Task, TaskInput } from './models';
import type { createPlanningService } from './service';

export function PlanPreview({ tasks, workspace, service, onDone }: { tasks: Task[]; workspace: string; service: ReturnType<typeof createPlanningService>; onDone: () => void }) {
 const { wedding, spaces } = useWedding(); const { session } = useAuth();
 const [today] = useState(() => parseIndianDate(todayIndia())!);
 const [items, setItems] = useState(() => previewPlan(wedding!.main_date, wedding!.planning_start > today ? wedding!.planning_start : today, workspace, session!.user.id, tasks, randomUUID)
  .map((t) => ({ ...t, included: true, date: indianDate(t.due_date!) })));
 const [failure, setFailure] = useState(''), [busy, setBusy] = useState(false); const locked = useRef(false);
 function change(i: number, fields: Partial<typeof items[number]>) { setItems((all) => all.map((t, n) => n === i ? { ...t, ...fields } : t)); }
 async function apply() {
  if (locked.current) return;
  const chosen = items.filter((t) => t.included);
  if (!chosen.length) { setFailure('Keep at least one task, or cancel this preview.'); return; }
  const payload: TaskInput[] = [];
  for (const item of chosen) {
   const { included: _included, date, originalSuggestion: _suggestion, ...task } = item;
   task.due_date = parseIndianDate(date);
   if (!task.due_date) { setFailure('Use a valid DD/MM/YYYY date for every retained task.'); return; }
   const error = validateTask(task); if (error) { setFailure(error); return; } payload.push(task);
  }
  locked.current = true; setBusy(true); setFailure('');
  try { await service.plan(payload); onDone(); } catch (e) { setFailure(weddingError(e)); }
  finally { locked.current = false; setBusy(false); }
 }
 return <Card><Body>Review your starter plan</Body>
  <Notice>Nothing has been saved. Keep, remove, rename and reschedule suggestions below. Dates are planning suggestions, never vendor-confirmed commitments.</Notice>
  <Body>Visible to {spaces.find((s) => s.id === workspace)?.name}. You will initially own every retained task.</Body>
  {wedding!.main_date < today ? <Notice error>Your wedding date is in the past. Edit it in Home or enter your own task dates.</Notice> : null}
  {failure ? <Notice error>{failure}</Notice> : null}
  {!items.length ? <Body>These starter tasks already exist in this workspace. Create custom tasks or edit the existing plan.</Body> : null}
  {items.map((t, i) => <Card key={t.id}>
   <Button secondary title={`${t.included ? '✓ Keep' : 'Excluded'}: ${t.title}`} onPress={() => change(i, { included: !t.included })} disabled={busy} />
   {t.included ? <><Field label="Suggested task name" value={t.title} onChangeText={(title) => change(i, { title })} editable={!busy} />
    <Field label="Task category" value={t.category} onChangeText={(category) => change(i, { category })} editable={!busy} />
    <Field label="Suggested deadline" value={t.date} onChangeText={(date) => change(i, { date })} editable={!busy} />
    {t.originalSuggestion < (wedding!.planning_start > today ? wedding!.planning_start : today) ? <Notice>This suggestion would normally start earlier ({indianDate(t.originalSuggestion)}). Its date has been brought into your planning window for review. Check feasibility before saving.</Notice> : null}
   </> : null}
  </Card>)}
  <Button title={`Save ${items.filter((t) => t.included).length} reviewed tasks`} busy={busy} disabled={!items.length} onPress={() => { void apply(); }} />
  <Button secondary title="Cancel preview" onPress={onDone} disabled={busy} />
 </Card>;
}
