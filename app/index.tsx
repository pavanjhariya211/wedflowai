import { Redirect } from 'expo-router';
import { useAuth } from '../src/auth/AuthProvider';
import { environment } from '../src/config/environment';
export default function Index() {
  const { session, recovery } = useAuth();
  if (!environment.ready) return <Redirect href="/setup" />;
  if (!session) return <Redirect href="/auth/sign-in" />;
  return <Redirect href={recovery ? '/auth/update-password' : '/(tabs)'} />;
}
