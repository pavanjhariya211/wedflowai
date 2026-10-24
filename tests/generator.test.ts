import { generatePlan, needsAttention, planningRules } from '../src/planning/generator';
import { emptyFacts, readBrief, validateFacts } from '../src/planning/intake';
import type { Wedding, Ceremony } from '../src/wedding/models';
import type { Task } from '../src/planning/models';
const wedding = { id:'wedding',main_date:'2027-12-12',planning_start:'2027-01-01' } as Wedding;
const generate = (fields: Partial<Parameters<typeof generatePlan>[0]> = {}) => {
 let n=0;return generatePlan({wedding,today:'2027-01-01',workspace:'family',owner:'owner',facts:emptyFacts,existing:[],ceremonies:[],id:()=>`id-${++n}`,...fields});
};
test('explicit brief facts only; negated booking statements never omit a booking task',()=>{
 expect(readBrief('300 guests. Venue booked. Reception. Outstation guests.')).toEqual({...emptyFacts,guestCount:300,venueBooked:true,functions:['reception'],travelNeeded:true});
 expect(readBrief('Venue is not booked. Need a caterer. No haldi.').venueBooked).toBeNull();
 expect(readBrief('Need a caterer.').cateringBooked).toBeNull();
 expect(readBrief('Catering booked.').cateringBooked).toBe(true);
 expect(readBrief('No haldi.').functions).toEqual([]);
 expect(()=>validateFacts({...emptyFacts,guestCount:10001})).toThrow();
});
test('dependency ordering overrides contradictory fixed lead dates; generated dates remain suggestions',()=>{
 const plan=generate();const venue=plan.tasks.find((t)=>t.template_key==='starter:venue')!;
 const guest=plan.tasks.find((t)=>t.template_key==='starter:guest-list')!;
 expect(venue.planned_start! > guest.due_date!).toBe(true);
 for(const task of plan.tasks){
  expect(task.owner_id).toBe('owner');expect(task.date_kind).toBe('planned');expect(task.workspace_id).toBe('family');
  for(const key of task.predecessors){const prior=plan.tasks.find((t)=>t.template_key===`starter:${key}`)!;expect(task.planned_start!>prior.due_date!).toBe(true);}
 }
 expect(planningRules.some((r)=>r.category==='Rituals and traditions')).toBe(false);
});
test('short windows spread tasks logically rather than clamping every task to today; impossible lead times are visible',()=>{
 const plan=generate({today:'2027-12-10'});expect(plan.tasks.some((t)=>t.risk)).toBe(true);expect(plan.warnings.some((w)=>w.includes('do not fit'))).toBe(true);
 expect(new Set(plan.tasks.map((t)=>t.due_date)).size).toBeGreaterThan(1);
 expect(generate({today:'2028-01-01'}).tasks).toEqual([]);
});
test('arranged services are omitted; guest scale and explicit functions affect the proposal without inventing ceremonies',()=>{
 const plan=generate({facts:{...emptyFacts,venueBooked:true,guestCount:300,functions:['Reception']}});
 expect(plan.tasks.some((t)=>t.template_key==='starter:venue')).toBe(false);
 expect(plan.tasks.some((t)=>t.template_key==='starter:capacity')).toBe(true);
 expect(plan.tasks.find((t)=>t.title==='Review arrangements for Reception')?.ceremony_ids).toEqual([]);
});
test('existing tasks are preserved, private/other workspace sources do not suppress permitted planning',()=>{
 const existing={id:'saved',workspace_id:'family',personal:false,template_key:'starter:venue',due_date:'2027-04-01',date_kind:'confirmed'} as Task;
 const copy=JSON.stringify(existing);expect(generate({existing:[existing]}).tasks.some((t)=>t.template_key==='starter:venue')).toBe(false);expect(JSON.stringify(existing)).toBe(copy);
 expect(generate({existing:[{...existing,personal:true}]}).tasks.some((t)=>t.template_key==='starter:venue')).toBe(true);
});
test('ceremony tasks only use the target scope and bounded proposals remain within bulk RPC limits',()=>{
 const ceremonies=Array.from({length:80},(_,i)=>({id:`c${i}`,title:`Function ${i}`,workspace_id:'family',start_date:'2027-12-12'} as Ceremony));
 ceremonies.push({id:'secret',title:'Other family',workspace_id:'other',start_date:'2027-12-12'} as Ceremony);
 const plan=generate({ceremonies});expect(plan.tasks).toHaveLength(60);expect(plan.tasks.some((t)=>t.ceremony_ids.includes('secret'))).toBe(false);
});
test('attention uses only visible tasks and never silently moves dates or exposes absent predecessor names',()=>{
 const task={id:'1',workspace_id:'family',personal:false,title:'Venue',template_key:'starter:venue',status:'not_started',due_date:'2027-01-02',planned_start:'2027-01-01'} as Task;
 expect(needsAttention([task],'2027-01-03')[0]?.reason).toContain('Overdue');
 expect(needsAttention([{...task,status:'completed'}],'2027-01-03')).toEqual([]);
 expect(task.due_date).toBe('2027-01-02');
});

test('family plans may link shared events and check feasibility against the actual function date',()=>{
 const ceremony={id:'shared-function',title:'Reception',workspace_id:'shared',start_date:'2027-01-02'} as Ceremony;
 const plan=generate({ceremonies:[ceremony],sharedWorkspaces:['shared']});
 const task=plan.tasks.find((t)=>t.ceremony_ids.includes(ceremony.id));
 expect(task).toBeDefined();expect(task?.risk).toMatch('relevant event');
});
