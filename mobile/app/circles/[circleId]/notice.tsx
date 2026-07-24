import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';

export default function NoticeScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>공지·투표</Text>
      <Text style={styles.sub}>
        활성 항목은 서클당 1개. 개인 응답은 비공개이며 집계만 공개합니다. 서버 partial unique index로
        강제합니다.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  title: { fontSize: 20, fontWeight: '600', color: colors.ink },
  sub: { marginTop: 8, color: colors.muted, lineHeight: 20 },
});
