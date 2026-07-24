import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';

export default function NotificationsScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>알림</Text>
      <Text style={styles.sub}>
        개척 요청 · 추천 요청 · 공지 · 쪽지만 표시합니다. 방문·조회수 알림은 보내지 않아요.
      </Text>
      <Text style={styles.empty}>아직 알림이 없어요.</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  title: { fontSize: 22, fontWeight: '600', color: colors.ink },
  sub: { marginTop: 8, color: colors.muted, lineHeight: 20 },
  empty: { marginTop: 40, color: colors.soft, textAlign: 'center' },
});
