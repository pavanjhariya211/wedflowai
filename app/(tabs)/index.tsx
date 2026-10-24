import { Dashboard } from '../../src/planning/Dashboard';
import { useCallback, useState } from 'react';
import { useFocusEffect, router } from 'expo-router';
import { useAuth } from '../../src/auth/AuthProvider';
import { friendlyAuthError } from '../../src/auth/errors';
import { Body, Button, Card, Heading, Notice, Screen } from '../../src/components/ui';
import { useWedding } from '../../src/wedding/WeddingProvider';
import { WeddingForm } from '../../src/wedding/WeddingForm';
import { JoinForm } from '../../src/wedding/JoinForm';
import { Choice } from '../../src/wedding/Choice';
import { indianDate } from '../../src/wedding/validation';
export default function Home() {
  const { session, service: auth } = useAuth();
  const { wedding, weddings, loading, error, reload, ceremonies } = useWedding();
  const [mode, setMode] = useState<'view' | 'create' | 'edit' | 'join'>('view');
  const [manage, setManage] = useState(false);
  const [busy, setBusy] = useState(false), [failure, setFailure] = useState('');
  useFocusEffect(useCallback(() => { void reload(); }, [reload]));
  async function signOut() {
    if (!auth || busy) return;
    setBusy(true); setFailure('');
    try { await auth.signOut(); } catch (error) { setFailure(friendlyAuthError(error)); }
    finally { setBusy(false); }
  }
  return <Screen wide><Heading title={wedding ? 'Your day, at a glance.' : 'Your wedding starts here.'} subtitle="A clear plan, with your people." />
    {failure ? <Notice error>{failure}</Notice> : null}
    {loading ? <Notice>Loading your wedding workspace…</Notice> : error ? <><Notice error>{error}</Notice><Button title="Retry connection" onPress={() => { void reload(); }} /></> : <>
      {mode === 'create' || mode === 'edit' ? <WeddingForm wedding={mode === 'edit' ? wedding ?? undefined : undefined} onDone={() => { setMode('view'); if (mode === 'create') router.push({ pathname: '/tasks', params: { plan: 'generate' } }); }} onCancel={() => setMode('view')} />
        : mode === 'join' ? <JoinForm onDone={() => setMode('view')} /> : <>
        {weddings.length > 1 ? <Choice label="Selected wedding" value={wedding!.id} options={weddings.map((w) => ({ value: w.id, label: w.title }))} onChange={(id) => { void reload(id); }} /> : null}
        {wedding ? <><Dashboard key={wedding.id} />
          <Button secondary title={manage ? 'Hide wedding settings' : 'Wedding settings & shared budget'} onPress={() => setManage(!manage)} />
          {manage ? <Card><Body>{indianDate(wedding.main_date)} · {wedding.city ?? 'City not set'}</Body>
          <Body>{wedding.format === 'single' ? 'One wedding day' : 'Multiple days / functions'} · {wedding.sharing_mode === 'shared' ? 'Shared family workspace' : 'Separate families + shared overview'}</Body>
          <Button title="Build or review your task plan" onPress={() => router.push('/tasks')} />
          <Button secondary title="Open master timeline" onPress={() => router.push('/timeline')} />
          <Body>{ceremonies.length} visible {ceremonies.length === 1 ? 'ceremony' : 'ceremonies'}. Add and manage them in Timeline.</Body>
          {wedding.budget_paise !== null ? <Body>Shared wedding budget: {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(wedding.budget_paise / 100)}</Body> : null}
          {wedding.creator_id === session?.user.id ? <Button secondary title="Edit wedding settings" onPress={() => setMode('edit')} /> : null}
        </Card> : null}</> : <Card><Body>Create a wedding, choose your family setup, then add the ceremonies that matter to you. No traditions are selected automatically.</Body></Card>}
        <Button title={wedding ? 'Create another wedding' : 'Create your wedding'} onPress={() => setMode('create')} />
        <Button secondary title="Join with invitation code" onPress={() => setMode('join')} />
      </>}
      <Body>Guided planning proposes task dates and explains the sequence. Shopping, recurring schedules and automatic rescheduling are still being developed.</Body>
    </>}
    <Button secondary title="Sign out of this device" busy={busy} onPress={() => { void signOut(); }} />
  </Screen>;
}
