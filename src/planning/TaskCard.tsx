import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Badge, Chip, ds } from '../components/design';
import { colors, fonts } from '../theme/tokens';
import { useState, useRef } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { Body, Button, Card, Notice } from '../components/ui';
import { useWedding } from '../wedding/WeddingProvider';
import { indianDate, weddingError } from '../wedding/validation';
import { labelStatus, type Task, type TaskHistory } from './models';
import { taskInput, type createPlanningService } from './service';

export function TaskCard({ task, service, onEdit, reload }: { task: Task; service: ReturnType<typeof createPlanningService>; onEdit?: () => void; reload: () => Promise<void> }) {
 const { session } = useAuth(); const { spaces, members, ceremonies } = useWedding();
 const [details, setDetails] = useState(false);
 const [history, setHistory] = useState<TaskHistory[] | null>(null), [failure, setFailure] = useState('');
 const [busy, setBusy] = useState(false); const locked = useRef(false);
 const scope = spaces.find((s) => s.id === task.workspace_id);
 async function run(action: () => Promise<void>) {
  if (locked.current) return; locked.current = true; setBusy(true); setFailure('');
  try { await action(); } catch (e) { setFailure(weddingError(e)); }
  finally { locked.current = false; setBusy(false); }
 }
 const owner = members.find((m) => m.user_id === task.owner_id)?.profiles.display_name ?? 'Member no longer visible';
 return <Card><View style={[ds.row,{alignItems:'flex-start'}]}><View style={tc.icon}><Ionicons name={task.status==='completed' ? 'checkmark-circle' : 'checkbox-outline'} size={23} color={colors.primary}/></View><View style={{flex:1,gap:8}}><Badge tone="warm">{task.category}</Badge><Text style={tc.title}>{task.title}</Text></View></View>
  <View style={ds.row}><Badge tone={task.date_kind==='confirmed' ? 'sage' : 'gold'} icon="calendar-outline">{task.due_date ? `${task.date_kind==='confirmed' ? 'Confirmed: ' : 'Suggested: '}${indianDate(task.due_date)}` : 'No deadline set'}</Badge><Badge tone={task.status==='blocked' ? 'danger' : 'sage'}>{labelStatus(task.status)}</Badge></View>
  <View style={ds.sectionRow}><Text style={ds.meta}>Owner: {task.owner_id === session?.user.id ? 'You' : owner}</Text><Badge icon="lock-closed-outline" tone="warm">{task.personal ? 'Only you' : scope?.name}</Badge></View>
  <View style={ds.row}><Chip title={details ? 'Hide details' : 'More details'} selected={details} onPress={() => setDetails(!details)} /><Badge tone={task.priority==='high' ? 'danger' : 'warm'}>{task.priority} priority</Badge></View>
  {details ? <View style={{gap:12,padding:14,borderRadius:12,backgroundColor:colors.primarySoft}}>
   {task.planned_start ? <Body>Planned start: {indianDate(task.planned_start)}</Body> : null}
   {task.notes ? <Body>{task.notes}</Body> : <Body>No notes added yet.</Body>}
   {task.task_ceremonies.map((link) => ceremonies.find((c) => c.id === link.ceremony_id)?.title).filter(Boolean).map((title,i) => <Body key={i}>Ceremony: {title}</Body>)}
  </View> : null}
  {failure ? <Notice error>{failure}</Notice> : null}
  {scope?.can_edit ? <>
   {onEdit ? <Button secondary title="Adjust task" accessibilityLabel={`Edit ${task.title}`} disabled={busy} onPress={onEdit} /> : null}
   {!['cancelled','archived'].includes(task.status) ? <Button title={task.status === 'completed' ? 'Reopen task' : 'Mark complete'} accessibilityLabel={task.status === 'completed' ? `Reopen ${task.title}` : `Complete ${task.title}`} busy={busy} onPress={() => { void run(async () => {
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

const tc=StyleSheet.create({title:{fontFamily:fonts.semibold,fontSize:17,lineHeight:25,color:colors.text},icon:{width:44,height:44,borderRadius:12,backgroundColor:colors.primarySoft,alignItems:'center',justifyContent:'center'}});
