import type { ComponentProps, PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fonts } from '../theme/tokens';
type IconName = ComponentProps<typeof Ionicons>['name'];
export function Badge({ children, tone = 'sage', icon }: PropsWithChildren<{ tone?: 'sage' | 'warm' | 'gold' | 'danger'; icon?: IconName }>) {
 const backgroundColor = tone === 'danger' ? colors.errorSoft : tone === 'gold' ? colors.goldSoft : tone === 'warm' ? colors.warm : colors.primarySoft;
 const color = tone === 'danger' ? colors.error : tone === 'gold' ? colors.accent : colors.primary;
 return <View style={[ds.badge, { backgroundColor }]}>{icon ? <Ionicons name={icon} size={13} color={color} /> : null}<Text style={[ds.badgeText, { color }]}>{children}</Text></View>;
}
export function Title({ children }: PropsWithChildren) { return <Text accessibilityRole="header" style={ds.sectionTitle}>{children}</Text>; }
export function Section({ title, detail }: { title: string; detail?: string }) {
 return <View style={ds.sectionRow}><Title>{title}</Title>{detail ? <Text style={ds.meta}>{detail}</Text> : null}</View>;
}
export function Chip({ title, selected, onPress, disabled = false, icon }: { title: string; selected?: boolean; onPress: () => void; disabled?: boolean; icon?: IconName }) {
 return <Pressable accessibilityRole={selected === undefined ? 'button' : 'checkbox'} accessibilityLabel={title} accessibilityState={{ checked: selected, disabled }} disabled={disabled} onPress={onPress}
  style={({ pressed }) => [ds.chip, selected && ds.chipSelected, (pressed || disabled) && { opacity: 0.6 }]}>
  {icon || selected ? <Ionicons name={selected ? 'checkmark-circle' : icon!} size={16} color={selected ? '#FFF' : colors.primary} /> : null}
  <Text style={[ds.chipText, selected && { color: '#FFF' }]}>{title}</Text>
 </Pressable>;
}
export function IconButton({ label, icon, onPress, disabled = false }: { label: string; icon: IconName; onPress: () => void; disabled?: boolean }) {
 return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} accessibilityState={{ disabled }} onPress={onPress}
  style={({ pressed }) => [ds.iconButton, (pressed || disabled) && { opacity: 0.5 }]}><Ionicons name={icon} size={20} color={colors.primary} /></Pressable>;
}
export function Progress({ value, label }: { value: number; label: string }) {
 return <View accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 0, max: 100, now: value }} style={ds.track}>
  <View style={[ds.fill, { width: `${Math.max(0, Math.min(value,100))}%` }]} /></View>;
}
export const ds = StyleSheet.create({
 row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
 sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
 sectionTitle: { color: colors.text, fontFamily: fonts.semibold, fontSize: 18, lineHeight: 26, flexShrink: 1 },
 display: { color: colors.text, fontFamily: fonts.display, fontSize: 32, lineHeight: 42 },
 meta: { color: colors.muted, fontFamily: fonts.medium, fontSize: 12, lineHeight: 19 },
 badge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 7, paddingHorizontal: 9, paddingVertical: 5, flexShrink: 1 },
 badgeText: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 16, flexShrink: 1 },
 chip: { minHeight: 48, borderRadius: 28, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, paddingHorizontal: 15, paddingVertical: 12, flexDirection: 'row', gap: 7, alignItems: 'center', flexShrink: 1 },
 chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary }, chipText: { color: colors.primary, fontFamily: fonts.medium, fontSize: 12, lineHeight: 19, flexShrink: 1 },
 iconButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.warm, justifyContent: 'center', alignItems: 'center' },
 track: { height: 8, borderRadius: 8, backgroundColor: '#E9E9E2', overflow: 'hidden' }, fill: { height: 8, borderRadius: 8, backgroundColor: colors.primary },
});
