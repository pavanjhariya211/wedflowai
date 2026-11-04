import { router, Tabs } from 'expo-router';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { ComponentProps } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WeddingProvider, useWedding } from '../../src/wedding/WeddingProvider';
import { useAuth } from '../../src/auth/AuthProvider';
import { colors, fonts } from '../../src/theme/tokens';
type NavigationBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];
const icons = { index: 'grid-outline', timeline: 'calendar-outline', tasks: 'checkbox-outline', shopping: 'bag-outline', family: 'people-outline' } as const;
const labels: Record<string,string> = { index: 'Today', timeline: 'Timeline', tasks: 'Plan', shopping: 'Shopping', family: 'Family' };
function NavigationBar({ state, emitter, navigateToTab }: NavigationBarProps) {
 const { width } = useWindowDimensions(); const { bottom } = useSafeAreaInsets(); const { wedding } = useWedding(); const wide = width >= 1000;
 return <View style={[nav.bar, wide ? nav.rail : { paddingBottom: Math.max(8,bottom), paddingTop: 8 }]}>
  {wide ? <View style={nav.brand}><View style={nav.logo}><Ionicons name="heart-outline" color="#FFF" size={24} /></View><Text style={nav.brandName}>Wedflow</Text><Text style={nav.tagline}>{'A little less planning.\nA lot more celebration.'}</Text></View> : null}
  <View style={wide ? nav.links : nav.mobileLinks}>{state.routes.filter(route => ['index','tasks','family'].includes(route.name)).map((route) => {
   const current = state.routes[state.index]?.name ?? 'index';
   const selected = route.name === current || (route.name === 'tasks' && ['timeline','shopping'].includes(current));
   return <Pressable key={route.key} accessibilityRole="tab" accessibilityLabel={route.name === 'index' ? 'Home' : labels[route.name]}
    accessibilityState={{ selected }} onPress={() => {
     const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
     if (!selected && !event.defaultPrevented) navigateToTab(route.key);
    }} onLongPress={() => emitter.emit({type:'tabLongPress',target:route.key})}
    style={({ pressed }) => [nav.link, wide ? nav.railLink : nav.mobileLink, selected && nav.selected, pressed && { opacity: 0.65 }]}>
    <Ionicons name={icons[route.name as keyof typeof icons]} size={wide ? 22 : 21} color={selected ? colors.primary : colors.muted} />
    <Text style={[nav.label, selected && { color: colors.primary, fontFamily: fonts.semibold }]}>{labels[route.name]}</Text>
    {wide && route.name === 'shopping' ? <Text style={nav.soon}>Planned</Text> : null}
   </Pressable>;
  })}</View>
  {wide ? <View style={nav.footer}><Ionicons name="people-outline" size={20} color={colors.primary} /><Text numberOfLines={2} style={nav.label}>{wedding?.title ?? 'Your wedding workspace'}</Text><Text style={nav.tagline}>Designed for your people.</Text></View> : null}
 </View>;
}
function TabNavigator() {
 const { width } = useWindowDimensions();
 const { wedding } = useWedding(); const { top } = useSafeAreaInsets();
 return <View style={{flex:1}}><View style={[nav.header,{paddingTop:Math.max(12,top)}]}><Text style={nav.wordmark}>Wedflow</Text><Pressable accessibilityRole="button" accessibilityLabel="Open wedding workspace" onPress={() => router.push('/')} style={nav.workspace}><Text numberOfLines={1} style={nav.workspaceName}>{wedding?.title ?? 'Your wedding workspace'}</Text><Ionicons name="chevron-forward" size={16} color={colors.primary}/></Pressable></View><Tabs tabBar={(props) => <NavigationBar {...props} />} screenOptions={{ headerShown: false, tabBarPosition: width >= 1000 ? 'left' : 'bottom', sceneStyle: { backgroundColor: colors.background } }}>
  <Tabs.Screen name="index" options={{ title: 'Home' }} /><Tabs.Screen name="timeline" options={{ title: 'Timeline' }} />
  <Tabs.Screen name="tasks" options={{ title: 'Tasks' }} /><Tabs.Screen name="shopping" options={{ title: 'Shopping' }} />
  <Tabs.Screen name="family" options={{ title: 'Family' }} />
 </Tabs></View>;
}
export default function TabLayout() {
 const { session } = useAuth(); return <WeddingProvider key={session?.user.id}><TabNavigator /></WeddingProvider>;
}
const nav = StyleSheet.create({
 header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:16,paddingHorizontal:24,paddingBottom:12,backgroundColor:colors.surface,borderBottomWidth:1,borderBottomColor:colors.border}, wordmark:{fontFamily:fonts.semibold,fontSize:22,color:colors.primary},workspace:{flexDirection:'row',alignItems:'center',gap:6,minHeight:48,flexShrink:1},workspaceName:{fontFamily:fonts.medium,fontSize:13,color:colors.text,flexShrink:1},
 bar: { backgroundColor: colors.surface, borderColor: colors.border }, rail: { width: 224, borderRightWidth: 1, paddingHorizontal: 18, paddingVertical: 32 },
 mobileLinks: { flexDirection: 'row', justifyContent: 'space-around', gap: 2, paddingHorizontal: 6 }, links: { gap: 8 },
 brand: { marginBottom: 42, gap: 12, paddingHorizontal: 12 }, logo: { width: 42, height: 46, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
 brandName: { fontFamily: fonts.display, fontSize: 30, color: colors.primary }, tagline: { fontFamily: fonts.body, fontSize: 11, lineHeight: 19, color: colors.muted },
 link: { alignItems: 'center', borderRadius: 12, minHeight: 54 }, railLink: { flexDirection: 'row', gap: 12, padding: 14 }, mobileLink: { flex: 1, paddingVertical: 7, gap: 4 },
 selected: { backgroundColor: colors.primarySoft }, label: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 17, color: colors.muted, flexShrink: 1 },
 footer: { marginTop: 'auto', padding: 14, gap: 10, backgroundColor: colors.warm, borderRadius: 14 }, soon: { fontFamily: fonts.medium, fontSize: 9, color: colors.accent },
});
