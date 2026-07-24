import { router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';
import { useMessages } from '@/i18n';
export default function CircleSettingsScreen() {
  const t = useMessages();
  return (
    <SafeAreaView style={styles.safe}>
      <Pressable onPress={() => router.back()} accessibilityRole="button">
        <Text style={styles.back}>{t.circle.backUniverse}</Text>
      </Pressable>
      <Text style={styles.title}>{t.circle.settingsTitle}</Text>
      <Text style={styles.sub}>{t.circle.settingsSub}</Text>
      <Pressable
        style={styles.link}
        onPress={() => router.push('/settings/blocked-users')}
        accessibilityRole="button"
      >
        <Text style={styles.linkText}>{t.settings.blockedUsers}</Text>
      </Pressable>
      <Pressable
        style={styles.link}
        onPress={() => router.push('/settings/account')}
        accessibilityRole="button"
      >
        <Text style={styles.linkText}>{t.settings.account}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  back: { color: colors.muted, marginBottom: 12, minHeight: 44 },
  title: { fontSize: 20, fontWeight: '600', color: colors.ink },
  sub: { marginTop: 8, color: colors.muted, lineHeight: 20, marginBottom: 16 },
  link: {
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    padding: 14,
    minHeight: 44,
    justifyContent: 'center',
  },
  linkText: { color: colors.ink, fontSize: 14 },
});
