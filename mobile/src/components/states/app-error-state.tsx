import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { colors } from '@/constants/theme';
import { useMessages } from '@/i18n';
import type { AppErrorCode } from '@/types/domain';
import { messageForCode } from '@/lib/errors';

type Props = {
  code?: AppErrorCode;
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  style?: ViewStyle;
};

export function AppErrorState({
  code = 'UNKNOWN',
  title,
  message,
  onRetry,
  retryLabel,
  style,
}: Props) {
  const t = useMessages();
  const resolvedRetryLabel = retryLabel ?? t.states.retry;
  const body = message ?? messageForCode(code);
  return (
    <View style={[styles.wrap, style]} accessibilityRole="alert">
      <Text style={styles.title}>{title ?? t.states.errorTitle}</Text>
      <Text style={styles.body}>{body}</Text>
      {onRetry ? (
        <Pressable
          style={styles.btn}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel={resolvedRetryLabel}
        >
          <Text style={styles.btnText}>{resolvedRetryLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: 28, paddingHorizontal: 8, alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '600', color: colors.warn, textAlign: 'center' },
  body: { marginTop: 8, fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 20 },
  btn: {
    marginTop: 16,
    minHeight: 44,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { color: colors.ink, fontWeight: '600' },
});
