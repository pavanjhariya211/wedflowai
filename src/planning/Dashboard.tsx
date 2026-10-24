import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
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
 const { wedding, ceremonies, spaces } = useWedding(); const { tasks, loading, error } = usePlanning();
 const [today,setToday] = useState(() => parseIndianDate(todayIndia())!); const { width } = useWindowDimensions();
 useFocusEffect(useCallback(() => { setToday(parseIndianDate(todayIndia())!); }, []));
 if (!wedding) return null;
 const days = daysBetween(today,wedding.main_date); const attention = needsAttention(tasks,today);
 const retained = tasks.filter((t) => !['cancelled','archived'].includes(t.status)); const completed = retained.filter((t) => t.status === 'completed').length;
 const progress = retained.length ? Math.round(completed / retained.length * 100) : 0;
 const nextTasks = tasks.filter(activeTask).filter((t) => !attention.some((a) => a.task.id === t.id)).slice(0,3);
 const events = ceremonies.filter((c) => c.end_date >= today).slice(0,3); const columns = width >= 1200;
 const openTask = (id: string) => router.push({pathname:'/tasks',params:{task:id}});
 return <>
  <View style={d.hero}><View style={[ds.row,{justifyContent:'space-between'}]}><Badge icon="time-outline">{days > 0 ? `${days} days to go` : days === 0 ? 'Your wedding day' : 'Your celebration'}</Badge><Text style={d.heroMeta}>{wedding.city ?? 'Your celebration, your way'}</Text></View>
   <Text style={d.heroTitle}>{wedding.title}</Text><Text style={d.heroMeta}>{new Intl.DateTimeFormat('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Kolkata'}).format(new Date(`${wedding.main_date}T12:00:00Z`))}</Text>
   <View style={d.stats}>{[[String(Math.floor(Math.max(days,0)/7)),'WEEKS'],[String(Math.max(days,0)%7).padStart(2,'0'),'DAYS'],[String(ceremonies.length).padStart(2,'0'),'VISIBLE EVENTS']].map(([value,label]) => <View key={label} style={d.stat}><Text style={d.statValue}>{value}</Text><Text style={d.statLabel}>{label}</Text></View>)}</View>
  </View>
  {loading ? <Notice>Reviewing your visible plan…</Notice> : error ? <Notice error>{error}</Notice> : <>
   <Card><View style={ds.sectionRow}><View style={{gap:5,flex:1}}><Section title="Your planning progress" /><Body>{completed} of {retained.length} visible tasks completed</Body></View><Text style={d.percent}>{progress}%</Text></View>
    <Progress value={progress} label="Visible task completion" />
    <Text style={ds.meta}>{retained.length ? 'Your pace, based on saved tasks. Cancelled and archived tasks are excluded.' : 'A fresh beginning. Create your plan to start making progress.'}</Text>
   </Card>
   <View style={[d.columns, columns && {flexDirection:'row'}]}>
    <View style={d.column}><Section title="What needs your attention?" detail={`${attention.length} to review`} />
     {!tasks.length ? <Card style={{backgroundColor:colors.primarySoft}}><Ionicons name="sparkles-outline" color={colors.primary} size={25} /><Text style={d.editorial}>A thoughtful plan,\nwithout the busywork.</Text><Body>Tell us a little about your wedding. We’ll prepare a sequenced proposal for one simple review.</Body><Button title="Create my guided timeline" onPress={() => router.push({pathname:'/tasks',params:{plan:'generate'}})} /></Card>
      : !attention.length ? <Card><Ionicons name="checkmark-circle-outline" size={26} color={colors.primary} /><Body>No overdue, blocked or near-term deadlines are visible. Enjoy a little breathing room.</Body></Card>
      : attention.slice(0,3).map(({task,reason}) => <Pressable accessibilityRole="button" accessibilityLabel={`Review ${task.title}`} key={task.id} onPress={() => openTask(task.id)}><Card style={{backgroundColor:colors.errorSoft,borderColor:'#EACFC2'}}><View style={ds.sectionRow}><Badge tone="danger">{task.status === 'blocked' ? 'BLOCKED' : task.due_date && task.due_date < today ? 'OVERDUE' : 'DUE SOON'}</Badge><Text style={ds.meta}>{task.due_date ? indianDate(task.due_date) : 'Needs review'}</Text></View><Text style={d.taskTitle}>{task.title}</Text><Body>{reason}</Body><View style={ds.sectionRow}><Badge icon="lock-closed-outline" tone="warm">{task.personal ? 'Only you' : spaces.find((s) => s.id === task.workspace_id)?.name ?? 'Workspace'}</Badge><Ionicons name="arrow-forward" size={20} color={colors.error} /></View></Card></Pressable>)}
     {attention.length > 3 ? <Body>{attention.length-3} more tasks need review.</Body> : null}
     {tasks.length ? <Button secondary title="Review my tasks" onPress={() => router.push('/tasks')} /> : null}
    </View>
    <View style={d.column}><Section title="Your next small steps" detail={`${nextTasks.length} shown`} />
     {!nextTasks.length ? <Card><Body>{tasks.length ? 'Your next steps will appear here as your plan develops.' : 'Accept your guided plan to see your next actions here.'}</Body></Card> : nextTasks.map((task) => <Pressable key={task.id} accessibilityRole="button" accessibilityLabel={`Open ${task.title}`} onPress={() => openTask(task.id)}><Card><View style={[ds.row,{alignItems:'flex-start'}]}><Ionicons name="ellipse-outline" size={22} color={colors.primary} /><View style={{flex:1,gap:8}}><Text style={d.taskTitle}>{task.title}</Text><Text style={ds.meta}>{task.due_date ? indianDate(task.due_date) : 'No deadline yet'}</Text><Badge tone="warm">{task.category}</Badge></View></View></Card></Pressable>)}
     <Section title="Ceremonies itinerary" detail={`${ceremonies.length} visible`} />
     {!events.length ? <Card><Body>No upcoming ceremonies yet. Add the functions that matter to you.</Body><Button secondary title="Add or review ceremonies" onPress={() => router.push('/timeline')} /></Card> : events.map((c) => <Pressable key={c.id} accessibilityRole="button" accessibilityLabel={`View ${c.title}`} onPress={() => router.push('/timeline')}><Card><View style={ds.row}><View style={d.eventIcon}><Ionicons name="calendar-outline" size={22} color={colors.accent} /></View><View style={{flex:1,gap:4}}><Text style={d.taskTitle}>{c.title}</Text><Text style={ds.meta}>{indianDate(c.start_date)}{c.venue ? ` · ${c.venue}` : ''}</Text></View><Ionicons name="chevron-forward" size={18} color={colors.primary} /></View></Card></Pressable>)}
    </View>
   </View>
  </>}
  <Card style={{backgroundColor:colors.warm}}><View style={ds.row}><Ionicons name="sparkles-outline" size={24} color={colors.primary} /><Text style={d.taskTitle}>Your planning companion</Text></View><Body>New ideas for your celebration? Create a proposal from a short brief. Your existing saved dates stay as entered.</Body><Button title="Build or review your task plan" onPress={() => router.push({pathname:'/tasks',params:{plan:'generate'}})} /></Card>
 </>;
}
const d = StyleSheet.create({
 hero: { padding:28, gap:14, backgroundColor:colors.primary,borderRadius:22 }, heroTitle:{fontFamily:fonts.display,fontSize:34,lineHeight:44,color:'#FFF'},heroMeta:{fontFamily:fonts.body,color:'#D6E1D7',fontSize:13,lineHeight:21},
 stats:{flexDirection:'row',gap:8,marginTop:8},stat:{flex:1,paddingVertical:15,paddingHorizontal:5,backgroundColor:'#183327',borderRadius:12,alignItems:'center',gap:5},statValue:{fontFamily:fonts.display,fontSize:28,color:'#FFF'},statLabel:{fontFamily:fonts.semibold,fontSize:9,letterSpacing:0.6,color:'#C3D2C8'},
 percent:{fontFamily:fonts.display,fontSize:32,color:colors.primary},columns:{gap:24},column:{flex:1,gap:16,minWidth:0},taskTitle:{fontFamily:fonts.semibold,fontSize:15,lineHeight:23,color:colors.text},editorial:{fontFamily:fonts.display,fontSize:28,lineHeight:36,color:colors.primary},eventIcon:{height:46,width:46,borderRadius:12,backgroundColor:colors.goldSoft,alignItems:'center',justifyContent:'center'},
});
