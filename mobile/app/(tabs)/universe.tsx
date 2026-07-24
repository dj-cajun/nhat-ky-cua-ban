import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getSessionProfile,
  listMyCircleSummaries,
} from '@/features/local/repository';
import type { CircleSummary, Profile } from '@/types/domain';
import { colors } from '@/constants/theme';
import { en } from '@/i18n/en';

export default function UniverseScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [circles, setCircles] = useState<CircleSummary[]>([]);

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        const p = await getSessionProfile();
        if (!p) {
          router.replace('/(auth)/sign-in');
          return;
        }
        setProfile(p);
        setCircles(await listMyCircleSummaries(p.id));
      })();
    }, []),
  );

  if (!profile) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>{en.universe.brand}</Text>
          <Text style={styles.title}>{en.universe.title}</Text>
        </View>
        <Pressable
          style={styles.avatar}
          onPress={() => router.push(`/diary/${profile.id}`)}
        >
          <Text style={styles.avatarText}>{profile.displayName.slice(0, 1)}</Text>
        </Pressable>
      </View>

      <View style={styles.map}>
        <Pressable style={styles.me} onPress={() => router.push(`/diary/${profile.id}`)}>
          <Text style={styles.meInitial}>{profile.displayName.slice(0, 1)}</Text>
          <Text style={styles.meName}>{profile.displayName}</Text>
        </Pressable>

        <View style={styles.circleRow}>
          {circles.map((c) => (
            <Pressable
              key={c.id}
              style={[styles.circle, { backgroundColor: c.color }]}
              onPress={() => router.push(`/circles/${c.id}`)}
            >
              <Text style={styles.symbol}>{c.symbol}</Text>
              <Text style={styles.circleName} numberOfLines={1}>
                {c.name}
              </Text>
              <Text style={styles.meta}>{en.universe.wroteToday(c.wroteTodayCount)}</Text>
              {c.hasActiveNotice ? <Text style={styles.meta}>{en.universe.notice}</Text> : null}
            </Pressable>
          ))}
        </View>
      </View>

      <Pressable style={styles.create} onPress={() => router.push('/circles/create')}>
        <Text style={styles.createText}>{en.universe.createCircle}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { color: colors.accent, fontSize: 12 },
  title: { fontSize: 22, fontWeight: '600', color: colors.ink },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700' },
  map: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  me: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meInitial: { fontSize: 28, color: colors.ink },
  meName: { marginTop: 4, fontSize: 12, color: colors.muted },
  circleRow: { marginTop: 28, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 },
  circle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  symbol: { color: '#fff', fontSize: 18 },
  circleName: { color: '#fff', fontSize: 11, marginTop: 2, maxWidth: 72 },
  meta: { color: 'rgba(255,255,255,0.9)', fontSize: 9 },
  create: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    paddingVertical: 14,
    alignItems: 'center',
  },
  createText: { color: colors.ink, fontSize: 14 },
});
