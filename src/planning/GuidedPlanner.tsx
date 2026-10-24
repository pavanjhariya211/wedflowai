import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Badge, Chip, Progress, Section, Title, ds } from '../components/design';
import { colors, fonts } from '../theme/tokens';
import { useRef, useState } from 'react';
import { randomUUID } from 'expo-crypto';
import { useAuth } from '../auth/AuthProvider';
import { Body, Button, Card, Field, Notice } from '../components/ui';
import { Choice } from '../wedding/Choice';
import { useWedding } from '../wedding/WeddingProvider';
import { indianDate, parseIndianDate, todayIndia, weddingError } from '../wedding/validation';
import { generatePlan, type GeneratedPlan, type GeneratedTask } from './generator';
import { readBrief, type IntakeFacts } from './intake';
import { interpretBrief } from './ai-service';
import { validateTask } from './templates';
import type { Task, TaskInput } from './models';
import type { createPlanningService } from './service';

type Draft = GeneratedTask & { included: boolean; editing: boolean; date: string };
export function GuidedPlanner({ tasks, service, onDone }: { tasks: Task[]; service: ReturnType<typeof createPlanningService>; onDone: () => void }) {
 const { wedding, spaces, ceremonies } = useWedding(); const { session } = useAuth();
 const [workspace, setWorkspace] = useState(spaces.find((s) => s.can_edit && s.kind === 'family')?.id ?? spaces.find((s) => s.can_edit)?.id ?? '');
 const [brief, setBrief] = useState(''), [useAI, setUseAI] = useState(true);
 const [arranged, setArranged] = useState<{ venueBooked: boolean; cateringBooked: boolean; photographyBooked: boolean }>({ venueBooked: false, cateringBooked: false, photographyBooked: false });
 const [plan, setPlan] = useState<GeneratedPlan | null>(null), [drafts, setDrafts] = useState<Draft[]>([]);
 const [busy, setBusy] = useState(false), [failure, setFailure] = useState(''), [source, setSource] = useState(''), [riskAccepted, setRiskAccepted] = useState(false);
 const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
 const [interpretation, setInterpretation] = useState(''); const locked = useRef(false);
 async function generate() {
  if (locked.current || !wedding || !workspace || !session) return;
  if (brief.length > 1500) { setFailure('Keep your brief under 1,500 characters.'); return; }
  locked.current = true; setBusy(true); setFailure(''); setInterpretation(''); setRiskAccepted(false);
  try {
   let facts: IntakeFacts = readBrief(brief); let usedAI = false;
   if (brief.trim() && useAI) {
    try { facts = await interpretBrief(session, wedding.id, workspace, brief.trim()); usedAI = true; }
    catch { setInterpretation('AI interpretation is unavailable. This proposal uses planning rules and only the details recognised below.'); }
   }
   facts = { ...facts, venueBooked: arranged.venueBooked || facts.venueBooked, cateringBooked: arranged.cateringBooked || facts.cateringBooked, photographyBooked: arranged.photographyBooked || facts.photographyBooked };
   const next = generatePlan({ wedding, today: parseIndianDate(todayIndia())!, workspace, owner: session.user.id, facts, existing: tasks, ceremonies, sharedWorkspaces: spaces.filter((s) => s.kind === 'shared').map((s) => s.id), id: randomUUID });
   setSource(usedAI ? 'AI-interpreted brief · dates calculated by planning rules' : 'Rules-based proposal');
   setExpandedGroups(next.tasks[0] ? [next.tasks[0].category] : []);
   setPlan(next); setDrafts(next.tasks.map((t) => ({ ...t, included: true, editing: false, date: indianDate(t.due_date!) })));
  } catch { setFailure('Could not prepare this proposal. Please try again.'); }
  finally { locked.current = false; setBusy(false); }
 }
 function update(id: string, fields: Partial<Draft>) { setDrafts((all) => all.map((t) => t.id === id ? { ...t, ...fields } : t)); }
 async function accept() {
  if (locked.current) return;
  const selected = drafts.filter((t) => t.included);
  if (!selected.length) { setFailure('There are no new tasks to accept. Return to your existing plan or change the intake.'); return; }
  if (selected.some((t) => t.risk) && !riskAccepted) { setFailure('Review and acknowledge the timing risk before accepting these tasks.'); return; }
  const payload: TaskInput[] = [];
  for (const item of selected) {
   const { reason: _reason, predecessors: _predecessors, risk: _risk, included: _included, editing: _editing, date, ...task } = item;
   task.due_date = parseIndianDate(date);
   if (!task.due_date) { setFailure('Use a valid DD/MM/YYYY deadline for each retained task.'); return; }
   const error = validateTask(task); if (error) { setFailure(error); return; }
   payload.push(task);
  }
  for (const item of selected) {
   for (const key of item.predecessors) {
    const before = payload.find((t) => t.template_key === `starter:${key}`);
    const after = payload.find((t) => t.id === item.id)!;
    if (before?.due_date && after.due_date && before.due_date >= after.due_date) {
     setFailure(`Review the sequence: “${after.title}” must follow “${before.title}”. Adjust their proposed deadlines before accepting.`); return;
    }
   }
  }
  locked.current = true; setBusy(true); setFailure('');
  try { await service.plan(payload); onDone(); } catch (e) { setFailure(weddingError(e)); }
  finally { locked.current = false; setBusy(false); }
 }
 const scopeName = spaces.find((s) => s.id === workspace)?.name ?? 'Your workspace';
 const steps = <View style={{gap:12}}><View style={ds.sectionRow}><Text style={g.eyebrow}>WEDFLOW GUIDED SETUP</Text><Badge tone="warm">Step {plan ? '3' : '2'} of 3</Badge></View><Progress value={plan ? 100 : 66} label={`Setup step ${plan ? 3 : 2} of 3`} /><View style={ds.sectionRow}><Text style={ds.meta}>✓ Wedding details</Text><Text style={[ds.meta,{color:colors.primary}]}>2. Your brief</Text><Text style={ds.meta}>3. Review plan</Text></View></View>;
 if (!plan) return <View style={g.page}>{steps}
  <Card><View style={ds.sectionRow}><Text style={g.eyebrow}>YOUR SAVED WEDDING</Text><Badge icon="people-outline">{scopeName}</Badge></View>
   <Text style={g.contextTitle}>{wedding?.title}</Text><View style={ds.row}><Badge tone="warm" icon="calendar-outline">{wedding ? indianDate(wedding.main_date) : ''}</Badge>{wedding?.city ? <Badge tone="warm" icon="location-outline">{wedding.city}</Badge> : null}</View>
  </Card>
  <View style={{gap:10}}><View style={ds.row}><Ionicons name="sparkles-outline" size={20} color={colors.primary}/><Text style={g.eyebrow}>YOUR PLANNING COMPANION</Text></View>
   <Text accessibilityRole="header" style={g.headline}>Tell us a little about your wedding.</Text><Body>Less organising. More looking forward to it. We’ll turn the essentials into a thoughtful proposal.</Body>
  </View>
  <Card><Field label="Your wedding brief (optional)" multiline maxLength={1500} value={brief} editable={!busy} onChangeText={setBrief}
    placeholder="For example: 300 guests, venue booked, reception and outstation guests." />
   <Text style={ds.meta}>Your date and planning window are already included. No need to enter them again.</Text>
  </Card>
  <Section title="Already sorted?" detail="Optional—skip confirmed bookings" />
  <View style={ds.row}>{([['venueBooked','Venue booked'],['cateringBooked','Catering booked'],['photographyBooked','Photography booked']] as const).map(([key,label]) =>
   <Chip key={key} title={label} selected={arranged[key]} icon="add-outline" disabled={busy} onPress={() => setArranged({ ...arranged, [key]: !arranged[key] })} />)}</View>
  <Card style={{backgroundColor:colors.primarySoft,borderWidth:0}}><View style={ds.row}><Ionicons name="shield-checkmark-outline" size={24} color={colors.primary}/><Title>A plan with a little more thought</Title></View><Body>Suggested tasks follow the decisions they depend on. Dates stay editable, and tight planning windows are flagged for your review.</Body></Card>
  <Choice label="Who will see the accepted plan?" value={workspace} options={spaces.filter((s) => s.can_edit).map((s) => ({ value: s.id, label: s.name }))} onChange={setWorkspace} disabled={busy} />
  <Chip title={useAI ? 'AI brief interpretation: on' : 'AI brief interpretation: off'} selected={useAI} icon="sparkles-outline" disabled={busy} onPress={() => setUseAI(!useAI)} />
  {useAI ? <Text style={ds.meta}>Generating with a brief allows our server to send that brief to OpenAI. Your saved family tasks, expenses and member details are not sent. If AI is unavailable, planning rules prepare the proposal.</Text> : null}
  {failure ? <Notice error>{failure}</Notice> : null}
  {busy ? <Notice>Preparing your proposal… You’ll review it before anything is saved.</Notice> : null}
  <Button title="Generate my timeline" busy={busy} disabled={!workspace} onPress={() => { void generate(); }} />
  <Button secondary title="Back to my tasks" disabled={busy} onPress={onDone} />
 </View>;
 const selected = drafts.filter((t) => t.included);
 const groups = [...new Set(drafts.map((t) => t.category))];
 const riskControl = selected.some((t) => t.risk) ? <Chip title={riskAccepted ? '✓ Timing risks acknowledged' : 'I have reviewed the timing risks'} selected={riskAccepted} onPress={() => setRiskAccepted(!riskAccepted)} disabled={busy} /> : null;
 return <View style={g.page}>{steps}<Badge tone="sage" icon="checkmark-circle-outline">PROPOSAL READY · REVIEW BEFORE SAVING</Badge>
  <Text accessibilityRole="header" style={g.headline}>Your wedding,
thoughtfully mapped out.</Text><Body>Your proposed wedding plan</Body>
  <View style={ds.row}><Badge icon="flag-outline">{groups.length} planning categories</Badge><Badge icon="checkbox-outline">{selected.length} new tasks</Badge></View>
  <Notice>{source}. Nothing has been saved yet.</Notice>
  {interpretation ? <Notice>{interpretation}</Notice> : null}
  {plan.warnings.map((w) => <Notice key={w} error>{w}</Notice>)}
  <Card><Section title="Planning assumptions" detail="For your review" />{plan.assumptions.map((a) => <View key={a} style={[ds.row,{alignItems:'flex-start'}]}><Ionicons name="checkmark-circle-outline" size={18} color={colors.primary}/><View style={{flex:1}}><Body>{a}</Body></View></View>)}</Card>
  <Card style={{backgroundColor:colors.primarySoft}}><View style={ds.row}><Ionicons name="eye-outline" size={22} color={colors.primary}/><Title>Shared with the right people</Title></View><Body>Visible to {scopeName}. You are the initial owner of the accepted tasks.</Body></Card>
  {!drafts.length ? <Notice>No new tasks are needed from this proposal. Your current task plan is available in Tasks.</Notice> : null}
  {failure ? <Notice error>{failure}</Notice> : null}{riskControl}
  <Button title={`Accept plan · ${selected.length} tasks`} busy={busy} disabled={!selected.length} onPress={() => { void accept(); }} />
  {groups.map((group,index) => <Card key={group} style={{padding:0,overflow:'hidden'}}>
   <Pressable accessibilityRole="button" accessibilityLabel={`${expandedGroups.includes(group) ? 'Collapse' : 'Expand'} ${group}`} accessibilityState={{expanded:expandedGroups.includes(group)}} disabled={busy}
    onPress={() => setExpandedGroups((all) => all.includes(group) ? all.filter((x) => x !== group) : [...all,group])} style={g.groupHeader}>
    <View style={g.number}><Text style={g.numberText}>{index+1}</Text></View><View style={{flex:1,gap:4}}><Text style={g.groupTitle}>{group}</Text><Text style={ds.meta}>{drafts.filter((t) => t.category===group && t.included).length} tasks selected</Text></View><Ionicons name={expandedGroups.includes(group) ? 'chevron-up' : 'chevron-down'} size={20} color={colors.primary}/>
   </Pressable>
   {expandedGroups.includes(group) ? <View style={{padding:16,gap:12}}>{drafts.filter((t) => t.category===group).map((t) => <Card key={t.id} style={{backgroundColor:colors.primarySoft,borderWidth:0,padding:16}}>
    <View style={ds.sectionRow}><Badge tone="warm">Suggested date</Badge><Text style={ds.meta}>{t.date}</Text></View><Text style={g.taskTitle}>{t.included ? '' : 'Excluded · '}{t.title}</Text>
    <Body>{t.reason}</Body>{t.risk ? <Notice error>{t.risk}</Notice> : null}
    <Button secondary title={`${t.editing ? 'Hide changes' : 'Adjust'}: ${t.title}`} disabled={busy} onPress={() => update(t.id, { editing: !t.editing })} />
    {t.editing ? <>
     <Button secondary title={t.included ? 'Remove this suggestion' : 'Keep this suggestion'} disabled={busy} onPress={() => update(t.id, { included: !t.included })} />
     <Field label="Suggested task name" value={t.title} editable={!busy} onChangeText={(title) => update(t.id, { title })} />
     <Field label="Suggested deadline" value={t.date} editable={!busy} onChangeText={(date) => update(t.id, { date })} />
     <Body>Changing a proposed date does not automatically move other suggestions. Check the sequence before accepting.</Body>
    </> : null}
   </Card>)}</View> : null}
  </Card>)}
  <Button title={`Accept plan · ${selected.length} tasks`} busy={busy} disabled={!selected.length} onPress={() => { void accept(); }} />
  <Button secondary title="Change my brief" disabled={busy} onPress={() => { setPlan(null); setFailure(''); }} />
  <Button secondary title="Cancel proposal" disabled={busy} onPress={onDone} />
 </View>;
}
const g = StyleSheet.create({
 page:{gap:22,width:'100%',maxWidth:760,alignSelf:'center'},eyebrow:{fontFamily:fonts.semibold,fontSize:10,lineHeight:16,letterSpacing:1.2,color:colors.primary},
 headline:{fontFamily:fonts.display,fontSize:34,lineHeight:44,color:colors.text},contextTitle:{fontFamily:fonts.display,fontSize:27,lineHeight:36,color:colors.text},
 groupHeader:{padding:20,flexDirection:'row',alignItems:'center',gap:12,backgroundColor:colors.primarySoft},groupTitle:{fontFamily:fonts.semibold,fontSize:14,lineHeight:22,color:colors.text},
 number:{width:30,height:30,borderRadius:15,backgroundColor:colors.primary,alignItems:'center',justifyContent:'center'},numberText:{fontFamily:fonts.semibold,color:'#FFF',fontSize:13},taskTitle:{fontFamily:fonts.semibold,fontSize:16,lineHeight:24,color:colors.text},
});
