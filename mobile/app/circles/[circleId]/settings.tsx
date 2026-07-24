import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';

export default function CircleSettingsScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>서클 설정</Text>
      <Text style={styles.sub}>이름·색·상징 수정, 탈퇴, 알림 설정은 이후 단계에서 연결합니다.</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  title: { fontSize: 20, fontWeight: '600', color: colors.ink },
  sub: { marginTop: 8, color: colors.muted, lineHeight: 20 },
});
