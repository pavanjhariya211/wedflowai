import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../src/auth/AuthProvider';
import { Button, Heading, Loading, Notice, Screen } from '../src/components/ui';
import { environment } from '../src/config/environment';
import { colors } from '../src/theme/tokens';

function Navigation() {
  const { session, loading, recovery, startupError, retrySession } = useAuth();
  if (loading) return <Loading />;
  if (startupError) return <Screen><Heading title="Let’s reconnect." /><Notice error>Your saved session could not be restored. Please retry.</Notice>
    <Button title="Retry" onPress={() => { void retrySession(); }} /></Screen>;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
    <Stack.Screen name="index" />
    <Stack.Protected guard={!environment.ready}><Stack.Screen name="setup" /></Stack.Protected>
    <Stack.Protected guard={environment.ready}>
      <Stack.Screen name="auth/callback" />
      <Stack.Protected guard={!session}>
        <Stack.Screen name="auth/sign-in" /><Stack.Screen name="auth/register" /><Stack.Screen name="auth/forgot-password" />
      </Stack.Protected>
      <Stack.Protected guard={!!session && recovery}><Stack.Screen name="auth/update-password" /></Stack.Protected>
      <Stack.Protected guard={!!session && !recovery}><Stack.Screen name="(tabs)" /></Stack.Protected>
    </Stack.Protected>
  </Stack>;
}
export default function RootLayout() {
  return <SafeAreaProvider><AuthProvider><StatusBar style="dark" /><Navigation /></AuthProvider></SafeAreaProvider>;
}
