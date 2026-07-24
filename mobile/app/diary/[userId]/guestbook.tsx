import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';

export default function GuestbookScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>방명록</Text>
      <Text style={styles.sub}>최근 3개 미리보기. 사진·링크 금지. 신고·차단 경로 포함 예정.</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  title: { fontSize: 20, fontWeight: '600', color: colors.ink },
  sub: { marginTop: 8, color: colors.muted, lineHeight: 20 },
});
