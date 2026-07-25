import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AppErrorState,
  AppLoadingState,
} from '@/components/states';
import { OutlineBox } from '@/features/diary-home/hompy-outline';
import {
  addFreeBoardPost,
  getProfile,
  getSessionProfile,
  listFreeBoard,
  type FreeBoardRow,
} from '@/features/local/repository';
import { toAppError } from '@/lib/errors';
import { hompy } from '@/constants/hompy-theme';
import { useLocale, useMessages } from '@/i18n';
import type { Profile } from '@/types/domain';

export default function FreeBoardScreen() {
  const t = useMessages();
  const [locale] = useLocale();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const [me, setMe] = useState<Profile | null>(null);
  const [owner, setOwner] = useState<Profile | null>(null);
  const [rows, setRows] = useState<FreeBoardRow[]>([]);
  const [authors, setAuthors] = useState<Record<string, string>>({});
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async (session: Profile, ownerId: string) => {
    const list = await listFreeBoard(ownerId, session.id);
    setRows(list);
    const map: Record<string, string> = {};
    for (const p of list) {
      if (map[p.authorUserId]) continue;
      const profile = await getProfile(p.authorUserId);
      if (profile) map[p.authorUserId] = profile.displayName;
    }
    setAuthors(map);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const session = await getSessionProfile();
        if (!session || !userId) {
          router.replace('/(auth)/sign-in');
          return;
        }
        setMe(session);
        setOwner(await getProfile(userId));
        await reload(session, userId);
      } catch (e) {
        setError(toAppError(e).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId, reload]);

  const isMine = me?.id === userId;
  /** Owner and visitors who can open this homepage may write. */
  const canWrite = Boolean(me && owner);

  const onSubmit = async () => {
    if (!me || !userId || !canWrite || saving) return;
    setSaving(true);
    setError('');
    try {
      await addFreeBoardPost({
        ownerUserId: userId,
        authorUserId: me.id,
        body,
      });
      setBody('');
      await reload(me, userId);
    } catch (e) {
      setError(toAppError(e).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <AppLoadingState />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <OutlineBox
        fill={hompy.canvas}
        stroke={hompy.pencilBold}
        style={styles.shell}
        contentStyle={styles.shellInner}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.back}>← {locale === 'ko' ? '홈피' : 'Home'}</Text>
          </Pressable>
          <Text style={styles.title}>{t.freeBoard.title}</Text>
          <Text style={styles.sub}>
            {locale === 'ko'
              ? `${owner?.displayName ?? ''} 홈피 · 자유게시판`
              : `${owner?.displayName ?? ''}'s free board`}
          </Text>
          {isMine ? (
            <Text style={styles.ownerBadge}>
              {locale === 'ko' ? '홈피 주인 · 글쓰기 가능' : 'Homepage owner · you can write'}
            </Text>
          ) : null}
        </View>

        {error ? <AppErrorState message={error} /> : null}

        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {locale === 'ko'
                ? '아직 자유게시판 글이 없어요.'
                : 'No free-board posts yet.'}
            </Text>
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={styles.author}>
                {authors[item.authorUserId] ?? '·'}
                {item.authorUserId === userId
                  ? locale === 'ko'
                    ? ' (주인)'
                    : ' (owner)'
                  : ''}
              </Text>
              <Text style={styles.body}>{item.body}</Text>
            </View>
          )}
        />

        {canWrite ? (
          <View style={styles.composer}>
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder={
                locale === 'ko'
                  ? isMine
                    ? '내 자유게시판에 남겨요'
                    : '자유게시판에 남겨요'
                  : isMine
                    ? 'Write on your free board'
                    : 'Write on this free board'
              }
              placeholderTextColor={hompy.soft}
              maxLength={300}
              style={styles.input}
              multiline
            />
            <Pressable
              onPress={() => void onSubmit()}
              disabled={saving || body.trim().length === 0}
              style={[styles.sendBtn, body.trim().length === 0 && styles.sendDisabled]}
            >
              <Text style={styles.sendText}>
                {saving
                  ? locale === 'ko'
                    ? '올리는 중…'
                    : 'Posting…'
                  : locale === 'ko'
                    ? '올리기'
                    : 'Post'}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </OutlineBox>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: hompy.table, padding: 8 },
  shell: { flex: 1 },
  shellInner: { flex: 1, padding: 12, gap: 8 },
  header: { gap: 4 },
  back: { fontSize: 11, fontWeight: '700', color: hompy.ink },
  title: { fontSize: 18, fontWeight: '700', color: hompy.ink },
  sub: { fontSize: 11, color: hompy.muted },
  ownerBadge: {
    alignSelf: 'flex-start',
    marginTop: 2,
    fontSize: 10,
    fontWeight: '700',
    color: hompy.ink,
    backgroundColor: 'rgba(255,232,240,0.8)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  list: { paddingVertical: 8, gap: 8, flexGrow: 1 },
  row: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(74,63,85,0.18)',
    borderStyle: 'dotted',
    paddingBottom: 8,
    gap: 2,
  },
  author: { fontSize: 11, fontWeight: '700', color: hompy.soft },
  body: { fontSize: 13, color: hompy.ink, lineHeight: 18 },
  empty: { fontSize: 12, color: hompy.soft, paddingVertical: 16 },
  composer: { gap: 8, paddingTop: 4 },
  input: {
    minHeight: 72,
    borderWidth: 1,
    borderColor: hompy.blushInk,
    backgroundColor: hompy.blush,
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    color: hompy.ink,
    textAlignVertical: 'top',
  },
  sendBtn: {
    alignSelf: 'flex-end',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: hompy.hard,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  sendDisabled: { opacity: 0.45 },
  sendText: { fontSize: 12, fontWeight: '700', color: hompy.ink },
});
