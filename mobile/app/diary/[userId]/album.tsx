import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';

export default function DiaryAlbumScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>사진첩</Text>
      <Text style={styles.sub}>
        썸네일 목록 → 상세에서만 큰 이미지. EXIF 제거 · Storage 경로 userId=auth.uid() 검사.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  title: { fontSize: 20, fontWeight: '600', color: colors.ink },
  sub: { marginTop: 8, color: colors.muted, lineHeight: 20 },
});
