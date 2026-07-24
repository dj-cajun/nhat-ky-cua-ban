import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';

export default function AnonymousBoardScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>가명 게시판</Text>
      <Text style={styles.sub}>
        신고·차단·운영 도구를 먼저 완성한 뒤 연결합니다. author_user_id는 클라이언트에 노출하지
        않습니다.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  title: { fontSize: 20, fontWeight: '600', color: colors.ink },
  sub: { marginTop: 8, color: colors.muted, lineHeight: 20 },
});
