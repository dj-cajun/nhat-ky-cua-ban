import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
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
  AppEmptyState,
  AppErrorState,
  AppForbiddenState,
  AppLoadingState,
} from '@/components/states';
import {
  closeCirclePost,
  createCirclePost,
} from '@/features/circle-posts/circle-post.service';
import type { CirclePostSummary } from '@/features/circle-posts/circle-post.types';
import { defaultClosesAt } from '@/features/circle-posts/circle-post.validation';
import { useActiveCirclePost } from '@/features/circle-posts/use-active-circle-post';
import { useCirclePostResponse } from '@/features/circle-posts/use-circle-post-response';
import { getSessionProfile, isCircleMember } from '@/features/local/repository';
import { circlePresenceService } from '@/features/presence/circle-presence.service';
import { syncVerifiedBadges } from '@/features/presence/verified-response.service';
import { toAppError } from '@/lib/errors';
import { track } from '@/lib/logger';
import { colors } from '@/constants/theme';
import { en } from '@/i18n/en';

export default function NoticeScreen() {
  const { circleId } = useLocalSearchParams<{ circleId: string }>();
  const [userId, setUserId] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [bootLoading, setBootLoading] = useState(true);
  const [mode, setMode] = useState<'view' | 'notice' | 'poll'>('view');
  const [title, setTitle] = useState('');
  const [opt1, setOpt1] = useState('');
  const [opt2, setOpt2] = useState('');
  const [opt3, setOpt3] = useState('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [createError, setCreateError] = useState('');

  const { post, options, summary, canCreate, reload } = useActiveCirclePost(circleId, userId);
  const [liveSummary, setLiveSummary] = useState<CirclePostSummary | null>(null);

  useEffect(() => {
    setLiveSummary(summary);
    setSelectedOption(summary?.currentUserOptionId ?? null);
  }, [summary]);

  const { acknowledge, vote, error, pending } = useCirclePostResponse({
    userId,
    post,
    onSummary: (s) => {
      setLiveSummary(s);
      void reload();
    },
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await getSessionProfile();
        if (!me || !circleId) {
          router.replace('/(auth)/sign-in');
          return;
        }
        if (!(await isCircleMember(circleId, me.id))) {
          if (!cancelled) setForbidden(true);
          return;
        }
        if (!cancelled) setUserId(me.id);
      } finally {
        if (!cancelled) setBootLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [circleId]);

  useEffect(() => {
    if (!userId || !circleId) return;
    void circlePresenceService.join({
      circleId,
      userId,
      isMember: true,
    });
    void syncVerifiedBadges({ circleId, viewerId: userId });
  }, [userId, circleId, post?.id]);

  const create = async (type: 'notice' | 'poll') => {
    if (!userId || !circleId) return;
    setCreateError('');
    try {
      await createCirclePost({
        circleId,
        createdBy: userId,
        type,
        title,
        closesAt: defaultClosesAt(),
        options: type === 'poll' ? [opt1, opt2, opt3].filter(Boolean) : undefined,
      });
      track('notice_created', { type, market: 'US' });
      setMode('view');
      setTitle('');
      setOpt1('');
      setOpt2('');
      setOpt3('');
      await syncVerifiedBadges({ circleId, viewerId: userId });
      await reload();
    } catch (e) {
      setCreateError(toAppError(e).message);
    }
  };

  const close = async () => {
    if (!userId || !post) return;
    setCreateError('');
    try {
      await closeCirclePost(post.id, userId);
      await syncVerifiedBadges({ circleId: post.circleId, viewerId: userId });
      await reload();
    } catch (e) {
      setCreateError(toAppError(e).message);
    }
  };

  if (bootLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <AppLoadingState />
      </SafeAreaView>
    );
  }

  if (forbidden) {
    return (
      <SafeAreaView style={styles.safe}>
        <AppForbiddenState
          actionLabel={en.circle.toUniverse}
          onAction={() => router.replace('/(tabs)/universe')}
        />
      </SafeAreaView>
    );
  }

  const done = Boolean(liveSummary?.currentUserResponded);
  const showPollCounts =
    post?.type === 'poll' &&
    liveSummary &&
    (done || liveSummary.isActive === false) &&
    liveSummary.totalResponded != null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Pressable onPress={() => router.back()} accessibilityRole="button">
          <Text style={styles.back}>{en.circle.backUniverse.replace('Universe', 'Circle')}</Text>
        </Pressable>
        <Text style={styles.title}>{en.circle.noticeTitle}</Text>
        <Text style={styles.sub}>{en.circle.noticeSub}</Text>

        {post ? (
          <View style={styles.card}>
            <Text style={styles.badge}>{post.type === 'notice' ? 'Notice' : 'Poll'}</Text>
            <Text style={styles.postTitle}>{post.title}</Text>
            {post.body ? <Text style={styles.body}>{post.body}</Text> : null}

            {post.type === 'notice' ? (
              <>
                {!done ? (
                  <Pressable
                    style={styles.btn}
                    onPress={() => void acknowledge()}
                    disabled={pending}
                    accessibilityRole="button"
                    accessibilityState={{ busy: pending }}
                  >
                    <Text style={styles.btnText}>{en.circle.acknowledge}</Text>
                  </Pressable>
                ) : (
                  <Text style={styles.done}>{en.circle.acknowledged}</Text>
                )}
                {liveSummary?.totalResponded != null ? (
                  <Text style={styles.meta}>
                    {en.circle.totalResponded(liveSummary.totalResponded)}
                  </Text>
                ) : null}
              </>
            ) : (
              <>
                <View style={{ marginTop: 12, gap: 8 }}>
                  {options.map((o) => (
                    <Pressable
                      key={o.id}
                      onPress={() => {
                        setSelectedOption(o.id);
                        void vote(o.id);
                      }}
                      disabled={pending}
                      accessibilityRole="button"
                      style={[
                        styles.option,
                        (selectedOption === o.id ||
                          liveSummary?.currentUserOptionId === o.id) &&
                          styles.optionOn,
                      ]}
                    >
                      <Text
                        style={{
                          color:
                            selectedOption === o.id ||
                            liveSummary?.currentUserOptionId === o.id
                              ? '#fff'
                              : colors.ink,
                        }}
                      >
                        {o.label}
                        {showPollCounts && o.id
                          ? ` · ${liveSummary?.options.find((x) => x.id === o.id)?.count ?? 0}`
                          : ''}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                {done ? <Text style={styles.done}>{en.circle.voted}</Text> : null}
                {showPollCounts ? (
                  <Text style={styles.meta}>
                    {en.circle.totalResponded(liveSummary!.totalResponded!)}
                  </Text>
                ) : null}
              </>
            )}

            {canCreate ? (
              <Pressable style={styles.secondary} onPress={() => void close()}>
                <Text>{en.circle.closePost}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <AppEmptyState title={en.circle.noActive} />
        )}

        {mode === 'view' && !post && canCreate ? (
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

        {error || createError ? (
          <AppErrorState message={error || createError || undefined} />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  back: { color: colors.muted, marginBottom: 12, minHeight: 44 },
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
  meta: { color: colors.soft, marginTop: 10, marginBottom: 6 },
  option: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 12,
    minHeight: 44,
    justifyContent: 'center',
  },
  optionOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  btn: {
    marginTop: 16,
    backgroundColor: colors.ink,
    borderRadius: 14,
    padding: 12,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { color: '#fff', fontWeight: '600' },
  done: { marginTop: 14, color: colors.orange, fontSize: 13 },
  secondary: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    minHeight: 44,
    justifyContent: 'center',
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
});
