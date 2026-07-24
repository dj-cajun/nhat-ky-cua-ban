import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';
import { en } from '@/i18n/en';

export default function MessagesScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>{en.messages.title}</Text>
      <Text style={styles.sub}>{en.messages.sub}</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  title: { fontSize: 20, fontWeight: '600', color: colors.ink },
  sub: { marginTop: 8, color: colors.muted, lineHeight: 20 },
});
