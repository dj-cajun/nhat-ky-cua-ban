import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';

export default function MessagesScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>쪽지</Text>
      <Text style={styles.sub}>일반 채팅방 없음. 실명/가명 단건 쪽지만. 서버 횟수 제한.</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  title: { fontSize: 20, fontWeight: '600', color: colors.ink },
  sub: { marginTop: 8, color: colors.muted, lineHeight: 20 },
});
