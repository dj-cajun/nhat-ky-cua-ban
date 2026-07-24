import { StyleSheet, Text, View } from 'react-native';
import type { MemberBadge } from '@/features/presence/derive-member-badge';
import { colors } from '@/constants/theme';
import { en } from '@/i18n/en';

type Props = {
  badge: MemberBadge;
  displayName: string;
  /** When realtime is down, hide color dots (keep layout). */
  connectionOk?: boolean;
};

/**
 * Presence / response badge — color + shape + accessibility label.
 * Green = present; orange = present + verified response (check mark shape).
 */
export function MemberPresenceBadge({ badge, displayName, connectionOk = true }: Props) {
  if (!connectionOk || !badge) {
    return <View style={styles.slot} />;
  }

  const label =
    badge === 'orange'
      ? en.a11y.badgeOrange(displayName)
      : en.a11y.badgeGreen(displayName);

  return (
    <View
      style={[
        styles.slot,
        styles.dot,
        badge === 'orange' ? styles.orange : styles.green,
      ]}
      accessibilityLabel={label}
      accessibilityRole="image"
    >
      {badge === 'orange' ? <Text style={styles.check}>✓</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  slot: { width: 14, height: 14, marginTop: 4 },
  dot: {
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  green: { backgroundColor: colors.green },
  orange: {
    backgroundColor: colors.orange,
    borderRadius: 3,
  },
  check: { color: '#fff', fontSize: 8, fontWeight: '700', lineHeight: 10 },
});
