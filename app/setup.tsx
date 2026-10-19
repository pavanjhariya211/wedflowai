import { Body, Card, Heading, Notice, Screen } from '../src/components/ui';
import { environment } from '../src/config/environment';
export default function Setup() {
  return <Screen><Heading title="Your planning space starts here." subtitle="Wedflow · Development setup" />
    <Notice>{environment.ready ? 'Supabase is configured. Restart the app to continue.' : environment.message}</Notice>
    <Card><Body>Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY in your local .env or cloud environment settings, then restart Expo.</Body>
      <Body>Use only the publishable client key. Setup instructions are in README.md.</Body></Card>
    <Body>Authentication is unavailable until the project is connected. No demo account or simulated sign-in is enabled.</Body>
  </Screen>;
}
