import type { PropsWithChildren } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/tokens';

export function Screen({ children }: PropsWithChildren) {
  return <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
    <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">{children}</ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
export function Heading({ title, subtitle }: { title: string; subtitle?: string }) {
  return <View style={styles.heading}><Text style={styles.eyebrow}>WEDFLOW · MADE FOR YOUR FAMILY</Text>
    <Text accessibilityRole="header" style={styles.title}>{title}</Text>
    {subtitle ? <Text style={styles.body}>{subtitle}</Text> : null}</View>;
}
export function Card({ children }: PropsWithChildren) { return <View style={styles.card}>{children}</View>; }
export function Body({ children }: PropsWithChildren) { return <Text style={styles.body}>{children}</Text>; }
export function Notice({ children, error = false }: PropsWithChildren<{ error?: boolean }>) {
  return <View accessibilityRole={error ? 'alert' : undefined} accessibilityLiveRegion="polite" style={[styles.notice, error && styles.errorNotice]}>
    <Text style={[styles.body, error && styles.errorText]}>{children}</Text></View>;
}
export function Button({ title, onPress, busy = false, secondary = false, disabled = false }: {
  title: string; onPress: () => void; busy?: boolean; secondary?: boolean; disabled?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: disabled || busy, busy }}
    disabled={disabled || busy} onPress={onPress}
    style={({ pressed }) => [styles.button, secondary && styles.secondaryButton, (pressed || disabled || busy) && styles.dim]}>
    {busy ? <ActivityIndicator color={secondary ? colors.primary : colors.surface} /> : null}
    <Text style={[styles.buttonText, secondary && styles.secondaryText]}>{title}</Text>
  </Pressable>;
}
export function Field({ label, error, ...props }: TextInputProps & { label: string; error?: string }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text>
    <TextInput {...props} accessibilityLabel={label} accessibilityHint={error || props.accessibilityHint}
      placeholderTextColor={colors.muted} style={[styles.input, error && styles.invalidInput, props.style]} />
    {error ? <Text accessibilityLiveRegion="polite" style={styles.errorText}>{error}</Text> : null}</View>;
}
export function Loading({ message = 'Restoring your session…' }: { message?: string }) {
  return <Screen><View style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /><Body>{message}</Body></View></Screen>;
}
export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, paddingBottom: 48, gap: 20, width: '100%', maxWidth: 600, alignSelf: 'center', flexGrow: 1 },
  heading: { gap: 12, marginTop: 20 },
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  title: { fontSize: 32, lineHeight: 39, fontWeight: '700', color: colors.text },
  body: { color: colors.muted, fontSize: 16, lineHeight: 25 },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 20, padding: 20, gap: 16 },
  notice: { backgroundColor: colors.primarySoft, borderRadius: 14, padding: 16 },
  errorNotice: { backgroundColor: colors.errorSoft }, errorText: { color: colors.error, fontSize: 14, lineHeight: 21 },
  button: { minHeight: 52, borderRadius: 14, backgroundColor: colors.primary, paddingHorizontal: 18, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 },
  buttonText: { color: colors.surface, fontSize: 16, fontWeight: '600', textAlign: 'center' },
  secondaryButton: { backgroundColor: 'transparent', borderColor: colors.border, borderWidth: 1 },
  secondaryText: { color: colors.primary }, dim: { opacity: 0.55 },
  field: { gap: 7 }, label: { fontSize: 14, fontWeight: '600', color: colors.text },
  input: { backgroundColor: colors.surface, minHeight: 52, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, color: colors.text, fontSize: 16 },
  invalidInput: { borderColor: colors.error }, loading: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
});
