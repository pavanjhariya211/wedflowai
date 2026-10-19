import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../../src/theme/tokens';
const icons = { index: 'home-outline', timeline: 'calendar-outline', tasks: 'checkbox-outline', shopping: 'bag-outline', family: 'people-outline' } as const;
export default function TabLayout() {
  return <Tabs screenOptions={({ route }) => ({
    headerShown: false, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.muted,
    tabBarStyle: { backgroundColor: colors.surface },
    tabBarIcon: ({ color, size }) => <Ionicons name={icons[route.name as keyof typeof icons]} color={typeof color === 'string' ? color : colors.muted} size={size} />,
  })}>
    <Tabs.Screen name="index" options={{ title: 'Home' }} /><Tabs.Screen name="timeline" options={{ title: 'Timeline' }} />
    <Tabs.Screen name="tasks" options={{ title: 'Tasks' }} /><Tabs.Screen name="shopping" options={{ title: 'Shopping' }} />
    <Tabs.Screen name="family" options={{ title: 'Family' }} />
  </Tabs>;
}
