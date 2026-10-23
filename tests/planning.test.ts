import { activeTask, previewPlan, shiftDay, validateTask } from '../src/planning/templates';
import { taskInput, createPlanningService } from '../src/planning/service';
import type { Task, TaskInput } from '../src/planning/models';
import type { SupabaseClient } from '@supabase/supabase-js';
const input: TaskInput = { id: 'id', workspace_id: 'family', title: 'Venue', category: 'My category', notes: '', planned_start: null, due_date: null,
 owner_id: 'owner', personal: false, status: 'not_started', priority: 'normal', date_kind: 'planned', template_key: null, ceremony_ids: [] };
const task: Task = { ...input, wedding_id: 'wedding', version: 4, task_ceremonies: [{ ceremony_id: 'ceremony' }] };

test('starter plan is optional, unconfirmed, creator-owned and scoped; existing suggestions are omitted', () => {
 let n = 0;
 const prior = { ...task, template_key: 'starter:venue' };
 const preview = previewPlan('2027-12-12', '2027-01-01', 'family', 'owner', [prior], () => `id-${++n}`);
 expect(preview.length).toBe(13);
 expect(preview.every((t) => t.owner_id === 'owner' && t.workspace_id === 'family' && t.date_kind === 'planned' && !t.personal)).toBe(true);
 expect(preview.some((t) => t.template_key === prior.template_key)).toBe(false);
 expect(prior.due_date).toBeNull();
});
test('short-lead suggestions expose the original date and stay inside the chosen planning window', () => {
 const preview = previewPlan('2027-12-12', '2027-12-01', 'family', 'owner', [], () => 'id');
 expect(preview.every((t) => t.due_date! >= '2027-12-01')).toBe(true);
 expect(preview.some((t) => t.originalSuggestion < t.due_date!)).toBe(true);
 expect(shiftDay('2028-03-01', -1)).toBe('2028-02-29');
});
test('custom task permits no deadline, validates ranges and preserves custom categories', () => {
 expect(validateTask(input)).toBe('');
 expect(validateTask({ ...input, planned_start: '2027-12-12', due_date: '2027-12-01' })).toMatch('deadline');
 expect(validateTask({ ...input, notes: 'x'.repeat(4001) })).toMatch('4,000');
 expect(validateTask({ ...input, title: ' ' })).toMatch('task name');
});
test('completed, cancelled and archived tasks do not remain active', () => {
 for (const status of ['completed','cancelled','archived'] as const) expect(activeTask({ ...task, status })).toBe(false);
 expect(activeTask({ ...task, status: 'blocked' })).toBe(true);
});
test('task edits carry CAS version and canonical ceremony IDs; failure is never saved success', async () => {
 const rpc = jest.fn().mockResolvedValue({ error: null }); const service = createPlanningService({ rpc } as unknown as SupabaseClient);
 expect(taskInput(task).ceremony_ids).toEqual(['ceremony']);
 await service.save({ ...taskInput(task), status: 'completed' }, task.version);
 expect(rpc).toHaveBeenCalledWith('wf_task_save', { p_task: expect.objectContaining({ id: 'id', status: 'completed', ceremony_ids: ['ceremony'] }), p_version: 4 });
 rpc.mockResolvedValue({ error: { code: '40001' } });
 await expect(service.save(input, 4)).rejects.toEqual({ code: '40001' });
});
test('reviewed plan is sent in one atomic request with stable client IDs', async () => {
 const rpc = jest.fn().mockResolvedValue({ error: null }); const service = createPlanningService({ rpc } as unknown as SupabaseClient);
 await service.plan([input]); expect(rpc).toHaveBeenCalledWith('wf_task_plan', { p_tasks: [input] });
});
