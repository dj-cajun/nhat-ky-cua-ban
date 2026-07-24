import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';

export default function CreateReportScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>신고</Text>
      <Text style={styles.sub}>
        콘텐츠 스냅샷을 남겨 수정·삭제 후에도 검토 가능. 가명 기능보다 먼저 필수.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  title: { fontSize: 20, fontWeight: '600', color: colors.ink },
  sub: { marginTop: 8, color: colors.muted, lineHeight: 20 },
});
