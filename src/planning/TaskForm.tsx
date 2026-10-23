import { useRef, useState } from 'react';
import { randomUUID } from 'expo-crypto';
import { useAuth } from '../auth/AuthProvider';
import { Body, Button, Card, Field, Notice } from '../components/ui';
import { Choice } from '../wedding/Choice';
import { useWedding } from '../wedding/WeddingProvider';
import { indianDate, parseIndianDate, weddingError } from '../wedding/validation';
import { Alert } from '../lib/confirmation';
import { statuses, labelStatus, type Task, type TaskInput } from './models';
import { taskInput } from './service';
import { validateTask } from './templates';
import type { createPlanningService } from './service';

export function TaskForm({ task, service, onDone }: { task?: Task; service: ReturnType<typeof createPlanningService>; onDone: () => void }) {
 const { session } = useAuth(); const { spaces, members, ceremonies } = useWedding();
 const [draft, setDraft] = useState<TaskInput>(() => task ? taskInput(task) : {
  id: randomUUID(), workspace_id: spaces.find((s) => s.can_edit && s.kind === 'family')?.id ?? spaces.find((s) => s.can_edit)?.id ?? '',
  title: '', category: 'Wedding dates and ceremonies', notes: '', owner_id: session!.user.id, personal: false,
  planned_start: null, due_date: null, status: 'not_started', priority: 'normal', date_kind: 'planned', template_key: null, ceremony_ids: [],
 });
 const [start, setStart] = useState(task?.planned_start ? indianDate(task.planned_start) : '');
 const [due, setDue] = useState(task?.due_date ? indianDate(task.due_date) : '');
 const [failure, setFailure] = useState(''), [busy, setBusy] = useState(false); const locked = useRef(false);
 const scope = spaces.find((s) => s.id === draft.workspace_id);
 const owners = members.filter((m) => m.role !== 'viewer' && (scope?.kind === 'shared' || m.workspace_id === draft.workspace_id))
 .filter((m, i, all) => all.findIndex((n) => n.user_id === m.user_id) === i);
 function change<K extends keyof TaskInput>(key: K, value: TaskInput[K]) { setDraft((d) => ({ ...d, [key]: value })); }
 async function save(next: TaskInput) {
  if (locked.current) return; locked.current = true; setBusy(true); setFailure('');
  try { await service.save(next, task?.version ?? null); onDone(); }
  catch (e) { setFailure(weddingError(e)); }
  finally { locked.current = false; setBusy(false); }
 }
 function submit() {
  const next = { ...draft, title: draft.title.trim(), category: draft.category.trim(), planned_start: start.trim() ? parseIndianDate(start) : null, due_date: due.trim() ? parseIndianDate(due) : null };
  const error = validateTask(next) || (start.trim() && !next.planned_start ? 'Use DD/MM/YYYY for the start date.' : '') || (due.trim() && !next.due_date ? 'Use DD/MM/YYYY for the deadline.' : '');
  setFailure(error); if (error) return;
  if (task && (task.owner_id !== next.owner_id || task.due_date !== next.due_date)) {
   Alert.alert('Review owner and deadline', 'Save these explicit changes? Other task and ceremony dates will stay as entered.', [
    { text: 'Keep editing', style: 'cancel' }, { text: 'Save change', onPress: () => { void save(next); } },
   ]);
  } else { void save(next); }
 }
 return <Card><Body>{task ? 'Edit task' : 'Create a task'}</Body>{failure ? <Notice error>{failure}</Notice> : null}
  <Field label="Task name" value={draft.title} onChangeText={(v) => change('title', v)} editable={!busy} />
  <Field label="Category (custom names welcome)" value={draft.category} onChangeText={(v) => change('category', v)} editable={!busy} />
  <Choice label="Task workspace" value={draft.workspace_id} options={spaces.filter((s) => s.can_edit).map((s) => ({ value: s.id, label: s.name }))}
   disabled={busy || !!task} onChange={(v) => setDraft({ ...draft, workspace_id: v, ceremony_ids: [], owner_id: session!.user.id })} />
  <Choice label="Visibility" value={draft.personal ? 'personal' : 'workspace'} options={[{ value: 'personal', label: 'Only me' }, { value: 'workspace', label: `Everyone in ${scope?.name ?? 'this workspace'}` }]}
   disabled={busy || !!task} onChange={(v) => setDraft({ ...draft, personal: v === 'personal', owner_id: session!.user.id })} />
  {draft.personal ? <Body>You own this personal task. Other family members cannot read it.</Body> : <Choice label="Primary owner" value={draft.owner_id}
   options={owners.map((m) => ({ value: m.user_id, label: m.profiles.display_name + (m.user_id === session?.user.id ? ' (you)' : '') }))} onChange={(v) => change('owner_id', v)} disabled={busy} />}
  <Field label="Planned start (optional)" placeholder="DD/MM/YYYY" value={start} onChangeText={setStart} editable={!busy} />
  <Field label="Deadline (optional)" placeholder="DD/MM/YYYY" value={due} onChangeText={setDue} editable={!busy} />
  <Choice label="Date certainty" value={draft.date_kind} options={[{ value: 'planned', label: 'Planning date / suggestion' }, { value: 'confirmed', label: 'Confirmed by me' }]} onChange={(v) => change('date_kind', v)} disabled={busy} />
  <Choice label="Status" value={draft.status} options={statuses.map((s) => ({ value: s, label: labelStatus(s) }))} onChange={(v) => change('status', v)} disabled={busy} />
  <Choice label="Priority" value={draft.priority} options={(['low','normal','high'] as const).map((v) => ({ value: v, label: v }))} onChange={(v) => change('priority', v)} disabled={busy} />
  <Field label="Notes" multiline value={draft.notes} onChangeText={(v) => change('notes', v)} editable={!busy} />
  <Body>Link to ceremonies in this workspace or the shared overview (optional; one task can appear in several ceremony views).</Body>
  {ceremonies.filter((c) => c.workspace_id === draft.workspace_id || spaces.find((s) => s.id === c.workspace_id)?.kind === 'shared').map((c) => <Button secondary key={c.id} title={`${draft.ceremony_ids.includes(c.id) ? '✓ ' : '+ '}${c.title}`}
   disabled={busy} onPress={() => change('ceremony_ids', draft.ceremony_ids.includes(c.id) ? draft.ceremony_ids.filter((id) => id !== c.id) : [...draft.ceremony_ids, c.id])} />)}
  <Button title="Save task" busy={busy} onPress={submit} /><Button secondary title="Cancel" disabled={busy} onPress={onDone} />
 </Card>;
}
