import { useState } from 'react';
import { router } from 'expo-router';
import { Body, Button, Card, Notice } from '../components/ui';
import { usePlanning } from './usePlanning';
import { useWedding } from '../wedding/WeddingProvider';
import { Choice } from '../wedding/Choice';
import { indianDate } from '../wedding/validation';
import { activeTask } from './templates';

export function TimelineTasks() {
 const { tasks, loading, error } = usePlanning(); const { ceremonies } = useWedding();
 const [ceremony, setCeremony] = useState('all');
 const visible = tasks.filter((t) => activeTask(t) && (ceremony === 'all' || t.task_ceremonies.some((c) => c.ceremony_id === ceremony)));
 const events = [...visible.map((t) => ({ id: t.id, day: t.due_date, title: t.title, subtitle: `${t.category} · ${t.date_kind === 'confirmed' ? 'Confirmed by a member' : 'Planning date'}`, kind: 'Task' })),
  ...ceremonies.filter((c) => ceremony === 'all' || ceremony === c.id).map((c) => ({ id: c.id, day: c.start_date, title: c.title, subtitle: c.all_day ? 'All day ceremony' : 'Timed ceremony', kind: 'Ceremony' }))]
 .sort((a, b) => (a.day ?? '9999').localeCompare(b.day ?? '9999') || a.title.localeCompare(b.title));
 return <Card><Body>Master planning timeline</Body>
  {loading ? <Notice>Loading your plan…</Notice> : error ? <Notice error>{error}</Notice> : <>
   <Choice label="Timeline ceremony view" value={ceremony} options={[{ value: 'all', label: 'Master wedding timeline' }, ...ceremonies.map((c) => ({ value: c.id, label: c.title }))]} onChange={setCeremony} />
   {!events.length ? <Notice>Your timeline is ready for a plan. Add custom tasks or review suggested tasks in Tasks, then add the ceremonies you want below.</Notice> : events.map((e) => <Card key={`${e.kind}:${e.id}`}><Body>{e.day ? indianDate(e.day) : 'No deadline yet'} · {e.kind}</Body><Body>{e.title}</Body><Body>{e.subtitle}</Body></Card>)}
  </>}
  <Button title="Open tasks and planning templates" onPress={() => router.push('/tasks')} />
 </Card>;
}
