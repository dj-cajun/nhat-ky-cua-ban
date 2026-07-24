import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/theme';
import { useMessages } from '@/i18n';
type Props = {
  visible: boolean;
  message?: string;
};

/** Non-blocking banner — drafts stay on device while offline. */
export function OfflineBanner({ visible, message }: Props) {
  const t = useMessages();
  const resolvedMessage = message ?? t.states.offlineBanner;
  if (!visible) return null;
  return (
    <View style={styles.banner} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Text style={styles.text}>{resolvedMessage}</Text>
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
