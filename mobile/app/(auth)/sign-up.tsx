import { router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';
import { en } from '@/i18n/en';

export default function SignUpScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>{en.auth.signUpTitle}</Text>
      <Text style={styles.sub}>{en.auth.signUpSub}</Text>
      <Pressable style={styles.btn} onPress={() => router.replace('/(auth)/sign-in')}>
        <Text style={styles.btnText}>{en.auth.backToSignIn}</Text>
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
