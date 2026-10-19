import { useRef, useState } from 'react';
import { router } from 'expo-router';
import { useAuth } from '../../src/auth/AuthProvider';
import { friendlyAuthError } from '../../src/auth/errors';
import { validateNewPassword, type AuthErrors } from '../../src/auth/validation';
import { Button, Card, Field, Heading, Notice, Screen } from '../../src/components/ui';
export default function UpdatePassword() {
  const { service, finishRecovery } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [errors, setErrors] = useState<AuthErrors>({});
  const [failure, setFailure] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  async function save() {
    if (inFlight.current || !service) return;
    const next = validateNewPassword(password, confirmation);
    setErrors(next); setFailure('');
    if (Object.keys(next).length) return;
    inFlight.current = true; setBusy(true);
    try { await service.updatePassword(password); setPassword(''); setConfirmation(''); setSaved(true); }
    catch (error) { setFailure(friendlyAuthError(error)); }
    finally { inFlight.current = false; setBusy(false); }
  }
  async function cancel() {
    if (!service || inFlight.current) return;
    inFlight.current = true; setBusy(true);
    try { await service.signOut(); router.replace('/'); }
    catch (error) { setFailure(friendlyAuthError(error)); }
    finally { inFlight.current = false; setBusy(false); }
  }
  return <Screen><Heading title={saved ? 'Password updated.' : 'Choose a new password.'} />
    {failure ? <Notice error>{failure}</Notice> : null}
    {saved ? <><Notice>Your new password has been saved.</Notice><Button title="Continue" onPress={() => { finishRecovery(); router.replace('/'); }} /></> : <>
      <Card><Field label="New password" value={password} onChangeText={setPassword} error={errors.password} secureTextEntry
        autoCapitalize="none" autoCorrect={false} autoComplete="new-password" textContentType="newPassword" editable={!busy} />
        <Field label="Confirm password" value={confirmation} onChangeText={setConfirmation} error={errors.confirmPassword} secureTextEntry
          autoCapitalize="none" autoCorrect={false} autoComplete="new-password" textContentType="newPassword" editable={!busy} />
        <Button title="Update password" onPress={() => { void save(); }} busy={busy} /></Card>
      <Button title="Cancel and sign out" secondary onPress={() => { void cancel(); }} disabled={busy} />
    </>}
  </Screen>;
}
