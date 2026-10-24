import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { GuidedPlanner } from '../src/planning/GuidedPlanner';
import type { createPlanningService } from '../src/planning/service';
const space={id:'family',name:'Our family',kind:'family',can_edit:true};
const mockInterpret=jest.fn();
jest.mock('expo-crypto',()=>{let n=0;return {randomUUID:()=>`draft-${++n}`};});
jest.mock('../src/auth/AuthProvider',()=>({useAuth:()=>({session:{user:{id:'owner'},access_token:'test-only'}})}));
jest.mock('../src/wedding/WeddingProvider',()=>({useWedding:()=>({wedding:{id:'wedding',title:'Our wedding',main_date:'2027-12-12',planning_start:'2026-10-24'},spaces:[space],ceremonies:[]})}));
jest.mock('../src/planning/ai-service',()=>({interpretBrief:(...args:unknown[])=>mockInterpret(...args)}));
beforeEach(()=>{mockInterpret.mockReset();});
function props(){return {tasks:[],service:{plan:jest.fn().mockResolvedValue(undefined)} as unknown as ReturnType<typeof createPlanningService>,onDone:jest.fn()};}
test('one brief creates an honest fallback proposal with no task-entry fields; one approval persists it',async()=>{
 const p=props();mockInterpret.mockRejectedValue(new Error('not configured'));await render(<GuidedPlanner {...p}/>);
 await fireEvent.changeText(screen.getByLabelText('Your wedding brief (optional)'),'300 guests, venue booked, reception');
 await fireEvent.press(screen.getByText('Generate my timeline'));
 await waitFor(()=>expect(screen.getByText('Your proposed wedding plan')).toBeTruthy());
 expect(screen.getByText('Rules-based proposal. Nothing has been saved yet.')).toBeTruthy();
 expect(screen.queryAllByLabelText('Suggested task name')).toHaveLength(0);
 expect(p.service.plan).not.toHaveBeenCalled();
 const accept=screen.getAllByText(/^Accept plan ·/)[0]!;await fireEvent.press(accept);
 await waitFor(()=>expect(p.onDone).toHaveBeenCalled());
 const tasks=(p.service.plan as jest.Mock).mock.calls[0]![0];
 expect(tasks.length).toBeGreaterThan(10);expect(tasks.some((t:{template_key:string})=>t.template_key==='starter:venue')).toBe(false);
 expect(tasks.every((t:{date_kind:string})=>t.date_kind==='planned')).toBe(true);
});
test('empty brief uses rules without an AI request; cancelling a proposal saves nothing',async()=>{
 const p=props();await render(<GuidedPlanner {...p}/>);await fireEvent.press(screen.getByText('Generate my timeline'));
 await waitFor(()=>expect(screen.getByText('Your proposed wedding plan')).toBeTruthy());
 expect(mockInterpret).not.toHaveBeenCalled();await fireEvent.press(screen.getByText('Cancel proposal'));expect(p.service.plan).not.toHaveBeenCalled();expect(p.onDone).toHaveBeenCalled();
});
