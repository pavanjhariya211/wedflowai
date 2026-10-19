import type { SupabaseClient } from '@supabase/supabase-js';
import { createWeddingService } from '../src/wedding/service';
import type { WeddingDraft } from '../src/wedding/models';
const draft: WeddingDraft = { name: 'Planner', title: ' Our wedding ', date: '12/12/2027', start: '19/10/2026', city: '', budget: '23500.10', mode: 'separate', format: 'multi', familyA: 'A', familyB: 'B' };
function setup() {
  const rpc = jest.fn().mockResolvedValue({ data: 'wedding-id', error: null });
  return { rpc, service: createWeddingService({ rpc } as unknown as SupabaseClient) };
}
test('creation sends canonical dates, exact paise, idempotency ID and both family labels', async () => {
  const { service, rpc } = setup();
  expect(await service.create('request-id', draft)).toBe('wedding-id');
  expect(rpc).toHaveBeenCalledWith('wf_create_wedding', expect.objectContaining({ p_id: 'request-id', p_title: 'Our wedding', p_date: '2027-12-12', p_budget: 2350010, p_family_a: 'A', p_family_b: 'B', p_mode: 'separate' }));
});
test('all-day ceremony sends no invented times and retains its version', async () => {
  const { service, rpc } = setup();
  await service.saveCeremony('ceremony','wedding',{ title: 'Reception', start: '12/12/2027', end: '12/12/2027', allDay: true, startTime: '10:00', endTime: '11:00', venue: '', workspace: 'family' }, 2);
  expect(rpc).toHaveBeenCalledWith('wf_save_ceremony', expect.objectContaining({ p_starts_at: null, p_ends_at: null, p_version: 2, p_workspace: 'family' }));
});
test('permission errors never become a saved or joined result', async () => {
  const { service, rpc } = setup();
  rpc.mockResolvedValueOnce({ data: null, error: { code: '42501' } });
  await expect(service.accept('code','Name')).rejects.toEqual({ code: '42501' });
});
test('explicit ceremony sharing sends the same canonical ID and expected version', async () => {
  const { service, rpc } = setup();
  await service.shareCeremony({ id: 'original', version: 3 } as Parameters<typeof service.shareCeremony>[0]);
  expect(rpc).toHaveBeenCalledWith('wf_share_ceremony', { p_id: 'original', p_version: 3 });
});
