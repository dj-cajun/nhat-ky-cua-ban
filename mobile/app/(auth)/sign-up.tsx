import { router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';

export default function SignUpScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>가입</Text>
      <Text style={styles.sub}>이메일 또는 데모로 시작할 수 있어요.</Text>
      <Pressable style={styles.btn} onPress={() => router.replace('/(auth)/sign-in')}>
        <Text style={styles.btnText}>로그인으로 돌아가기</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, padding: 20, backgroundColor: colors.bg },
  title: { fontSize: 24, fontWeight: '600', color: colors.ink },
  sub: { marginTop: 8, color: colors.muted },
  btn: {
    marginTop: 24,
    backgroundColor: colors.ink,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '600' },
});
