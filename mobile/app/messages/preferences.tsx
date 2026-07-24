import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getMyMessagePreferences,
  updateMyMessagePreferences,
} from '@/features/private-messages/private-message.service';
import { getSessionProfile } from '@/features/local/repository';
import { toAppError } from '@/lib/errors';
import { colors } from '@/constants/theme';
import { useMessages } from '@/i18n';
export default function MessagePreferencesScreen() {
  const t = useMessages();
  const [meId, setMeId] = useState<string | null>(null);
  const [named, setNamed] = useState(true);
  const [alias, setAlias] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    void (async () => {
      const me = await getSessionProfile();
      if (!me) {
        router.replace('/(auth)/sign-in');
        return;
      }
      setMeId(me.id);
      const prefs = await getMyMessagePreferences(me.id);
      setNamed(prefs.namedEnabled);
      setAlias(prefs.aliasEnabled);
    })();
  }, []);

  const save = async (nextNamed: boolean, nextAlias: boolean) => {
    if (!meId) return;
    setError('');
    try {
      const prefs = await updateMyMessagePreferences(meId, nextNamed, nextAlias);
      setNamed(prefs.namedEnabled);
      setAlias(prefs.aliasEnabled);
    } catch (e) {
      setError(toAppError(e).message);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>{t.messages.back}</Text>
      </Pressable>
      <Text style={styles.title}>{t.messages.preferences}</Text>
      <Text style={styles.sub}>{t.messages.preferencesSub}</Text>

      <View style={styles.row}>
        <Text style={styles.label}>{t.messages.namedEnabled}</Text>
        <Switch
          value={named}
          onValueChange={(v) => void save(v, alias)}
          trackColor={{ true: colors.accent }}
        />
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>{t.messages.aliasEnabled}</Text>
        <Switch
          value={alias}
          onValueChange={(v) => void save(named, v)}
          trackColor={{ true: colors.accent }}
        />
      </View>
      <Text style={styles.hint}>{t.messages.aliasOffHint}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  back: { color: colors.muted, marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '600', color: colors.ink },
  sub: { marginTop: 8, color: colors.muted, lineHeight: 20, marginBottom: 20 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  label: { color: colors.ink, fontSize: 15, flex: 1, paddingRight: 12 },
  hint: { marginTop: 14, fontSize: 12, color: colors.soft, lineHeight: 18 },
  error: { marginTop: 10, color: colors.warn },
});
