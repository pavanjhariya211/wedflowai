import { useRef, useState } from 'react';
import { Body, Button, Card, Field, Notice } from '../components/ui';
import { useWedding } from './WeddingProvider';
import { weddingError } from './validation';
export function JoinForm({ onDone }: { onDone: () => void }) {
  const { service, reload } = useWedding();
  const [name, setName] = useState(''), [token, setToken] = useState(''), [failure, setFailure] = useState('');
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  async function accept() {
    if (locked.current || !service) return;
    if (!name.trim() || name.trim().length > 80 || !/^[a-f0-9]{64}$/.test(token.trim())) {
      setFailure('Enter your name and the full invitation code.'); return;
    }
    locked.current = true; setBusy(true); setFailure('');
    try { const id = await service.accept(token, name); setToken(''); await reload(id); onDone(); }
    catch (error) { setFailure(weddingError(error)); }
    finally { locked.current = false; setBusy(false); }
  }
  return <Card><Body>Sign in with the email address named on your invitation. Joining gives you the role and workspace chosen by the inviter.</Body>
    {failure ? <Notice error>{failure}</Notice> : null}
    <Field label="Your display name" value={name} onChangeText={setName} editable={!busy} />
    <Field label="Invitation code" value={token} onChangeText={setToken} autoCapitalize="none" autoCorrect={false} editable={!busy} multiline />
    <Button title="Accept invitation and join" busy={busy} onPress={() => { void accept(); }} />
    <Button secondary title="Cancel" disabled={busy} onPress={onDone} />
  </Card>;
}
