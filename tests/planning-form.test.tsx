import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { TaskForm } from '../src/planning/TaskForm';
import { PlanPreview } from '../src/planning/PlanPreview';
import type { Task } from '../src/planning/models';
import type { createPlanningService } from '../src/planning/service';
const space = { id: 'family', name: 'Family', kind: 'family', can_edit: true };
jest.mock('expo-crypto', () => { let n = 0; return { randomUUID: () => `new-id-${++n}` }; });
jest.mock('../src/auth/AuthProvider', () => ({ useAuth: () => ({ session: { user: { id: 'owner' } } }) }));
jest.mock('../src/wedding/WeddingProvider', () => ({ useWedding: () => ({
 wedding: { id: 'wedding', main_date: '2027-12-12', planning_start: '2026-10-24' }, spaces: [space], ceremonies: [],
 members: [{ user_id: 'owner', workspace_id: 'family', role: 'admin', profiles: { display_name: 'Planner' } }],
}) }));
function setup() {
 const save = jest.fn().mockResolvedValue(undefined), plan = jest.fn().mockResolvedValue(undefined);
 return { save, plan, service: { save, plan } as unknown as ReturnType<typeof createPlanningService>, onDone: jest.fn() };
}
test('custom task invalid date blocks saving, valid task saves a real scoped payload', async () => {
 const p = setup(); await render(<TaskForm {...p} />);
 await fireEvent.changeText(screen.getByLabelText('Task name'), 'Book venue');
 await fireEvent.changeText(screen.getByLabelText('Deadline (optional)'), '31/02/2027');
 await fireEvent.press(screen.getByText('Save task'));
 expect(p.save).not.toHaveBeenCalled();
 expect(screen.getByText('Use DD/MM/YYYY for the deadline.')).toBeTruthy();
 await fireEvent.changeText(screen.getByLabelText('Deadline (optional)'), '12/02/2027');
 await fireEvent.press(screen.getByText('Save task'));
 await waitFor(() => expect(p.onDone).toHaveBeenCalled());
 expect(p.save).toHaveBeenCalledWith(expect.objectContaining({ workspace_id: 'family', due_date: '2027-02-12', title: 'Book venue', owner_id: 'owner', date_kind: 'planned' }), null);
});
test('changing deadline needs confirmation and cancellation does not save', async () => {
 const p = setup(); const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
 const task = { id: 'task', wedding_id: 'wedding', workspace_id: 'family', title: 'Venue', category: 'Venue', notes: '', planned_start: null, due_date: '2027-12-01', personal: false,
 owner_id: 'owner', status: 'not_started', priority: 'normal', date_kind: 'planned', template_key: null, version: 1, task_ceremonies: [] } as Task;
 await render(<TaskForm {...p} task={task} />);
 await fireEvent.changeText(screen.getByLabelText('Deadline (optional)'), '02/12/2027'); await fireEvent.press(screen.getByText('Save task'));
 expect(alert).toHaveBeenCalled(); expect(p.save).not.toHaveBeenCalled(); alert.mockRestore();
});
test('template preview saves nothing until approval; excluded and renamed suggestions are respected', async () => {
 const p = setup(); await render(<PlanPreview {...p} workspace="family" tasks={[]} />);
 expect(p.plan).not.toHaveBeenCalled();
 await fireEvent.press(screen.getByText('✓ Keep: Agree your planning budget'));
 await fireEvent.changeText(screen.getAllByLabelText('Suggested task name')[0]!, 'My venue decision');
 await fireEvent.press(screen.getByText('Save 13 reviewed tasks'));
 await waitFor(() => expect(p.onDone).toHaveBeenCalled());
 expect(p.plan.mock.calls[0]![0]).toHaveLength(13);
 expect(p.plan.mock.calls[0]![0][0].title).toBe('My venue decision');
 expect(p.plan.mock.calls[0]![0].some((t: { template_key: string }) => t.template_key === 'starter:budget')).toBe(false);
});
