import { act, renderHook, waitFor } from '@testing-library/react-native';
import { usePlanning } from '../src/planning/usePlanning';
const mockList = jest.fn();
let mockWedding: { id: string } | null = { id: 'a' };
jest.mock('expo-router', () => ({ useFocusEffect: (callback: () => (() => void)) => {
 const React = jest.requireActual<typeof import('react')>('react'); React.useEffect(callback, [callback]);
} }));
jest.mock('../src/lib/supabase', () => ({ supabase: {} }));
jest.mock('../src/planning/service', () => ({ createPlanningService: () => ({ list: mockList }) }));
jest.mock('../src/wedding/WeddingProvider', () => ({ useWedding: () => ({ wedding: mockWedding, loading: false, error: '' }) }));
beforeEach(() => { mockList.mockReset(); mockWedding = { id: 'a' }; });
function deferred<T>() {
 let resolve!: (value: T) => void;
 const promise = new Promise<T>((done) => { resolve = done; }); return { promise, resolve };
}
test('a slower old wedding response cannot replace the selected wedding task plan', async () => {
 const a = deferred<unknown[]>(), b = deferred<unknown[]>(); mockList.mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
 const { result, rerender } = await renderHook(usePlanning);
 mockWedding = { id: 'b' }; await rerender({});
 expect(result.current.tasks).toEqual([]);
 await act(async () => { b.resolve([{ id: 'task-b' }]); });
 await waitFor(() => expect(result.current.tasks).toEqual([{ id: 'task-b' }]));
 await act(async () => { a.resolve([{ id: 'private-task-a' }]); });
 expect(result.current.tasks).toEqual([{ id: 'task-b' }]);
});
test('permission or network refresh failure clears previously loaded tasks', async () => {
 mockList.mockResolvedValueOnce([{ id: 'private' }]);
 const { result } = await renderHook(usePlanning);
 await waitFor(() => expect(result.current.tasks).toHaveLength(1));
 mockList.mockRejectedValueOnce({ code: '42501' });
 await act(async () => { await result.current.reload(); });
 expect(result.current.tasks).toEqual([]); expect(result.current.error).toMatch('Access denied');
});
