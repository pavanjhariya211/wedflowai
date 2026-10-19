import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';
import { supabase } from '../lib/supabase';
import type { Ceremony, Invitation, Member, Wedding, Workspace } from './models';
import { createWeddingService } from './service';
import { weddingError } from './validation';

type Snapshot = { weddings: Wedding[]; wedding: Wedding | null; spaces: Workspace[]; ceremonies: Ceremony[]; members: Member[]; invitations: Invitation[] };
const empty: Snapshot = { weddings: [], wedding: null, spaces: [], ceremonies: [], members: [], invitations: [] };
type Context = Snapshot & { loading: boolean; error: string; reload: (id?: string) => Promise<void>; service: ReturnType<typeof createWeddingService> | null };
const WeddingContext = createContext<Context | null>(null);
export function WeddingProvider({ children }: PropsWithChildren) {
  const service = useMemo(() => supabase ? createWeddingService(supabase) : null, []);
  const [snapshot, setSnapshot] = useState<Snapshot>(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const selected = useRef<string | undefined>(undefined);
  const generation = useRef(0);
  const alive = useRef(true);
  const reload = useCallback(async (id?: string) => {
    if (!service) { setLoading(false); return; }
    const run = ++generation.current;
    setLoading(true); setError('');
    if (id) selected.current = id;
    try {
      const weddings = await service.weddings();
      const wedding = weddings.find((w) => w.id === selected.current) ?? weddings[0] ?? null;
      const details = wedding ? await service.details(wedding.id) : { spaces: [], ceremonies: [], members: [], invitations: [] };
      if (alive.current && generation.current === run) { selected.current = wedding?.id; setSnapshot({ weddings, wedding, ...details }); }
    } catch (failure) {
      if (alive.current && generation.current === run) { setSnapshot(empty); setError(weddingError(failure)); }
    } finally { if (alive.current && generation.current === run) setLoading(false); }
  }, [service]);
  const cancelLoads = useCallback(() => { alive.current = false; generation.current += 1; }, []);
  useEffect(() => {
    alive.current = true;
    const listener = AppState.addEventListener('change', (state) => { if (state === 'active') void reload(); });
    return () => { cancelLoads(); listener.remove(); };
  }, [reload, cancelLoads]);
  return <WeddingContext.Provider value={{ ...snapshot, loading, error, reload, service }}>{children}</WeddingContext.Provider>;
}
export function useWedding() {
  const context = useContext(WeddingContext);
  if (!context) throw new Error('useWedding must be used within WeddingProvider');
  return context;
}
