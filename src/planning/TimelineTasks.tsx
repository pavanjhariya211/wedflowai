import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Body, Button, Card, Notice } from '../components/ui';
import { Badge, Chip, IconButton, Progress, Section, ds } from '../components/design';
import { colors, fonts } from '../theme/tokens';
import { usePlanning } from './usePlanning';
import { useWedding } from '../wedding/WeddingProvider';
import { Choice } from '../wedding/Choice';
import { indianDate } from '../wedding/validation';
import { activeTask } from './templates';
import { monthDays, monthLabel, moveMonth } from './calendar';
import { labelStatus } from './models';

export function TimelineTasks() {
 const { tasks, loading, error } = usePlanning(); const { ceremonies, spaces, members, wedding } = useWedding();
 const [ceremony, setCeremony] = useState('all'), [mode,setMode] = useState<'list'|'month'>('list');
 const [month,setMonth] = useState(wedding!.main_date.slice(0,7)), [day,setDay] = useState('');
 const [filters,setFilters] = useState(false), [expanded,setExpanded] = useState<string[]>([]), [gridWidth,setGridWidth] = useState(336);
 const visible = tasks.filter((t) => activeTask(t) && (ceremony === 'all' || t.task_ceremonies.some((c) => c.ceremony_id === ceremony)));
 const events = [...visible.map((task) => ({ id: task.id, day: task.due_date, title: task.title, kind: 'Task', task, event:null })),
  ...ceremonies.filter((c) => ceremony === 'all' || ceremony === c.id).map((event) => ({ id: event.id, day: event.start_date, title: event.title, kind: 'Ceremony', task:null, event }))]
 .sort((a,b) => (a.day ?? '9999').localeCompare(b.day ?? '9999') || a.title.localeCompare(b.title));
 const shown = events.filter((e) => mode === 'list' || (day ? e.day===day : e.day?.startsWith(month)));
 const groups = [...new Set(shown.map((e) => e.day?.slice(0,7) ?? 'undated'))];
 const completed = tasks.filter((t) => t.status === 'completed').length;
 const denominator = tasks.filter((t) => !['cancelled','archived'].includes(t.status)).length;
 return <View style={{gap:20}}><Section title="Master planning timeline" detail={`${events.length} visible entries`} />
  <View style={ds.row}><Chip title="Timeline list" selected={mode==='list'} icon="list-outline" onPress={() => {setMode('list');setDay('');}} />
   <Chip title="Monthly view" selected={mode==='month'} icon="calendar-outline" onPress={() => {setMode('month');setMonth((events.find((e) => e.day)?.day ?? wedding!.main_date).slice(0,7));setDay('');}} />
   <Chip title="Filter ceremonies" selected={filters} icon="options-outline" onPress={() => setFilters(!filters)} />
  </View>
  {filters ? <Choice label="Timeline ceremony view" value={ceremony} options={[{value:'all',label:'Master wedding timeline'},...ceremonies.map((c) => ({value:c.id,label:c.title}))]} onChange={(id) => {setCeremony(id);setDay('');}} /> : null}
  {loading ? <Notice>Loading your plan…</Notice> : error ? <Notice error>{error}</Notice> : <>
   <Card style={{backgroundColor:colors.primarySoft,borderWidth:0}}><View style={ds.sectionRow}><View style={{gap:4,flex:1}}><Text style={t.heading}>Your visible planning milestones</Text><Text style={ds.meta}>Active tasks and ceremonies in one place</Text></View><Badge>{completed} / {denominator} tasks complete</Badge></View><Progress value={denominator ? Math.round(completed/denominator*100) : 0} label="Visible planning task completion" /></Card>
   {mode === 'month' ? <Card><View style={ds.sectionRow}><IconButton label="Previous month" icon="chevron-back" onPress={() => {setMonth(moveMonth(month,-1));setDay('');}} /><Text style={t.month}>{monthLabel(month)}</Text><IconButton label="Next month" icon="chevron-forward" onPress={() => {setMonth(moveMonth(month,1));setDay('');}} /></View>
    <View onLayout={(e) => setGridWidth(Math.max(336,e.nativeEvent.layout.width))}><ScrollView horizontal showsHorizontalScrollIndicator><View style={{width:gridWidth}}>
     <View style={t.week}>{['M','T','W','T','F','S','S'].map((name,i) => <Text key={i} style={[t.weekday,{width:gridWidth/7}]}>{name}</Text>)}</View>
     <View style={t.week}>{monthDays(month).map((date,i) => {
      const count = date ? events.filter((e) => e.day===date).length : 0;
      return date ? <Pressable key={date} accessibilityRole="button" accessibilityLabel={`${indianDate(date)}, ${count} entries`} accessibilityState={{selected:day===date}} onPress={() => setDay(day===date ? '' : date)}
       style={({pressed}) => [t.cell,{width:gridWidth/7},day===date && {backgroundColor:colors.primarySoft,borderColor:colors.primary},pressed && {opacity:0.6}]}>
       <Text style={t.day}>{Number(date.slice(8))}</Text>{count ? <View style={t.dot} /> : null}
      </Pressable> : <View key={`blank${i}`} style={{width:gridWidth/7,height:54}} />;
     })}</View>
    </View></ScrollView></View>
    {day ? <Button secondary title={`Showing ${indianDate(day)} · clear selection`} onPress={() => setDay('')} /> : <Text style={ds.meta}>Tap a day to focus its entries. Dates shown here are not changed.</Text>}
   </Card> : null}
   {!shown.length ? <Notice>{events.length ? 'No visible entries match this date or month.' : 'Your timeline is ready for a plan. Generate a proposal in Tasks, then add the ceremonies that matter to you below.'}</Notice> : groups.map((group) => <View key={group} style={{gap:14}}><View style={ds.row}><View style={t.monthDot} /><Text style={t.month}>{group==='undated' ? 'Without a deadline' : monthLabel(group)}</Text></View>
    {shown.filter((e) => (e.day?.slice(0,7) ?? 'undated')===group).map((e) => <Card key={`${e.kind}:${e.id}`}><View style={[ds.row,{alignItems:'flex-start'}]}><View style={[t.icon,e.kind==='Ceremony' && {backgroundColor:colors.goldSoft}]}><Ionicons name={e.kind==='Task' ? 'checkbox-outline' : 'calendar-outline'} size={22} color={e.kind==='Task' ? colors.primary : colors.accent} /></View><View style={{flex:1,gap:8}}><Badge tone="warm">{e.task?.category ?? 'Ceremony'}</Badge><Text style={t.title}>{e.title}</Text></View></View>
     <View style={ds.row}><Badge tone={e.task?.date_kind==='confirmed' || e.event ? 'sage' : 'gold'} icon="calendar-outline">{e.task?.date_kind==='planned' ? 'Suggested: ' : ''}{e.day ? indianDate(e.day) : 'No deadline yet'}</Badge><Badge icon="lock-closed-outline" tone="warm">{e.task?.personal ? 'Only you' : spaces.find((s) => s.id === (e.task?.workspace_id ?? e.event?.workspace_id))?.name ?? 'Workspace'}</Badge></View>
     {e.task ? <><View style={ds.sectionRow}><Text style={ds.meta}>Owner: {members.find((m) => m.user_id===e.task!.owner_id)?.profiles.display_name ?? 'Member no longer visible'}</Text><Badge tone={e.task.status==='blocked' ? 'danger' : 'sage'}>{labelStatus(e.task.status)}</Badge></View>
      <View style={ds.row}><Chip title={`Open task: ${e.title}`} icon="open-outline" onPress={() => router.push({pathname:'/tasks',params:{task:e.id}})} />
       {e.task.notes ? <Chip title={expanded.includes(e.id) ? 'Hide details' : 'More details'} selected={expanded.includes(e.id)} onPress={() => setExpanded((all) => all.includes(e.id) ? all.filter((x) => x!==e.id) : [...all,e.id])} /> : null}
      </View>{expanded.includes(e.id) ? <Body>{e.task.notes}</Body> : null}
     </> : <Body>{e.event?.all_day ? 'All day' : 'Times set for this ceremony'}{e.event?.venue ? ` · ${e.event.venue}` : ''}</Body>}
    </Card>)}
   </View>)}
  </>}
  <Button title="Open tasks and planning templates" onPress={() => router.push('/tasks')} />
 </View>;
}
const t = StyleSheet.create({
 heading:{fontFamily:fonts.semibold,fontSize:14,color:colors.primary},month:{fontFamily:fonts.display,fontSize:24,lineHeight:32,color:colors.text},monthDot:{width:8,height:8,borderRadius:4,backgroundColor:colors.terracotta},
 title:{fontFamily:fonts.semibold,fontSize:17,lineHeight:25,color:colors.text},icon:{height:46,width:46,borderRadius:12,backgroundColor:colors.primarySoft,alignItems:'center',justifyContent:'center'},
 week:{flexDirection:'row',flexWrap:'wrap'},weekday:{textAlign:'center',fontFamily:fonts.semibold,fontSize:12,color:colors.muted,paddingVertical:12},cell:{height:54,minWidth:48,borderRadius:10,borderWidth:1,borderColor:'transparent',alignItems:'center',justifyContent:'center',gap:4},day:{fontFamily:fonts.medium,fontSize:14,color:colors.text},dot:{width:5,height:5,borderRadius:3,backgroundColor:colors.terracotta},
});
