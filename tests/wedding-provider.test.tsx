import { act, renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { WeddingProvider, useWedding } from '../src/wedding/WeddingProvider';
const mockService = { weddings: jest.fn(), details: jest.fn() };
jest.mock('../src/lib/supabase', () => ({ supabase: {} }));
jest.mock('../src/wedding/service', () => ({ createWeddingService: () => mockService }));
const first = { id: 'first', title: 'First wedding' };
const second = { id: 'second', title: 'Second wedding' };
const details = { spaces: [], ceremonies: [], members: [], invitations: [] };
beforeEach(() => {
  jest.resetAllMocks();
  jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove: jest.fn() });
  mockService.weddings.mockResolvedValue([first]);
  mockService.details.mockResolvedValue(details);
});
afterEach(() => jest.restoreAllMocks());
test('revoked membership removes previously visible wedding state on refresh', async () => {
  const { result } = await renderHook(useWedding, { wrapper: WeddingProvider });
  await act(async () => { await result.current.reload(); });
  expect(result.current.wedding?.id).toBe('first');
  mockService.weddings.mockResolvedValueOnce([]);
  await act(async () => { await result.current.reload(); });
  expect(result.current.wedding).toBeNull();
  expect(result.current.ceremonies).toEqual([]);
});
test('a stale response cannot overwrite a more recent workspace selection', async () => {
  let resolve!: (value: unknown) => void;
  mockService.weddings.mockReturnValueOnce(new Promise((done) => { resolve = done; })).mockResolvedValueOnce([second]);
  const { result } = await renderHook(useWedding, { wrapper: WeddingProvider });
  let oldRequest!: Promise<void>;
  await act(async () => { oldRequest = result.current.reload('first'); });
  await act(async () => { await result.current.reload('second'); });
  expect(result.current.wedding?.id).toBe('second');
  await act(async () => { resolve([first]); await oldRequest; });
  expect(result.current.wedding?.id).toBe('second');
});
test('a permission failure clears cached data and exposes a retryable error', async () => {
  const { result } = await renderHook(useWedding, { wrapper: WeddingProvider });
  await act(async () => { await result.current.reload(); });
  mockService.weddings.mockRejectedValueOnce({ code: '42501' });
  await act(async () => { await result.current.reload(); });
  expect(result.current.wedding).toBeNull();
  expect(result.current.weddings).toEqual([]);
  expect(result.current.error).toContain('Access denied');
  expect(result.current.loading).toBe(false);
});
