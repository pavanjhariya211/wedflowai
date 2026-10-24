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
 if (!plan) return <Card><Body>Let’s create your wedding plan</Body>
  <Body>{wedding?.title} · {wedding ? indianDate(wedding.main_date) : ''}{wedding?.city ? ` · ${wedding.city}` : ''}</Body>
  <Body>We already have your wedding date and planning window. Tell us anything that should shape the plan; you can leave this blank.</Body>
  <Field label="Your wedding brief (optional)" multiline maxLength={1500} value={brief} editable={!busy} onChangeText={setBrief}
   placeholder="For example: 300 guests, venue booked, reception and outstation guests." />
  <Body>Already arranged? Optional—skip anything you have not confirmed.</Body>
  {([['venueBooked','Venue booked'],['cateringBooked','Catering booked'],['photographyBooked','Photography booked']] as const).map(([key,label]) =>
   <Button secondary key={key} title={`${arranged[key] ? '✓ ' : '+ '}${label}`} disabled={busy} onPress={() => setArranged({ ...arranged, [key]: !arranged[key] })} />)}
  <Choice label="Who will see the accepted plan?" value={workspace} options={spaces.filter((s) => s.can_edit).map((s) => ({ value: s.id, label: s.name }))} onChange={setWorkspace} disabled={busy} />
  <Button secondary title={useAI ? 'AI brief interpretation: on' : 'AI brief interpretation: off'} disabled={busy} onPress={() => setUseAI(!useAI)} />
  {useAI ? <Body>Generating with a brief allows our server to send that brief to OpenAI for interpretation. Saved family tasks, expenses and member details are not sent. A rules-based proposal is available if AI is unavailable.</Body> : null}
  {failure ? <Notice error>{failure}</Notice> : null}
  <Button title="Generate my timeline" busy={busy} disabled={!workspace} onPress={() => { void generate(); }} />
  <Button secondary title="Back to my tasks" disabled={busy} onPress={onDone} />
 </Card>;
 const selected = drafts.filter((t) => t.included);
 return <Card><Body>Your proposed wedding plan</Body><Notice>{source}. Nothing has been saved yet.</Notice>
  {interpretation ? <Notice>{interpretation}</Notice> : null}
  <Body>{selected.length} new tasks · {spaces.find((s) => s.id === workspace)?.name} · you are the initial owner</Body>
  {plan.assumptions.map((a) => <Body key={a}>{a}</Body>)}
  {plan.warnings.map((w) => <Notice key={w} error>{w}</Notice>)}
  {!drafts.length ? <Notice>No new tasks are needed from this proposal. Your current task plan is available in Tasks.</Notice> : null}
  {failure ? <Notice error>{failure}</Notice> : null}
  <Button title={`Accept plan · ${selected.length} tasks`} busy={busy} disabled={!selected.length} onPress={() => { void accept(); }} />
  {drafts.map((t) => <Card key={t.id}>
   <Body>{t.included ? '' : 'Excluded · '}{t.title}</Body><Body>{t.date} · {t.category}</Body>
   <Body>{t.reason}</Body>{t.risk ? <Notice error>{t.risk}</Notice> : null}
   <Button secondary title={`${t.editing ? 'Hide changes' : 'Adjust'}: ${t.title}`} disabled={busy} onPress={() => update(t.id, { editing: !t.editing })} />
   {t.editing ? <>
    <Button secondary title={t.included ? 'Remove this suggestion' : 'Keep this suggestion'} disabled={busy} onPress={() => update(t.id, { included: !t.included })} />
    <Field label="Suggested task name" value={t.title} editable={!busy} onChangeText={(title) => update(t.id, { title })} />
    <Field label="Suggested deadline" value={t.date} editable={!busy} onChangeText={(date) => update(t.id, { date })} />
    <Body>Changing a proposed date does not automatically move other suggestions. Check the sequence before accepting.</Body>
   </> : null}
  </Card>)}
  {selected.some((t) => t.risk) ? <Button secondary title={riskAccepted ? '✓ Timing risks acknowledged' : 'I have reviewed the timing risks'} onPress={() => setRiskAccepted(!riskAccepted)} disabled={busy} /> : null}
  <Button title={`Accept plan · ${selected.length} tasks`} busy={busy} disabled={!selected.length} onPress={() => { void accept(); }} />
  <Button secondary title="Change my brief" disabled={busy} onPress={() => { setPlan(null); setFailure(''); }} />
  <Button secondary title="Cancel proposal" disabled={busy} onPress={onDone} />
 </Card>;
}
