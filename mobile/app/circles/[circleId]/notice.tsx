import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  createCirclePost,
  getActivePost,
  getPollSummary,
  getSessionProfile,
  hasResponded,
  isCircleMember,
  listPollOptions,
  respondToPost,
  type CirclePostRecord,
} from '@/features/local/repository';
import { toAppError } from '@/lib/errors';
import { track } from '@/lib/logger';
import { usePresenceStore } from '@/stores/presence';
import { colors } from '@/constants/theme';
import { en } from '@/i18n/en';

export default function NoticeScreen() {
  const { circleId } = useLocalSearchParams<{ circleId: string }>();
  const [userId, setUserId] = useState<string | null>(null);
  const [post, setPost] = useState<CirclePostRecord | null>(null);
  const [options, setOptions] = useState<{ id: string; label: string }[]>([]);
  const [summary, setSummary] = useState<{
    totalResponded: number;
    options: { id: string; label: string; count: number }[];
  } | null>(null);
  const [done, setDone] = useState(false);
  const [mode, setMode] = useState<'view' | 'notice' | 'poll'>('view');
  const [title, setTitle] = useState('');
  const [opt1, setOpt1] = useState('');
  const [opt2, setOpt2] = useState('');
  const [opt3, setOpt3] = useState('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [error, setError] = useState('');
  const markResponded = usePresenceStore((s) => s.markResponded);
  const enter = usePresenceStore((s) => s.enter);

  const reload = useCallback(async () => {
    const me = await getSessionProfile();
    if (!me || !circleId) {
      router.replace('/(auth)/sign-in');
      return;
    }
    if (!(await isCircleMember(circleId, me.id))) {
      router.replace('/(tabs)/universe');
      return;
    }
    setUserId(me.id);
    const active = await getActivePost(circleId);
    setPost(active);
    enter(circleId, me.id, active?.id ?? null);
    if (active) {
      const responded = await hasResponded(active.id, me.id);
      setDone(responded);
      if (responded) {
        markResponded(circleId, me.id, active.id);
      }
      if (active.type === 'poll') {
        setOptions(await listPollOptions(active.id));
        setSummary(await getPollSummary(active.id, me.id));
      } else {
        setOptions([]);
        setSummary(null);
      }
    } else {
      setDone(false);
      setOptions([]);
      setSummary(null);
    }
  }, [circleId, enter, markResponded]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const create = async (type: 'notice' | 'poll') => {
    if (!userId || !circleId) return;
    setError('');
    try {
      const closesAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const created = await createCirclePost({
        circleId,
        createdBy: userId,
        type,
        title,
        closesAt,
        options: type === 'poll' ? [opt1, opt2, opt3].filter(Boolean) : undefined,
      });
      track('notice_created', { type, market: 'US' });
      setMode('view');
      setTitle('');
      setOpt1('');
      setOpt2('');
      setOpt3('');
      enter(circleId, userId, created.id);
      await reload();
    } catch (e) {
      setError(toAppError(e).message);
    }
  };

  const respond = async () => {
    if (!userId || !post) return;
    setError('');
    try {
      // DB first, then orange presence
      await respondToPost({
        postId: post.id,
        userId,
        optionId: post.type === 'poll' ? selectedOption ?? undefined : undefined,
      });
      markResponded(post.circleId, userId, post.id);
      track('notice_responded', { type: post.type, market: 'US' });
      await reload();
    } catch (e) {
      setError(toAppError(e).message);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>{en.circle.backUniverse.replace('Universe', 'Circle')}</Text>
        </Pressable>
        <Text style={styles.title}>{en.circle.noticeTitle}</Text>
        <Text style={styles.sub}>{en.circle.noticeSub}</Text>

        {post ? (
          <View style={styles.card}>
            <Text style={styles.badge}>{post.type === 'notice' ? 'Notice' : 'Poll'}</Text>
            <Text style={styles.postTitle}>{post.title}</Text>
            {post.body ? <Text style={styles.body}>{post.body}</Text> : null}

            {post.type === 'poll' && !done ? (
              <View style={{ marginTop: 12, gap: 8 }}>
                {options.map((o) => (
                  <Pressable
                    key={o.id}
                    onPress={() => setSelectedOption(o.id)}
                    style={[styles.option, selectedOption === o.id && styles.optionOn]}
                  >
                    <Text style={{ color: selectedOption === o.id ? '#fff' : colors.ink }}>
                      {o.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {post.type === 'poll' && summary ? (
              <View style={{ marginTop: 14 }}>
                <Text style={styles.label}>{en.circle.results}</Text>
                <Text style={styles.meta}>{en.circle.totalResponded(summary.totalResponded)}</Text>
                {summary.options.map((o) => (
                  <Text key={o.id} style={styles.body}>
                    {o.label}: {o.count}
                  </Text>
                ))}
              </View>
            ) : null}

            {!done ? (
              <Pressable
                style={styles.btn}
                onPress={() => void respond()}
                disabled={post.type === 'poll' && !selectedOption}
              >
                <Text style={styles.btnText}>
                  {post.type === 'notice' ? en.circle.acknowledge : en.circle.vote}
                </Text>
              </Pressable>
            ) : (
              <Text style={styles.done}>
                {post.type === 'notice' ? en.circle.acknowledged : en.circle.voted}
              </Text>
            )}
          </View>
        ) : (
          <Text style={styles.empty}>{en.circle.noActive}</Text>
        )}

        {mode === 'view' && !post ? (
          <View style={{ marginTop: 16, gap: 8 }}>
            <Pressable style={styles.secondary} onPress={() => setMode('notice')}>
              <Text>{en.circle.noticeCreate}</Text>
            </Pressable>
            <Pressable style={styles.secondary} onPress={() => setMode('poll')}>
              <Text>{en.circle.pollCreate}</Text>
            </Pressable>
          </View>
        ) : null}

        {(mode === 'notice' || mode === 'poll') && (
          <View style={styles.card}>
            <Text style={styles.label}>
              {mode === 'notice' ? en.circle.noticeCreate : en.circle.pollQuestion}
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={en.circle.noticePlaceholder}
              placeholderTextColor={colors.soft}
              style={styles.input}
            />
            {mode === 'poll' ? (
              <>
                <TextInput
                  value={opt1}
                  onChangeText={setOpt1}
                  placeholder={en.circle.optionN(1)}
                  placeholderTextColor={colors.soft}
                  style={styles.input}
                />
                <TextInput
                  value={opt2}
                  onChangeText={setOpt2}
                  placeholder={en.circle.optionN(2)}
                  placeholderTextColor={colors.soft}
                  style={styles.input}
                />
                <TextInput
                  value={opt3}
                  onChangeText={setOpt3}
                  placeholder={en.circle.optionN(3)}
                  placeholderTextColor={colors.soft}
                  style={styles.input}
                />
              </>
            ) : null}
            <Pressable style={styles.btn} onPress={() => void create(mode)}>
              <Text style={styles.btnText}>Post</Text>
            </Pressable>
            <Pressable onPress={() => setMode('view')}>
              <Text style={styles.back}>Cancel</Text>
            </Pressable>
          </View>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  back: { color: colors.muted, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '600', color: colors.ink },
  sub: { marginTop: 8, marginBottom: 16, color: colors.muted, lineHeight: 20 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    marginTop: 8,
  },
  badge: { fontSize: 11, color: colors.accent, marginBottom: 6 },
  postTitle: { fontSize: 18, fontWeight: '600', color: colors.ink },
  body: { marginTop: 6, color: colors.ink, lineHeight: 20 },
  label: { fontSize: 11, color: colors.accent, marginBottom: 6 },
  meta: { color: colors.soft, marginBottom: 6 },
  option: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 12,
  },
  optionOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  btn: {
    marginTop: 16,
    backgroundColor: colors.ink,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '600' },
  done: { marginTop: 14, color: colors.orange, fontSize: 13 },
  empty: { color: colors.soft, marginTop: 8 },
  secondary: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    color: colors.ink,
    backgroundColor: colors.card,
  },
  error: { marginTop: 12, color: colors.warn },
});
