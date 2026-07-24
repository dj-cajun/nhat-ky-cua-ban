import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getProfile, getSessionProfile } from '@/features/local/repository';
import { listBlockedUserIds, unblockUser } from '@/features/moderation/block.service';
import { colors } from '@/constants/theme';
import { en } from '@/i18n/en';

export default function BlockedUsersScreen() {
  const [meId, setMeId] = useState<string | null>(null);
  const [rows, setRows] = useState<{ id: string; name: string }[]>([]);

  const reload = useCallback(async () => {
    const me = await getSessionProfile();
    if (!me) {
      router.replace('/(auth)/sign-in');
      return;
    }
    setMeId(me.id);
    const ids = await listBlockedUserIds(me.id);
    const enriched = await Promise.all(
      ids.map(async (id) => ({
        id,
        name: (await getProfile(id))?.displayName ?? 'Member',
      })),
    );
    setRows(enriched);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const unblock = async (id: string) => {
    if (!meId) return;
    await unblockUser(meId, id);
    await reload();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>← Back</Text>
      </Pressable>
      <Text style={styles.title}>{en.settings.blockedUsers}</Text>
      <Text style={styles.sub}>{en.settings.blockedUsersSub}</Text>

      {rows.length === 0 ? (
        <Text style={styles.empty}>{en.settings.emptyBlocks}</Text>
      ) : (
        rows.map((r) => (
          <View key={r.id} style={styles.row}>
            <Text style={styles.name}>{r.name}</Text>
            <Pressable onPress={() => void unblock(r.id)}>
              <Text style={styles.unblock}>{en.settings.unblock}</Text>
            </Pressable>
          </View>
        ))
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  back: { color: colors.muted, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '600', color: colors.ink },
  sub: { marginTop: 8, marginBottom: 16, color: colors.muted, lineHeight: 20 },
  empty: { color: colors.soft },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  name: { color: colors.ink, fontSize: 15 },
  unblock: { color: colors.accent, fontSize: 13 },
});
