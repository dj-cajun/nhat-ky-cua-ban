import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';
import { en } from '@/i18n/en';

export default function NotificationsScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>{en.notifications.title}</Text>
      <Text style={styles.sub}>{en.notifications.sub}</Text>
      <Text style={styles.empty}>{en.notifications.empty}</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  title: { fontSize: 22, fontWeight: '600', color: colors.ink },
  sub: { marginTop: 8, color: colors.muted, lineHeight: 20 },
  empty: { marginTop: 40, color: colors.soft, textAlign: 'center' },
});
