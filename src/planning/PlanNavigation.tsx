import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme/tokens';

export function PlanNavigation({ current }: { current: 'tasks' | 'timeline' }) {
 return <View style={s.group}>{([{id:'tasks',label:'Tasks'},{id:'timeline',label:'Calendar & timeline'}] as const).map(item =>
  <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={item.label} accessibilityState={{selected:current===item.id}} onPress={() => router.push(item.id==='tasks' ? '/tasks' : '/timeline')} style={[s.tab,current===item.id && s.active]}>
   <Text style={[s.label,current===item.id && {color:colors.primary}]}>{item.label}</Text>
  </Pressable>)}</View>;
}
const s=StyleSheet.create({group:{flexDirection:'row',backgroundColor:colors.primarySoft,padding:4,borderRadius:14,gap:4},tab:{flex:1,minHeight:48,alignItems:'center',justifyContent:'center',padding:8,borderRadius:10},active:{backgroundColor:colors.surface},label:{fontFamily:fonts.semibold,fontSize:13,color:colors.muted}});
