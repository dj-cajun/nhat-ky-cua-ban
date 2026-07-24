import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';

export default function DiaryCalendarScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>과거 기록</Text>
      <Text style={styles.sub}>달력은 사용자가 열 때 로드합니다. entry_date + timezone 기준.</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  title: { fontSize: 20, fontWeight: '600', color: colors.ink },
  sub: { marginTop: 8, color: colors.muted, lineHeight: 20 },
});
