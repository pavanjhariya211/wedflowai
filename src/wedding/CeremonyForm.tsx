import { useRef, useState } from 'react';
import { randomUUID } from 'expo-crypto';
import { Button, Card, Field, Notice } from '../components/ui';
import type { Ceremony, CeremonyDraft } from './models';
import { useWedding } from './WeddingProvider';
import { indianDate, indiaTime, validateCeremony, weddingError } from './validation';
import { Choice } from './Choice';
export function CeremonyForm({ ceremony, onDone }: { ceremony?: Ceremony; onDone: () => void }) {
  const { wedding, spaces, service, reload } = useWedding();
  const id = useRef(ceremony?.id ?? randomUUID());
  const [draft, setDraft] = useState<CeremonyDraft>({ title: ceremony?.title ?? '', start: indianDate(ceremony?.start_date ?? wedding!.main_date), end: indianDate(ceremony?.end_date ?? wedding!.main_date),
    allDay: ceremony?.all_day ?? true, startTime: indiaTime(ceremony?.starts_at ?? null), endTime: indiaTime(ceremony?.ends_at ?? null), venue: ceremony?.venue ?? '', workspace: ceremony?.workspace_id ?? spaces.find((s) => s.kind === 'shared' && s.can_edit)?.id ?? spaces.find((s) => s.can_edit)?.id ?? '' });
  const [errors, setErrors] = useState<Record<string, string>>({}), [failure, setFailure] = useState('');
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  function field(key: 'title' | 'start' | 'end' | 'startTime' | 'endTime' | 'venue', label: string, placeholder?: string) {
    return <Field label={label} value={draft[key]} placeholder={placeholder} error={errors[key]} editable={!busy} onChangeText={(value) => setDraft({ ...draft, [key]: value })} />;
  }
  async function save() {
    if (locked.current || !service || !wedding) return;
    const next = validateCeremony(draft); setErrors(next); setFailure('');
    if (Object.keys(next).length) return;
    locked.current = true; setBusy(true);
    try { await service.saveCeremony(id.current, wedding.id, draft, ceremony?.version ?? null); await reload(); onDone(); }
    catch (error) { setFailure(weddingError(error)); }
    finally { locked.current = false; setBusy(false); }
  }
  return <Card>{failure ? <Notice error>{failure}</Notice> : null}{field('title', 'Ceremony name')}
    <Choice label="Who can see this ceremony?" value={draft.workspace} options={spaces.filter((s) => s.can_edit).map((s) => ({ value: s.id, label: s.name }))} onChange={(workspace) => setDraft({ ...draft, workspace })} disabled={busy || !!ceremony} />
    {field('start', 'Start date', 'DD/MM/YYYY')}{field('end', 'End date', 'DD/MM/YYYY')}
    <Choice label="Timing" value={draft.allDay ? 'all' : 'timed'} options={[{ value: 'all', label: 'All day' }, { value: 'timed', label: 'Set times (India time)' }]} onChange={(value) => setDraft({ ...draft, allDay: value === 'all' })} disabled={busy} />
    {!draft.allDay ? <>{field('startTime', 'Start time', 'HH:mm, e.g. 18:30')}{field('endTime', 'End time', 'HH:mm, e.g. 21:00')}</> : null}
    {field('venue', 'Venue (optional)')}
    <Button title="Save ceremony" busy={busy} onPress={() => { void save(); }} />
    <Button secondary title="Cancel" onPress={onDone} disabled={busy} />
  </Card>;
}
