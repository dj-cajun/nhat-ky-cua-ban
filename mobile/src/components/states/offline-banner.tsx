import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/theme';
import { en } from '@/i18n/en';

type Props = {
  visible: boolean;
  message?: string;
};

/** Non-blocking banner — drafts stay on device while offline. */
export function OfflineBanner({ visible, message = en.states.offlineBanner }: Props) {
  if (!visible) return null;
  return (
    <View style={styles.banner} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#E8DFD4',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  text: { color: colors.ink, fontSize: 13, lineHeight: 18 },
});
