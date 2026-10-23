import type { SupabaseClient } from '@supabase/supabase-js';
import type { Task, TaskHistory, TaskInput } from './models';
export function createPlanningService(client: SupabaseClient) {
 async function rpc(name: string, args: Record<string, unknown>) {
  const { error } = await client.rpc(name, args); if (error) throw error;
 }
 return {
  async list(wedding: string): Promise<Task[]> {
   const { data, error } = await client.from('planning_tasks').select('*,task_ceremonies(ceremony_id)').eq('wedding_id', wedding).order('due_date', { nullsFirst: false }).order('created_at');
   if (error) throw error; return data as Task[];
  },
  async history(id: string): Promise<TaskHistory[]> {
   const { data, error } = await client.from('task_history').select('*').eq('task_id', id).order('created_at', { ascending: false }).limit(30);
   if (error) throw error; return data as TaskHistory[];
  },
  save: (task: TaskInput, version: number | null = null) => rpc('wf_task_save', { p_task: task, p_version: version }),
  plan: (tasks: TaskInput[]) => rpc('wf_task_plan', { p_tasks: tasks }),
 };
}
export function taskInput(task: Task): TaskInput {
 const { version: _version, wedding_id: _wedding, task_ceremonies, ...input } = task;
 return { ...input, ceremony_ids: task_ceremonies.map((c) => c.ceremony_id) };
}
