import { GuidedPlanner } from '../../src/planning/GuidedPlanner';
import { useCallback, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '../../src/auth/AuthProvider';
import { Body, Button, Card, Field, Heading, Notice, Screen } from '../../src/components/ui';
import { useWedding } from '../../src/wedding/WeddingProvider';
import { Choice } from '../../src/wedding/Choice';
import { parseIndianDate, todayIndia } from '../../src/wedding/validation';
import { statuses, labelStatus, type Task } from '../../src/planning/models';
import { usePlanning } from '../../src/planning/usePlanning';
import { activeTask } from '../../src/planning/templates';
import { TaskForm } from '../../src/planning/TaskForm';
import { TaskCard } from '../../src/planning/TaskCard';
import { PlanPreview } from '../../src/planning/PlanPreview';

function TasksContent() {
 const { wedding, spaces, ceremonies } = useWedding(); const { session } = useAuth();
 const { tasks, loading, error, reload, service } = usePlanning();
 const params = useLocalSearchParams<{ plan?: string }>();
 const [mode, setMode] = useState<'list' | 'new' | 'plan' | 'guided'>(params.plan === 'generate' ? 'guided' : 'list'); const [editing, setEditing] = useState<Task | null>(null);
 const [query, setQuery] = useState(''), [filter, setFilter] = useState('active'), [category, setCategory] = useState('all'), [ceremony, setCeremony] = useState('all');
 const [workspace, setWorkspace] = useState(spaces.find((s) => s.can_edit && s.kind === 'family')?.id ?? spaces.find((s) => s.can_edit)?.id ?? '');
 const [today, setToday] = useState(() => parseIndianDate(todayIndia())!);
 useFocusEffect(useCallback(() => { setToday(parseIndianDate(todayIndia())!); }, []));
 const filtered = tasks.filter((t) => (!query || `${t.title} ${t.category} ${t.notes}`.toLowerCase().includes(query.toLowerCase())) &&
  (filter === 'all' || (filter === 'active' ? activeTask(t) : filter === 'overdue' ? activeTask(t) && !!t.due_date && t.due_date < today : filter === 'mine' ? t.owner_id === session?.user.id && activeTask(t) : t.status === filter)) &&
  (category === 'all' || t.category === category) && (ceremony === 'all' || t.task_ceremonies.some((c) => c.ceremony_id === ceremony)));
 function done() { router.setParams({ plan: '' }); setMode('list'); setEditing(null); void reload(); }
 return <>
  {loading ? <Notice>Loading your task plan…</Notice> : error ? <Notice error>{error}</Notice> : service ? <>
   {mode === 'new' || editing ? <TaskForm key={editing?.id ?? 'new'} task={editing ?? undefined} service={service} onDone={done} />
    : mode === 'guided' ? <GuidedPlanner tasks={tasks} service={service} onDone={done} /> : mode === 'plan' ? <PlanPreview workspace={workspace} tasks={tasks} service={service} onDone={done} /> : <>
    {!tasks.length ? <Card><Body>Your wedding is saved. Now build your plan.</Body><Body>Generate a sequenced proposal from your wedding details, then accept it in one review.</Body></Card> : <Body>{tasks.filter((t) => t.status === 'completed').length} completed · {tasks.filter(activeTask).length} active visible tasks</Body>}
    {spaces.some((s) => s.can_edit) ? <>
     <Button title="Generate my guided timeline" onPress={() => setMode('guided')} />
     <Button secondary title="Add a custom task" onPress={() => setMode('new')} />
     <Choice label="Manual starter-plan destination" value={workspace} options={spaces.filter((s) => s.can_edit).map((s) => ({ value: s.id, label: s.name }))} onChange={setWorkspace} />
     <Button secondary title="Use the manual template editor" disabled={!workspace} onPress={() => setMode('plan')} />
    </> : <Notice>You have view-only access.</Notice>}
    <Field label="Search your visible tasks" value={query} onChangeText={setQuery} />
    <Choice label="Show tasks" value={filter} options={[{ value: 'active', label: 'Active' }, { value: 'mine', label: 'Assigned to me' }, { value: 'overdue', label: 'Overdue' }, { value: 'all', label: 'All, including archived' }, ...statuses.map((s) => ({ value: s, label: labelStatus(s) }))]} onChange={setFilter} />
    <Choice label="Category filter" value={category} options={[{ value: 'all', label: 'All categories' }, ...Array.from(new Set(tasks.map((t) => t.category))).sort().map((c) => ({ value: c, label: c }))]} onChange={setCategory} />
    {ceremonies.length ? <Choice label="Ceremony filter" value={ceremony} options={[{ value: 'all', label: 'All ceremonies' }, ...ceremonies.map((c) => ({ value: c.id, label: c.title }))]} onChange={setCeremony} /> : null}
    {!filtered.length ? <Notice>No tasks match this view.</Notice> : filtered.map((task) => <TaskCard key={`${task.id}:${task.version}`} task={task} service={service} reload={reload} onEdit={() => setEditing(task)} />)}
    <Notice>Recurring schedules, dependency automation and reminders are still being developed. This plan currently saves individually managed tasks.</Notice>
   </>}
  </> : null}
  <Button secondary title="Refresh tasks" onPress={() => { void reload(); }} disabled={loading} />
  <Body>Wedding: {wedding?.title}</Body>
 </>;
}
export default function Tasks() {
 const { wedding, loading, error, reload } = useWedding();
 useFocusEffect(useCallback(() => { void reload(); }, [reload]));
 return <Screen><Heading title="Your wedding task plan." subtitle="A clear owner, an editable date, and progress you can follow." />
  {loading ? <Notice>Loading wedding…</Notice> : error ? <Notice error>{error}</Notice> : wedding ? <TasksContent key={wedding.id} /> : <Notice>Create or join a wedding in Home first.</Notice>}
 </Screen>;
}
