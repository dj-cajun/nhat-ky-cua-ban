import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';
import { useMessages } from '@/i18n';
export default function GuestbookScreen() {
  const t = useMessages();
  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>{t.guestbook.title}</Text>
      <Text style={styles.sub}>{t.guestbook.sub}</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  title: { fontSize: 20, fontWeight: '600', color: colors.ink },
  sub: { marginTop: 8, color: colors.muted, lineHeight: 20 },
});
