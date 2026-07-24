import { Pressable, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { colors } from '@/constants/theme';
import { useMessages } from '@/i18n';
type Props = {
  onPress: () => void;
  label?: string;
  pending?: boolean;
  disabled?: boolean;
};

export function RetryButton({
  onPress,
  label,
  pending = false,
  disabled = false,
}: Props) {
  const t = useMessages();
  const resolvedLabel = label ?? t.states.retry;
  const busy = pending || disabled;
  return (
    <Pressable
      style={[styles.btn, busy && styles.disabled]}
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={resolvedLabel}
      accessibilityState={{ busy: pending, disabled: busy }}
    >
      {pending ? (
        <ActivityIndicator color={colors.ink} />
      ) : (
        <Text style={styles.text}>{resolvedLabel}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 44,
    minWidth: 88,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.55 },
  text: { color: colors.ink, fontWeight: '600' },
});
