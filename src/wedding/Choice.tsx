import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, fonts } from '../theme/tokens';
export function Choice<T extends string>({ label, value, options, onChange, disabled = false }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (value: T) => void; disabled?: boolean }) {
  return <View style={styles.group}><Text style={styles.label}>{label}</Text>
    {options.map((option) => <Pressable key={option.value} accessibilityRole="radio" accessibilityLabel={option.label}
      accessibilityState={{ checked: value === option.value, disabled }} disabled={disabled} onPress={() => onChange(option.value)}
      style={[styles.option, value === option.value && styles.selected]}>
      <Text style={styles.text}>{value === option.value ? '● ' : '○ '}{option.label}</Text>
    </Pressable>)}
  </View>;
}
const styles = StyleSheet.create({ group: { gap: 8, flexDirection: 'row', flexWrap: 'wrap' }, label: { width: '100%', fontFamily: fonts.semibold, color: colors.text, fontSize: 14, fontWeight: '600' },
  option: { minHeight: 48, padding: 12, borderRadius: 24, maxWidth: '100%', borderWidth: 1, borderColor: colors.border },
  selected: { backgroundColor: colors.primarySoft, borderColor: colors.primary }, text: { color: colors.text, fontSize: 12, lineHeight: 20, fontFamily: fonts.medium } });
