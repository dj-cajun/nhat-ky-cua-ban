import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { colors } from '@/constants/theme';
import { useMessages } from '@/i18n';
type Props = {
  title?: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
};

export function AppForbiddenState({
  title,
  subtitle,
  actionLabel,
  onAction,
  style,
}: Props) {
  const t = useMessages();
  const resolvedTitle = title ?? t.states.forbiddenTitle;
  const resolvedSubtitle = subtitle ?? t.states.forbiddenSub;
  return (
    <View style={[styles.wrap, style]} accessibilityRole="alert">
      <Text style={styles.title}>{resolvedTitle}</Text>
      <Text style={styles.sub}>{resolvedSubtitle}</Text>
      {actionLabel && onAction ? (
        <Pressable
          style={styles.btn}
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text style={styles.btnText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, alignItems: 'flex-start' },
  title: { fontSize: 20, fontWeight: '600', color: colors.ink },
  sub: { marginTop: 8, fontSize: 14, color: colors.muted, lineHeight: 20 },
  btn: {
    marginTop: 16,
    minHeight: 44,
    paddingHorizontal: 4,
    justifyContent: 'center',
  },
  btnText: { color: colors.muted },
});
