import { useRef, useState } from 'react';
import { Alert } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { Body, Button, Card, Field, Notice } from '../components/ui';
import type { Wedding, WeddingDraft } from './models';
import { indianDate, todayIndia, validateWedding, weddingError } from './validation';
import { useWedding } from './WeddingProvider';
import { Choice } from './Choice';
export function WeddingForm({ wedding, onDone, onCancel }: { wedding?: Wedding; onDone: () => void; onCancel?: () => void }) {
  const { service, reload } = useWedding();
  const requestId = useRef(randomUUID());
  const [draft, setDraft] = useState<WeddingDraft>({ name: '', title: wedding?.title ?? '', date: wedding ? indianDate(wedding.main_date) : '', start: wedding ? indianDate(wedding.planning_start) : todayIndia(), city: wedding?.city ?? '', budget: wedding?.budget_paise == null ? '' : (wedding.budget_paise / 100).toFixed(2), mode: wedding?.sharing_mode ?? 'shared', format: wedding?.format ?? 'single', familyA: 'Family A', familyB: 'Family B' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState('');
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  function field(key: keyof WeddingDraft, label: string, hint?: string, numeric = false) {
    return <Field label={label} value={draft[key]} error={errors[key]} editable={!busy} placeholder={hint}
      keyboardType={numeric ? 'decimal-pad' : 'default'} onChangeText={(value) => setDraft((d) => ({ ...d, [key]: value }))} />;
  }
  async function save() {
    if (locked.current || !service) return;
    locked.current = true; setBusy(true); setFailure('');
    try {
      const id = wedding ? (await service.update(wedding, draft), wedding.id) : await service.create(requestId.current, draft);
      await reload(id); onDone();
    } catch (error) { setFailure(weddingError(error)); }
    finally { locked.current = false; setBusy(false); }
  }
  function submit() {
    const next = validateWedding({ ...draft, name: wedding ? 'Existing profile' : draft.name });
    setErrors(next);
    if (Object.keys(next).length || busy) return;
    if (wedding && (draft.date !== indianDate(wedding.main_date) || draft.format !== wedding.format)) {
      Alert.alert('Review wedding date and format', 'Save this new planning anchor? Existing ceremony dates stay as entered. Review them separately before confirming changes.', [
        { text: 'Keep editing', style: 'cancel' }, { text: 'Confirm change', onPress: () => { void save(); } },
      ]);
    } else { void save(); }
  }
  return <Card>
    {failure ? <Notice error>{failure}</Notice> : null}
    {!wedding ? field('name', 'Your display name') : null}
    {field('title', 'Wedding name', 'e.g. Our wedding')}
    {field('date', 'Wedding date', 'DD/MM/YYYY')}{field('start', 'Planning start date', 'DD/MM/YYYY')}
    {field('city', 'City (optional)')}{field('budget', 'Shared wedding budget in ₹ (optional)', 'e.g. 500000', true)}
    <Body>The wedding budget entered here is visible to accepted wedding members. Private purchase amounts will have separate permissions.</Body>
    <Choice label="Celebration format" value={draft.format} options={[{ value: 'single', label: 'One wedding day' }, { value: 'multi', label: 'Multiple days / functions' }]} onChange={(format) => setDraft({ ...draft, format })} disabled={busy} />
    {!wedding ? <>
      <Choice label="Family collaboration" value={draft.mode} options={[{ value: 'shared', label: 'One shared workspace' }, { value: 'separate', label: 'Separate families with a shared overview' }]} onChange={(mode) => setDraft({ ...draft, mode })} disabled={busy} />
      {draft.mode === 'separate' ? <>{field('familyA', 'Your family workspace')}{field('familyB', 'Other family workspace')}<Body>You administer your family. Invite the other family’s first admin; their private ceremonies stay private.</Body></> : null}
    </> : <Body>Sharing mode is fixed for this pilot. Changing it requires a future safe migration flow.</Body>}
    <Button title={wedding ? 'Save wedding settings' : 'Create wedding'} busy={busy} onPress={submit} />
    {onCancel ? <Button secondary title="Cancel" onPress={onCancel} disabled={busy} /> : null}
  </Card>;
}
