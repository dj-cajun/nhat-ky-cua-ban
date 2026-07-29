import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  demoAcceptAll,
  getMySchoolMembership,
  getSessionProfile,
  listDirectory,
  proposeCircleDraft,
  updateCircleDesign,
} from '@/features/local/repository';
import { openCircleGraph } from '@/features/universe-home/circle-visit';
import { toAppError } from '@/lib/errors';
import { track } from '@/lib/logger';
import type { Profile } from '@/types/domain';
import type { SchoolMembershipStatus } from '@/features/local/school';
import { colors } from '@/constants/theme';
import { useMessages } from '@/i18n';

export default function CreateCircleScreen() {
  const t = useMessages();
  const [me, setMe] = useState<Profile | null>(null);
  const [directory, setDirectory] = useState<Profile[]>([]);
  const [name, setName] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [schoolStatus, setSchoolStatus] = useState<SchoolMembershipStatus | null>(null);

  useEffect(() => {
    void (async () => {
      const p = await getSessionProfile();
      if (!p) {
        router.replace('/(auth)/sign-in');
        return;
      }
      setMe(p);
      const membership = await getMySchoolMembership(p.id);
      setSchoolStatus(membership.status);
      if (membership.status !== 'verified') {
        return;
      }
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
    if (schoolStatus !== 'verified') {
      setError(t.school.restrictedTitle);
      return;
    }
    if (!name.trim()) {
      setError(t.circle.nameRequired);
      return;
    }
    if (picked.length !== 2) {
      setError(t.circle.pickRequired);
      return;
    }
    try {
      track('circle_creation_started', { market: 'US' });
      const { draftId } = await proposeCircleDraft(me.id, name, [picked[0], picked[1]]);
      const circle = await demoAcceptAll(draftId);
      await updateCircleDesign(circle.id, me.id, { name: name.trim() });
      track('circle_creation_completed', { circle_size_bucket: '3-5', market: 'US' });
      openCircleGraph(circle.id);
    } catch (e) {
      setError(toAppError(e).message);
    }
  };

  if (schoolStatus && schoolStatus !== 'verified') {
    return (
      <SafeAreaView style={styles.safe}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>{t.circle.cancel}</Text>
        </Pressable>
        <Text style={styles.title}>{t.school.restrictedTitle}</Text>
        <Text style={styles.sub}>{t.school.restrictedBody}</Text>
        <Pressable
          style={styles.btn}
          onPress={() => router.push('/school')}
          accessibilityRole="button"
        >
          <Text style={styles.btnText}>{t.settings.school}</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>{t.circle.cancel}</Text>
      </Pressable>
      <Text style={styles.title}>{t.circle.createTitle}</Text>
      <Text style={styles.sub}>{t.circle.createSub}</Text>

      <Text style={styles.label}>{t.circle.tempName}</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        style={styles.input}
        placeholder={t.circle.namePlaceholder}
        placeholderTextColor={colors.soft}
      />

      <Text style={styles.label}>{t.circle.pickTwo(picked.length)}</Text>
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
        <Text style={styles.btnText}>{t.circle.sendInvites}</Text>
      </Pressable>
      <Text style={styles.hint}>{t.circle.demoHint}</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, padding: 20, backgroundColor: colors.bg },
  back: { color: colors.muted, marginBottom: 12, minHeight: 44 },
  title: { fontSize: 22, fontWeight: '600', color: colors.ink },
  sub: { marginTop: 8, marginBottom: 20, color: colors.muted, lineHeight: 20 },
  label: { fontSize: 12, color: colors.soft, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: colors.ink,
    marginBottom: 16,
  },
  person: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 12,
    backgroundColor: colors.card,
  },
  personOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  personText: { color: colors.ink },
  personTextOn: { color: colors.bg, fontWeight: '600' },
  error: { marginTop: 12, color: colors.warn },
  btn: {
    marginTop: 24,
    backgroundColor: colors.ink,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    minHeight: 44,
  },
  btnText: { color: '#fff', fontWeight: '600' },
  hint: { marginTop: 10, fontSize: 11, color: colors.soft, textAlign: 'center' },
});
