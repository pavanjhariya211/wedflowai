import { useRef, useState } from 'react';
import { router } from 'expo-router';
import { Body, Button, Card, Field, Heading, Notice, Screen } from '../components/ui';
import { useAuth } from './AuthProvider';
import { friendlyAuthError } from './errors';
import { validateAuthForm, type AuthErrors, type AuthMode } from './validation';

const titles = { 'sign-in': 'Welcome back.', register: 'A calmer way to plan.', 'forgot-password': 'Reset your password.' };
const subtitles = {
  'sign-in': 'Sign in to your family’s wedding planning space.',
  register: 'Create your account. Wedding setup arrives in the next phase.',
  'forgot-password': 'We’ll email you a secure link. Open it on this device.',
};
export function AuthForm({ mode }: { mode: AuthMode }) {
  const { service } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<AuthErrors>({});
  const [failure, setFailure] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);

  async function submit(resend = false) {
    if (inFlight.current || !service) return;
    const nextErrors = validateAuthForm(resend ? 'forgot-password' : mode, { email, password, confirmPassword });
    setErrors(nextErrors); setNotice(''); setFailure('');
    if (Object.keys(nextErrors).length) return;
    inFlight.current = true; setBusy(true);
    try {
      if (resend) {
        await service.resendVerification(email);
        setNotice('If this account needs verification, a new link is on its way. Check your inbox and spam folder.');
      } else if (mode === 'register') {
        const result = await service.register(email, password);
        if (result.signedIn) router.replace('/');
        else setNotice('Check your email for a verification link. If you already have an account, sign in instead. Open the link on this device.');
      } else if (mode === 'forgot-password') {
        await service.resetPassword(email);
        setNotice('If an account exists for this email, you’ll receive a password reset link. Check your inbox and spam folder.');
      } else {
        await service.signIn(email, password);
        router.replace('/');
      }
      setPassword(''); setConfirmPassword('');
    } catch (error) { setFailure(friendlyAuthError(error)); }
    finally { inFlight.current = false; setBusy(false); }
  }

  return <Screen><Heading title={titles[mode]} subtitle={subtitles[mode]} />
    {failure ? <Notice error>{failure}</Notice> : null}
    {notice ? <Notice>{notice}</Notice> : null}
    <Card>
      <Field label="Email" value={email} onChangeText={setEmail} error={errors.email} autoCapitalize="none" autoCorrect={false}
        keyboardType="email-address" autoComplete="email" textContentType="emailAddress" editable={!busy} />
      {mode !== 'forgot-password' ? <Field label="Password" value={password} onChangeText={setPassword} error={errors.password}
        secureTextEntry autoCapitalize="none" autoCorrect={false} editable={!busy}
        autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
        textContentType={mode === 'register' ? 'newPassword' : 'password'} /> : null}
      {mode === 'register' ? <><Body>Use at least 12 characters. A few memorable words work well.</Body>
        <Field label="Confirm password" value={confirmPassword} onChangeText={setConfirmPassword} error={errors.confirmPassword}
          secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="new-password" textContentType="newPassword" editable={!busy} /></> : null}
      <Button title={mode === 'register' ? 'Create account' : mode === 'forgot-password' ? 'Send reset link' : 'Sign in'}
        onPress={() => { void submit(); }} busy={busy} disabled={!service} />
    </Card>
    {mode === 'sign-in' ? <>
      <Button secondary title="Create an account" onPress={() => router.push('/auth/register')} disabled={busy} />
      <Button secondary title="Forgot password?" onPress={() => router.push('/auth/forgot-password')} disabled={busy} />
      <Button secondary title="Resend verification email" onPress={() => { void submit(true); }} disabled={busy || !service} />
    </> : <Button secondary title="Back to sign in" onPress={() => router.replace('/auth/sign-in')} disabled={busy} />}
  </Screen>;
}
