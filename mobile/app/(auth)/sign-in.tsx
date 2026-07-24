import { Link, router } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signUpLocal } from '@/features/local/repository';
import { toAppError } from '@/lib/errors';
import { track } from '@/lib/logger';
import { colors } from '@/constants/theme';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.brand}>너의 다이어리</Text>
      <Text style={styles.title}>로그인 방식을 선택하세요</Text>
      <Text style={styles.sub}>
        세 사람의 신뢰로 열리는 작은 서클에서, 아는 사람의 하루를 찾아갑니다.
      </Text>

      <Pressable style={[styles.btn, styles.ghost]} onPress={() => setError('Apple 로그인은 개발 빌드에서 연결됩니다.')}>
        <Text style={styles.ghostText}>Apple로 계속</Text>
        <Text style={styles.badge}>준비 중</Text>
      </Pressable>
      <Pressable style={[styles.btn, styles.ghost]} onPress={() => setError('Google 로그인은 Android 출시 시 추가됩니다.')}>
        <Text style={styles.ghostText}>Google로 계속</Text>
        <Text style={styles.badge}>준비 중</Text>
      </Pressable>

      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="email@example.com"
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
        placeholderTextColor={colors.soft}
      />
      <Pressable
        style={styles.btn}
        onPress={() => {
          if (!email.includes('@')) {
            setError('올바른 이메일을 입력해 주세요.');
            return;
          }
          router.push({ pathname: '/(auth)/onboarding', params: { email } });
        }}
      >
        <Text style={styles.btnText}>이메일로 계속</Text>
      </Pressable>

      <Pressable
        style={[styles.btn, styles.demo]}
        onPress={async () => {
          try {
            await signUpLocal('나');
            track('circle_creation_started', { via: 'demo_shortcut' });
            router.replace('/(tabs)/universe');
          } catch (e) {
            setError(toAppError(e).message);
          }
        }}
      >
        <Text style={styles.btnText}>데모로 바로 시작</Text>
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Link href="/(auth)/sign-up" style={styles.link}>
        계정이 없나요? 가입
      </Link>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, padding: 20, backgroundColor: colors.bg },
  brand: { color: colors.accent, fontSize: 12, letterSpacing: 1 },
  title: { marginTop: 8, fontSize: 24, fontWeight: '600', color: colors.ink },
  sub: { marginTop: 8, marginBottom: 24, color: colors.muted, lineHeight: 20 },
  btn: {
    backgroundColor: colors.ink,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  ghost: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  ghostText: { color: colors.soft, fontSize: 14 },
  badge: { color: colors.soft, fontSize: 11 },
  demo: { marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
    color: colors.ink,
  },
  error: { marginTop: 12, color: colors.warn, fontSize: 13 },
  link: { marginTop: 20, color: colors.muted, fontSize: 13 },
});
