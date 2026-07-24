import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { colors } from '@/constants/theme';

type Props = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
};

/** Empty is not failure — calm copy, one optional CTA. */
export function AppEmptyState({ title, subtitle, actionLabel, onAction, style }: Props) {
  return (
    <View style={[styles.wrap, style]} accessibilityRole="summary">
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
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
  wrap: { paddingVertical: 28, paddingHorizontal: 8, alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '600', color: colors.ink, textAlign: 'center' },
  sub: { marginTop: 8, fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 20 },
  btn: {
    marginTop: 16,
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { color: '#fff', fontWeight: '600' },
});
