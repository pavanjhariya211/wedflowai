import { useState, useRef } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { Body, Button, Card, Notice } from '../components/ui';
import { useWedding } from '../wedding/WeddingProvider';
import { indianDate, weddingError } from '../wedding/validation';
import { labelStatus, type Task, type TaskHistory } from './models';
import { taskInput, type createPlanningService } from './service';

export function TaskCard({ task, service, onEdit, reload }: { task: Task; service: ReturnType<typeof createPlanningService>; onEdit?: () => void; reload: () => Promise<void> }) {
 const { session } = useAuth(); const { spaces, members, ceremonies } = useWedding();
 const [history, setHistory] = useState<TaskHistory[] | null>(null), [failure, setFailure] = useState('');
 const [busy, setBusy] = useState(false); const locked = useRef(false);
 const scope = spaces.find((s) => s.id === task.workspace_id);
 async function run(action: () => Promise<void>) {
  if (locked.current) return; locked.current = true; setBusy(true); setFailure('');
  try { await action(); } catch (e) { setFailure(weddingError(e)); }
  finally { locked.current = false; setBusy(false); }
 }
 const owner = members.find((m) => m.user_id === task.owner_id)?.profiles.display_name ?? 'Member no longer visible';
 return <Card><Body>{task.title}</Body><Body>{task.category} · {labelStatus(task.status)} · {task.priority} priority</Body>
  <Body>{task.due_date ? `${indianDate(task.due_date)} · ${task.date_kind === 'confirmed' ? 'Confirmed by a member' : 'Planning date'}` : 'No deadline set'}</Body>
  {task.planned_start ? <Body>Start: {indianDate(task.planned_start)}</Body> : null}
  <Body>Owner: {task.owner_id === session?.user.id ? 'You' : owner} · {task.personal ? 'Only you' : scope?.name}</Body>
  {task.notes ? <Body>{task.notes}</Body> : null}
  {task.task_ceremonies.map((link) => ceremonies.find((c) => c.id === link.ceremony_id)?.title).filter(Boolean).map((title, i) => <Body key={i}>Ceremony: {title}</Body>)}
  {failure ? <Notice error>{failure}</Notice> : null}
  {scope?.can_edit ? <>
   {onEdit ? <Button secondary title={`Edit ${task.title}`} disabled={busy} onPress={onEdit} /> : null}
   {!['cancelled','archived'].includes(task.status) ? <Button title={task.status === 'completed' ? `Reopen ${task.title}` : `Complete ${task.title}`} busy={busy} onPress={() => { void run(async () => {
    await service.save({ ...taskInput(task), status: task.status === 'completed' ? 'not_started' : 'completed' }, task.version); setHistory(null); await reload();
   }); }} /> : null}
  </> : <Body>View-only access</Body>}
  <Button secondary title={history ? 'Hide task history' : 'Show task history'} disabled={busy} onPress={() => {
   if (history) setHistory(null); else { void run(async () => { setHistory(await service.history(task.id)); }); }
  }} />
  {history?.map((h) => <Card key={h.id}><Body>{new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(h.created_at))} IST</Body>
   <Body>{h.old_values ? `Updated: ${labelStatus(h.old_values.status)} → ${labelStatus(h.new_values.status)}` : 'Task created'}</Body>
   {h.old_values && h.old_values.due_date !== h.new_values.due_date ? <Body>Deadline: {h.old_values.due_date ? indianDate(h.old_values.due_date) : 'None'} → {h.new_values.due_date ? indianDate(h.new_values.due_date) : 'None'}</Body> : null}
   {h.old_values && h.old_values.title !== h.new_values.title ? <Body>Name: {h.old_values.title} → {h.new_values.title}</Body> : null}
   {h.old_values && h.old_values.owner_id !== h.new_values.owner_id ? <Body>Primary owner changed explicitly</Body> : null}
  </Card>)}
 </Card>;
}
