import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  demoAcceptAll,
  getSessionProfile,
  listDirectory,
  proposeCircleDraft,
  updateCircleDesign,
} from '@/features/local/repository';
import { toAppError } from '@/lib/errors';
import { track } from '@/lib/logger';
import type { Profile } from '@/types/domain';
import { colors } from '@/constants/theme';
import { en } from '@/i18n/en';

export default function CreateCircleScreen() {
  const [me, setMe] = useState<Profile | null>(null);
  const [directory, setDirectory] = useState<Profile[]>([]);
  const [name, setName] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    void (async () => {
      const p = await getSessionProfile();
      if (!p) {
        router.replace('/(auth)/sign-in');
        return;
      }
      setMe(p);
      setDirectory(await listDirectory(p.id));
    })();
  }, []);

  const toggle = (id: string) => {
    setPicked((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return prev;
      return [...prev, id];
    });
  };

  const submit = async () => {
    if (!me) return;
    setError('');
    if (!name.trim()) {
      setError(en.circle.nameRequired);
      return;
    }
    if (picked.length !== 2) {
      setError(en.circle.pickRequired);
      return;
    }
    try {
      track('circle_creation_started', { market: 'US' });
      const { draftId } = await proposeCircleDraft(me.id, name, [picked[0], picked[1]]);
      const circle = await demoAcceptAll(draftId);
      await updateCircleDesign(circle.id, me.id, { name: name.trim() });
      track('circle_creation_completed', { circle_size_bucket: '3-5', market: 'US' });
      router.replace(`/circles/${circle.id}`);
    } catch (e) {
      setError(toAppError(e).message);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>{en.circle.cancel}</Text>
      </Pressable>
      <Text style={styles.title}>{en.circle.createTitle}</Text>
      <Text style={styles.sub}>{en.circle.createSub}</Text>

      <Text style={styles.label}>{en.circle.tempName}</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        style={styles.input}
        placeholder={en.circle.namePlaceholder}
        placeholderTextColor={colors.soft}
      />

      <Text style={styles.label}>{en.circle.pickTwo(picked.length)}</Text>
      <View style={{ gap: 8 }}>
        {directory.slice(0, 5).map((p) => {
          const on = picked.includes(p.id);
          return (
            <Pressable
              key={p.id}
              onPress={() => toggle(p.id)}
              style={[styles.person, on && styles.personOn]}
            >
              <Text style={[styles.personText, on && styles.personTextOn]}>{p.displayName}</Text>
            </Pressable>
          );
        })}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.btn} onPress={() => void submit()}>
        <Text style={styles.btnText}>{en.circle.sendInvites}</Text>
      </Pressable>
      <Text style={styles.hint}>{en.circle.demoHint}</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  back: { color: colors.muted, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '600', color: colors.ink },
  sub: { marginTop: 8, marginBottom: 20, color: colors.muted, lineHeight: 20 },
  label: { fontSize: 12, color: colors.soft, marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: colors.ink,
  },
  person: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
  },
  personOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  personText: { color: colors.ink },
  personTextOn: { color: '#fff' },
  error: { marginTop: 12, color: colors.warn },
  btn: {
    marginTop: 24,
    backgroundColor: colors.ink,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '600' },
  hint: { marginTop: 10, fontSize: 11, color: colors.soft, textAlign: 'center' },
});
