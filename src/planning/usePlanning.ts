import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useWedding } from '../wedding/WeddingProvider';
import { weddingError } from '../wedding/validation';
import type { Task } from './models';
import { createPlanningService } from './service';

export function usePlanning() {
 const { wedding, error: weddingFailure, loading: weddingLoading } = useWedding();
 const weddingId = wedding?.id;
 const service = useMemo(() => supabase ? createPlanningService(supabase) : null, []);
 const [state, setState] = useState<{ id?: string; tasks: Task[] }>({ tasks: [] });
 const [error, setError] = useState(''); const [loading, setLoading] = useState(true);
 const generation = useRef(0);
 const reload = useCallback(async () => {
  const run = ++generation.current;
  setLoading(true); setError('');
  try {
   const tasks = weddingId && service ? await service.list(weddingId) : [];
   if (run === generation.current) setState({ id: weddingId, tasks });
  } catch (e) {
   if (run === generation.current) { setState({ id: weddingId, tasks: [] }); setError(weddingError(e)); }
  } finally { if (run === generation.current) setLoading(false); }
 }, [service, weddingId]);
 useFocusEffect(useCallback(() => { void reload(); return () => { generation.current += 1; }; }, [reload]));
 useEffect(() => () => { generation.current += 1; }, []);
 return { tasks: state.id === weddingId && !weddingFailure && !weddingLoading ? state.tasks : [],
  loading: loading || weddingLoading || state.id !== weddingId, error: weddingFailure || error, reload, service };
}
