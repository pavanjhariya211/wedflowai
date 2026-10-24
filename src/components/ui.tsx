import type { PropsWithChildren } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions, type TextInputProps, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme/tokens';

export function Screen({ children, wide = false }: PropsWithChildren<{ wide?: boolean }>) {
 const { width } = useWindowDimensions();
 return <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
  <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
   <ScrollView contentContainerStyle={[styles.content, wide && { maxWidth: 1160 }, width < 500 && { padding: 20 }]} keyboardShouldPersistTaps="handled">{children}</ScrollView>
  </KeyboardAvoidingView>
 </SafeAreaView>;
}
export function Heading({ title, subtitle }: { title: string; subtitle?: string }) {
 return <View style={styles.heading}><Text style={styles.eyebrow}>WEDFLOW · THOUGHTFULLY PLANNED</Text>
  <Text accessibilityRole="header" style={styles.title}>{title}</Text>
  {subtitle ? <Text style={styles.body}>{subtitle}</Text> : null}</View>;
}
export function Card({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) { return <View style={[styles.card, style]}>{children}</View>; }
export function Body({ children }: PropsWithChildren) { return <Text style={styles.body}>{children}</Text>; }
export function Notice({ children, error = false }: PropsWithChildren<{ error?: boolean }>) {
 return <View accessibilityRole={error ? 'alert' : undefined} accessibilityLiveRegion="polite" style={[styles.notice, error && styles.errorNotice]}>
  <Text style={[styles.body, error && styles.errorText]}>{children}</Text></View>;
}
export function Button({ title, onPress, busy = false, secondary = false, disabled = false, accessibilityLabel }: {
 title: string; onPress: () => void; busy?: boolean; secondary?: boolean; disabled?: boolean; accessibilityLabel?: string;
}) {
 return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? title} accessibilityState={{ disabled: disabled || busy, busy }}
  disabled={disabled || busy} onPress={onPress}
  style={({ pressed }) => [styles.button, secondary && styles.secondaryButton, (pressed || disabled || busy) && styles.dim]}>
  {busy ? <ActivityIndicator color={secondary ? colors.primary : colors.surface} /> : null}
  <Text style={[styles.buttonText, secondary && styles.secondaryText]}>{title}</Text>
 </Pressable>;
}
export function Field({ label, error, ...props }: TextInputProps & { label: string; error?: string }) {
 return <View style={styles.field}><Text style={styles.label}>{label}</Text>
  <TextInput {...props} accessibilityLabel={label} accessibilityHint={error || props.accessibilityHint}
   placeholderTextColor={colors.muted} style={[styles.input, props.multiline && { minHeight: 150, textAlignVertical: 'top' }, error && styles.invalidInput, props.style]} />
  {error ? <Text accessibilityLiveRegion="polite" style={styles.errorText}>{error}</Text> : null}</View>;
}
export function Loading({ message = 'Restoring your session…' }: { message?: string }) {
 return <Screen><View style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /><Body>{message}</Body></View></Screen>;
}
export const styles = StyleSheet.create({
 safe: { flex: 1, backgroundColor: colors.background },
 content: { padding: 32, paddingBottom: 48, gap: 24, width: '100%', maxWidth: 640, alignSelf: 'center', flexGrow: 1 },
 heading: { gap: 10, marginTop: 4, marginBottom: 4 },
 eyebrow: { color: colors.primary, fontFamily: fonts.semibold, fontSize: 10, letterSpacing: 1.8 },
 title: { fontSize: 34, lineHeight: 43, fontFamily: fonts.display, color: colors.text },
 body: { fontFamily: fonts.body, color: colors.muted, fontSize: 14, lineHeight: 23 },
 card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 20, padding: 22, gap: 16 },
 notice: { backgroundColor: colors.primarySoft, borderRadius: 12, padding: 16, borderLeftWidth: 3, borderLeftColor: '#A8BCAD' },
 errorNotice: { backgroundColor: colors.errorSoft, borderLeftColor: colors.error }, errorText: { color: colors.error, fontFamily: fonts.medium, fontSize: 13, lineHeight: 21 },
 button: { minHeight: 52, borderRadius: 12, backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 },
 buttonText: { fontFamily: fonts.semibold, color: colors.surface, fontSize: 14, lineHeight: 21, textAlign: 'center' },
 secondaryButton: { backgroundColor: colors.warm, borderColor: colors.border, borderWidth: 1 },
 secondaryText: { color: colors.primary }, dim: { opacity: 0.6 },
 field: { gap: 9 }, label: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text },
 input: { fontFamily: fonts.body, backgroundColor: '#F4F5F1', minHeight: 52, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 15, color: colors.text, fontSize: 16, lineHeight: 25 },
 invalidInput: { borderColor: colors.error }, loading: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
});
