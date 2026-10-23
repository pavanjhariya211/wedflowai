import { TimelineTasks } from '../../src/planning/TimelineTasks';
import { Alert } from '../../src/lib/confirmation';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Body, Button, Card, Heading, Notice, Screen } from '../../src/components/ui';
import { useAuth } from '../../src/auth/AuthProvider';
import { useWedding } from '../../src/wedding/WeddingProvider';
import { CeremonyForm } from '../../src/wedding/CeremonyForm';
import type { Ceremony } from '../../src/wedding/models';
import { indianDate, indiaTime, weddingError } from '../../src/wedding/validation';
export default function Timeline() {
  const { session } = useAuth();
  const { wedding, ceremonies, spaces, loading, error, reload, service } = useWedding();
  const [editing, setEditing] = useState<Ceremony | 'new' | null>(null);
  const [failure, setFailure] = useState(''), [busy, setBusy] = useState(false);
  useFocusEffect(useCallback(() => { void reload(); }, [reload]));
  function remove(c: Ceremony) {
    Alert.alert('Delete ceremony?', `Delete “${c.title}”? This removes the ceremony and records the action in history.`, [
      { text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => {
        if (!service || busy) return;
        setBusy(true); setFailure('');
        void service.deleteCeremony(c).then(() => reload()).catch((e) => setFailure(weddingError(e))).finally(() => setBusy(false));
      } },
    ]);
  }
  function share(c: Ceremony) {
    Alert.alert('Share with every wedding member?', 'The ceremony name, dates, times and venue will become visible in the shared wedding overview. This shares the existing event, preserving one date and record.', [
      { text: 'Keep private', style: 'cancel' }, { text: 'Share ceremony', onPress: () => {
        if (!service || busy) return;
        setBusy(true); setFailure('');
        void service.shareCeremony(c).then(() => reload()).catch((e) => setFailure(weddingError(e))).finally(() => setBusy(false));
      } },
    ]);
  }
  function makePrivate(c: Ceremony, workspace: string, label: string) {
    Alert.alert(`Move to ${label}?`, 'This removes the ceremony from the shared overview. Only this family will retain access. The change is recorded in history.', [
      { text: 'Cancel', style: 'cancel' }, { text: 'Make family-only', onPress: () => {
        if (!service || busy) return;
        setBusy(true); setFailure('');
        void service.unshareCeremony(c, workspace).then(() => reload()).catch((e) => setFailure(weddingError(e))).finally(() => setBusy(false));
      } },
    ]);
  }
  return <Screen><Heading title="Your wedding timeline." subtitle="Planning tasks and ceremonies, with dates you control." />
    {wedding ? <TimelineTasks key={wedding.id} /> : null}
    {failure ? <Notice error>{failure}</Notice> : null}
    {loading ? <Notice>Loading ceremonies…</Notice> : error ? <Notice error>{error}</Notice> : !wedding ? <Notice>Create or join a wedding in Home first.</Notice> : <>
      {editing ? <CeremonyForm ceremony={editing === 'new' ? undefined : editing} onDone={() => setEditing(null)} /> : <>
        {!ceremonies.length ? <Card><Body>No ceremonies yet. Add any ceremony by name; single-day weddings can include multiple events.</Body></Card> : null}
        {ceremonies.map((c) => <Card key={c.id}><Body>{c.title}</Body><Body>{indianDate(c.start_date)}{c.end_date !== c.start_date ? ` – ${indianDate(c.end_date)}` : ''}</Body>
          <Body>{c.all_day ? 'All day' : `${indiaTime(c.starts_at)} – ${indiaTime(c.ends_at)} IST`} · {spaces.find((s) => s.id === c.workspace_id)?.name}</Body>
          {c.venue ? <Body>{c.venue}</Body> : null}
          {spaces.some((s) => s.id === c.workspace_id && s.kind === 'shared') && (c.created_by === session?.user.id || wedding.creator_id === session?.user.id)
            ? spaces.filter((s) => s.kind === 'family' && s.can_manage).map((s) => <Button key={s.id} secondary title={`Move ${c.title} to ${s.name}`} disabled={busy} onPress={() => makePrivate(c, s.id, s.name)} />) : null}
          {spaces.some((s) => s.id === c.workspace_id && s.kind === 'family' && s.can_manage) ? <Button secondary title={`Share ${c.title} with wedding`} disabled={busy} onPress={() => share(c)} /> : null}
          {spaces.find((s) => s.id === c.workspace_id)?.can_edit ? <><Button secondary title={`Edit ${c.title}`} onPress={() => setEditing(c)} disabled={busy} />
            <Button secondary title={`Delete ${c.title}`} onPress={() => remove(c)} disabled={busy} /></> : null}
        </Card>)}
        {spaces.some((s) => s.can_edit) ? <Button title="Add ceremony" onPress={() => setEditing('new')} /> : <Notice>You have view-only access.</Notice>}
      </>}
    </>}
    <Button secondary title="Refresh ceremonies" disabled={loading || busy} onPress={() => { setEditing(null); void reload(); }} />
  </Screen>;
}
