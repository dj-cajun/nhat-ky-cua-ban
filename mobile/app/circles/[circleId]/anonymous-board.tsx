import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  blockAnonymousPostAuthor,
  deleteAnonymousPost,
} from '@/features/anonymous-board/anonymous-board.mutations';
import {
  ANON_BODY_MAX,
  formatAnonymousRelativeTime,
} from '@/features/anonymous-board/anonymous-board.validation';
import { AnonymousPostMenu } from '@/features/anonymous-board/anonymous-post-menu';
import { useAnonymousPosts } from '@/features/anonymous-board/use-anonymous-posts';
import { useCreateAnonymousPost } from '@/features/anonymous-board/use-create-anonymous-post';
import type { AnonymousPostItem } from '@/features/anonymous-board/anonymous-board.types';
import { getSessionProfile, isCircleMember } from '@/features/local/repository';
import { hideContentForMe } from '@/features/moderation/moderation.mutations';
import { AppEmptyState, AppErrorState, AppLoadingState } from '@/components/states';
import { toAppError } from '@/lib/errors';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { colors } from '@/constants/theme';
import { en } from '@/i18n/en';

export default function AnonymousBoardScreen() {
  const { circleId } = useLocalSearchParams<{ circleId: string }>();
  const [userId, setUserId] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');

  const { items, nextCursor, loading, error, reload, loadMore } = useAnonymousPosts(
    circleId,
    userId,
  );
  const compose = useCreateAnonymousPost({
    circleId,
    userId,
    onCreated: () => {
      void reload();
    },
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const me = await getSessionProfile();
      if (!me || !circleId) {
        router.replace('/(auth)/sign-in');
        return;
      }
      if (!(await isCircleMember(circleId, me.id))) {
        router.replace('/(tabs)/universe');
        return;
      }
      if (!cancelled) {
        setUserId(me.id);
        void compose.ensureAlias();
      }
    })();
    return () => {
      cancelled = true;
    };
    // ensureAlias is stable enough for mount; avoid re-running on every compose change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [circleId]);

  const onReport = (post: AnonymousPostItem) => {
    setMenuFor(null);
    router.push({
      pathname: '/reports/create',
      params: { targetType: 'anonymous_post', targetId: post.id },
    });
  };

  const onHide = async (post: AnonymousPostItem) => {
    if (!userId) return;
    setActionError('');
    try {
      await hideContentForMe({
        userId,
        targetType: 'anonymous_post',
        targetId: post.id,
      });
      setMenuFor(null);
      await reload();
    } catch (e) {
      setActionError(toAppError(e).message);
    }
  };

  const onDelete = async (post: AnonymousPostItem) => {
    if (!userId) return;
    setActionError('');
    try {
      await deleteAnonymousPost(post.id, userId);
      setMenuFor(null);
      await reload();
    } catch (e) {
      setActionError(toAppError(e).message);
    }
  };

  const onBlockAuthor = (post: AnonymousPostItem) => {
    if (!userId) return;
    Alert.alert(en.aliasBoard.blockConfirmTitle, en.aliasBoard.blockConfirmBody, [
      { text: en.aliasBoard.cancel, style: 'cancel' },
      {
        text: en.aliasBoard.blockConfirm,
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setActionError('');
            try {
              await blockAnonymousPostAuthor(post.id, userId);
              setMenuFor(null);
              await reload();
            } catch (e) {
              setActionError(toAppError(e).message);
            }
          })();
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: AnonymousPostItem }) => (
    <View style={styles.post}>
      <View style={styles.postHeader}>
        <Text style={styles.alias}>
          {item.aliasName}
          {item.isMine ? ` · ${en.aliasBoard.mine}` : ''}
        </Text>
        <View style={styles.postMeta}>
          <Text style={styles.time}>{formatAnonymousRelativeTime(item.createdAt)}</Text>
          <Pressable
            hitSlop={8}
            onPress={() => setMenuFor((id) => (id === item.id ? null : item.id))}
            accessibilityLabel={en.aliasBoard.menu}
          >
            <Text style={styles.menuBtn}>{en.aliasBoard.menu}</Text>
          </Pressable>
        </View>
      </View>
      <Text style={styles.body}>{item.body}</Text>
      {menuFor === item.id ? (
        <AnonymousPostMenu
          isMine={item.isMine}
          onDelete={() => void onDelete(item)}
          onReport={() => onReport(item)}
          onHide={() => void onHide(item)}
          onBlockAuthor={() => onBlockAuthor(item)}
        />
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <Pressable onPress={() => router.back()} accessibilityRole="button">
        <Text style={styles.back}>{en.aliasBoard.back}</Text>
      </Pressable>
      <Text style={styles.title}>{en.aliasBoard.title}</Text>
      <Text style={styles.sub}>{en.circle.aliasSub}</Text>

      {!isFeatureEnabled('anonymous_board_enabled') ? (
        <AppEmptyState title={en.circle.featureDisabled} />
      ) : (
        <>
      <View style={styles.compose}>
        <Text style={styles.composeTitle}>{en.aliasBoard.composeTitle}</Text>
        {compose.alias ? (
          <Text style={styles.currentAlias}>
            {en.aliasBoard.currentAlias(compose.alias.aliasName)}
          </Text>
        ) : null}
        <TextInput
          value={compose.body}
          onChangeText={compose.setBody}
          placeholder={en.aliasBoard.placeholder}
          placeholderTextColor={colors.soft}
          multiline
          maxLength={ANON_BODY_MAX}
          style={styles.input}
        />
        <Text style={styles.charCount}>
          {en.aliasBoard.charCount(compose.body.trim().length, ANON_BODY_MAX)}
        </Text>
        <Text style={styles.notice}>{en.aliasBoard.noticeVisibility}</Text>
        <Text style={styles.notice}>{en.aliasBoard.noticeSafety}</Text>
        {compose.error || actionError ? (
          <AppErrorState message={compose.error || actionError} />
        ) : null}
        <Pressable
          style={[styles.postBtn, compose.pending && styles.postBtnDisabled]}
          disabled={compose.pending || !compose.body.trim()}
          onPress={() => void compose.submit()}
          accessibilityRole="button"
          accessibilityState={{ busy: compose.pending }}
        >
          <Text style={styles.postBtnText}>{en.aliasBoard.post}</Text>
        </Pressable>
      </View>

      {error ? <AppErrorState message={error} onRetry={() => void reload()} /> : null}
      {loading && items.length === 0 ? (
        <AppLoadingState />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(p) => p.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 40, gap: 10 }}
          ListEmptyComponent={
            <AppEmptyState title={en.aliasBoard.empty} subtitle={en.aliasBoard.emptySub} />
          }
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={() => void reload()} />
          }
          ListFooterComponent={
            nextCursor ? (
              <Pressable style={styles.more} onPress={() => void loadMore()}>
                <Text style={styles.moreText}>{en.aliasBoard.loadMore}</Text>
              </Pressable>
            ) : null
          }
        />
      )}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  back: { color: colors.muted, marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '600', color: colors.ink },
  sub: { marginTop: 6, marginBottom: 14, color: colors.muted, lineHeight: 20 },
  compose: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  composeTitle: { fontSize: 14, fontWeight: '600', color: colors.ink },
  currentAlias: { marginTop: 6, fontSize: 12, color: colors.accent },
  input: {
    marginTop: 10,
    minHeight: 72,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    padding: 10,
    color: colors.ink,
    textAlignVertical: 'top',
  },
  charCount: { marginTop: 4, fontSize: 11, color: colors.soft, textAlign: 'right' },
  notice: { marginTop: 6, fontSize: 11, color: colors.muted, lineHeight: 16 },
  postBtn: {
    marginTop: 10,
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  postBtnDisabled: { opacity: 0.5 },
  postBtnText: { color: '#fff', fontWeight: '600' },
  post: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  alias: { fontSize: 13, fontWeight: '600', color: colors.ink, flex: 1 },
  postMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  time: { fontSize: 11, color: colors.soft },
  menuBtn: { fontSize: 16, color: colors.muted, paddingHorizontal: 4 },
  body: { marginTop: 8, fontSize: 14, color: colors.ink, lineHeight: 20 },
  empty: { marginTop: 20, color: colors.muted, textAlign: 'center' },
  more: { marginTop: 12, alignItems: 'center', padding: 10 },
  moreText: { color: colors.accent, fontSize: 13 },
  error: { color: colors.warn, marginTop: 8, marginBottom: 4, fontSize: 12 },
});
