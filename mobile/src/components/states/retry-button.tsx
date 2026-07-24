import { Pressable, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { colors } from '@/constants/theme';
import { en } from '@/i18n/en';

type Props = {
  onPress: () => void;
  label?: string;
  pending?: boolean;
  disabled?: boolean;
};

export function RetryButton({
  onPress,
  label = en.states.retry,
  pending = false,
  disabled = false,
}: Props) {
  const busy = pending || disabled;
  return (
    <Pressable
      style={[styles.btn, busy && styles.disabled]}
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy: pending, disabled: busy }}
    >
      {pending ? (
        <ActivityIndicator color={colors.ink} />
      ) : (
        <Text style={styles.text}>{label}</Text>
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
