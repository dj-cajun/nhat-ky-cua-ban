import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { colors } from '@/constants/theme';

export default function CircleDraftScreen() {
  const { draftId } = useLocalSearchParams<{ draftId: string }>();
  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>개척 초안</Text>
      <Text style={styles.sub}>draftId: {draftId}</Text>
      <Text style={styles.sub}>
        세 명 모두 수락 후 open_circle_from_draft RPC로만 정식 서클이 생성됩니다.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  title: { fontSize: 20, fontWeight: '600', color: colors.ink },
  sub: { marginTop: 8, color: colors.muted, lineHeight: 20 },
});
