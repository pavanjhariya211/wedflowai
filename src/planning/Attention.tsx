import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Body, Button, Card, Notice } from '../components/ui';
import { parseIndianDate, todayIndia, indianDate } from '../wedding/validation';
import { usePlanning } from './usePlanning';
import { needsAttention } from './generator';
export function Attention() {
 const { tasks, loading, error } = usePlanning(); const [today,setToday] = useState(() => parseIndianDate(todayIndia())!);
 useFocusEffect(useCallback(() => { setToday(parseIndianDate(todayIndia())!); }, []));
 const items = needsAttention(tasks,today);
 return <Card><Body>What needs your attention?</Body>
  {loading ? <Notice>Reviewing your visible plan…</Notice> : error ? <Notice error>{error}</Notice> : !tasks.length ? <>
   <Body>Start with a proposed plan, rather than entering every task yourself.</Body>
   <Button title="Create my guided timeline" onPress={() => router.push({ pathname: '/tasks', params: { plan: 'generate' } })} />
  </> : <>
   {!items.length ? <Body>No overdue, blocked or near-term deadlines are visible. This view checks your saved tasks; it does not verify vendor availability.</Body> : items.slice(0,5).map(({task,reason}) => <Card key={task.id}><Body>{task.title}</Body><Body>{reason}</Body>{task.due_date ? <Body>{indianDate(task.due_date)}</Body> : null}</Card>)}
   {items.length > 5 ? <Body>{items.length-5} more tasks need review.</Body> : null}
   <Button title="Review my tasks" onPress={() => router.push('/tasks')} />
  </>}
 </Card>;
}
