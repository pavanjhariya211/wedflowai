import { useState } from 'react';
import { useAuth } from '../../src/auth/AuthProvider';
import { friendlyAuthError } from '../../src/auth/errors';
import { Body, Button, Card, Heading, Notice, Screen } from '../../src/components/ui';
export default function Home() {
  const { session, service } = useAuth();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');
  async function signOut() {
    if (!service || busy) return;
    setBusy(true); setFailure('');
    try { await service.signOut(); } catch (error) { setFailure(friendlyAuthError(error)); }
    finally { setBusy(false); }
  }
  return <Screen><Heading title="A little less to worry about." subtitle="Your family’s wedding plan, together." />
    <Notice>Phase 1 · Account foundation</Notice>
    <Card><Body>Signed in as {session?.user.email ?? 'your account'}.</Body>
      <Body>Wedding creation is the next milestone. No wedding, tasks, or expenses have been created yet.</Body></Card>
    {failure ? <Notice error>{failure}</Notice> : null}
    <Button secondary title="Sign out of this device" busy={busy} onPress={() => { void signOut(); }} />
  </Screen>;
}
