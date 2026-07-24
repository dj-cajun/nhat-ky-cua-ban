import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { colors } from '@/constants/theme';
import { en } from '@/i18n/en';

type Props = {
  label?: string;
  style?: ViewStyle;
};

/** Lightweight skeleton / loading placeholder — avoid full-screen flash when cache exists. */
export function AppLoadingState({ label = en.states.loading, style }: Props) {
  return (
    <View style={[styles.wrap, style]} accessibilityRole="progressbar" accessibilityLabel={label}>
      <View style={styles.bar} />
      <View style={[styles.bar, styles.barShort]} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: 24, alignItems: 'center', gap: 10 },
  bar: {
    height: 12,
    width: '80%',
    borderRadius: 6,
    backgroundColor: colors.line,
  },
  barShort: { width: '55%' },
  label: { marginTop: 8, color: colors.muted, fontSize: 13 },
});
