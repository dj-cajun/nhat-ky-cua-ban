import { router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';
import { useMessages } from '@/i18n';
export default function SignUpScreen() {
  const t = useMessages();
  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>{t.auth.signUpTitle}</Text>
      <Text style={styles.sub}>{t.auth.signUpSub}</Text>
      <Pressable style={styles.btn} onPress={() => router.replace('/(auth)/sign-in')}>
        <Text style={styles.btnText}>{t.auth.backToSignIn}</Text>
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
