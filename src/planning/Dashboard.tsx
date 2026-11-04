import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Body, Button, Card, Notice } from '../components/ui';
import { Badge, Progress, Section, ds } from '../components/design';
import { colors, fonts } from '../theme/tokens';
import { useWedding } from '../wedding/WeddingProvider';
import { indianDate, parseIndianDate, todayIndia } from '../wedding/validation';
import { usePlanning } from './usePlanning';
import { activeTask } from './templates';
import { daysBetween, needsAttention } from './generator';

export function Dashboard() {
 const { wedding, ceremonies } = useWedding();
 const { tasks, loading, error } = usePlanning();
 const [today,setToday] = useState(() => parseIndianDate(todayIndia())!);
 const [showEvents,setShowEvents] = useState(false);
 useFocusEffect(useCallback(() => { setToday(parseIndianDate(todayIndia())!); }, []));
 if (!wedding) return null;
 const days = daysBetween(today,wedding.main_date);
 const attention = needsAttention(tasks,today);
 const retained = tasks.filter(t => !['cancelled','archived'].includes(t.status));
 const completed = retained.filter(t => t.status === 'completed').length;
 const upcoming = tasks.filter(activeTask).sort((a,b) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999'));
 const priorities = [...attention.map(a=>a.task),...upcoming.filter(t=>!attention.some(a=>a.task.id===t.id))].slice(0,3);
 const events = ceremonies.filter(c=>c.end_date>=today).slice(0,3);
 return <>
  <View style={d.summary}><View style={ds.sectionRow}><Body>{indianDate(wedding.main_date)}{wedding.city ? ` · ${wedding.city}` : ''}</Body><Badge tone="gold">{days > 0 ? `${days} days to go` : days===0 ? 'Your wedding day' : 'Your celebration'}</Badge></View></View>
  {loading ? <Notice>Reviewing your visible plan…</Notice> : error ? <Notice error>{error}</Notice> : <>
   <Card style={{padding:16,gap:8}}><Section title="Your planning progress"/><Body>{completed} of {retained.length} visible tasks completed</Body><Progress value={retained.length ? completed/retained.length*100 : 0} label="Visible task completion"/></Card>
   <Section title={priorities.length ? 'Your next small steps' : 'A little breathing room'} detail={attention.length ? `${attention.length} need attention` : undefined}/>
   {!tasks.length ? <Card><Ionicons name="sparkles-outline" color={colors.primary} size={26}/><Text style={d.title}>A plan that starts with you.</Text><Body>Share a few details. Review your suggested tasks and dates before saving.</Body></Card> : !priorities.length ? <Card><Body>No active tasks need your attention. You can review completed work in your plan.</Body></Card> : priorities.map(task => {
    const issue=attention.find(a=>a.task.id===task.id);
    return <Pressable key={task.id} accessibilityRole="button" accessibilityLabel={`Open ${task.title}`} onPress={()=>router.push({pathname:'/tasks',params:{task:task.id}})}><Card style={{padding:16,gap:8}}><View style={ds.sectionRow}><View style={{flex:1,gap:6}}><Text style={d.task}>{task.title}</Text><Text style={ds.meta}>{task.due_date ? indianDate(task.due_date) : 'No deadline yet'} · {task.category}</Text></View><Ionicons name="chevron-forward" size={20} color={colors.primary}/></View>{issue ? <Body>{issue.reason}</Body> : null}{task.personal ? <Badge icon="lock-closed-outline" tone="warm">Only you</Badge> : null}</Card></Pressable>;
   })}
   <Button title={tasks.length ? 'Open my plan' : 'Create my guided plan'} onPress={()=>router.push(tasks.length ? '/tasks' : {pathname:'/tasks',params:{plan:'generate'}})}/>
   <Button secondary title={showEvents ? 'Hide upcoming ceremonies' : `Upcoming ceremonies · ${events.length}`} onPress={()=>setShowEvents(!showEvents)}/>
   {showEvents ? <>{events.length ? events.map(c=><Card key={c.id}><Text style={d.task}>{c.title}</Text><Body>{indianDate(c.start_date)}{c.venue ? ` · ${c.venue}` : ''}</Body></Card>) : <Body>No upcoming ceremonies yet.</Body>}<Button secondary title="Manage ceremonies" onPress={()=>router.push('/timeline')}/></> : null}
  </>}
 </>;
}
const d=StyleSheet.create({summary:{gap:10,paddingVertical:8},title:{fontFamily:fonts.semibold,fontSize:23,lineHeight:32,color:colors.text,flexShrink:1},task:{fontFamily:fonts.semibold,fontSize:16,lineHeight:24,color:colors.text}});
