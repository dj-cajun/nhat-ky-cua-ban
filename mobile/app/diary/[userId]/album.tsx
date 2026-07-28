import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppErrorState, AppLoadingState } from '@/components/states';
import {
  loadAlbumPhotos,
  pickAndSavePhoto,
  removeAlbumPhoto,
  type PhotoAsset,
} from '@/features/diary-home/photo-album.service';
import {
  getProfile,
  getSessionProfile,
  MAX_ALBUM_PHOTOS,
} from '@/features/local/repository';
import { toAppError } from '@/lib/errors';
import { colors } from '@/constants/theme';
import { useLocale, useMessages } from '@/i18n';

export default function DiaryAlbumScreen() {
  const t = useMessages();
  const [locale] = useLocale();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const [photos, setPhotos] = useState<PhotoAsset[]>([]);
  const [isMine, setIsMine] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError('');
    try {
      const session = await getSessionProfile();
      if (!session) {
        setError(t.errors.auth);
        return;
      }
      const owner = await getProfile(userId);
      if (!owner) {
        setError(t.errors.notFound);
        return;
      }
      setIsMine(session.id === owner.id);
      setPhotos(await loadAlbumPhotos(owner.id));
    } catch (e) {
      setError(toAppError(e).message);
    } finally {
      setLoading(false);
    }
  }, [userId, t.errors.auth, t.errors.notFound]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const onAdd = async () => {
    if (!userId || !isMine || busy) return;
    setBusy(true);
    setError('');
    try {
      const row = await pickAndSavePhoto(userId);
      if (row) setPhotos(await loadAlbumPhotos(userId));
    } catch (e) {
      setError(toAppError(e).message);
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (photo: PhotoAsset) => {
    if (!userId || !isMine || busy) return;
    setBusy(true);
    setError('');
    try {
      await removeAlbumPhoto(userId, photo);
      setPhotos(await loadAlbumPhotos(userId));
    } catch (e) {
      setError(toAppError(e).message);
    } finally {
      setBusy(false);
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
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button">
          <Text style={styles.back}>{locale === 'ko' ? '← 뒤로' : '← Back'}</Text>
        </Pressable>
        <Text style={styles.title}>{t.album.title}</Text>
        <Text style={styles.sub}>
          {locale === 'ko'
            ? `코르크에 최신 ${Math.min(3, photos.length)}장이 올라가요. (${photos.length}/${MAX_ALBUM_PHOTOS})`
            : `Newest photos pin to the cork (up to 3). (${photos.length}/${MAX_ALBUM_PHOTOS})`}
        </Text>
      </View>

      {error ? <AppErrorState message={error} /> : null}

      {isMine ? (
        <Pressable
          style={[styles.addBtn, busy && styles.addBtnDisabled]}
          onPress={() => void onAdd()}
          disabled={busy || photos.length >= MAX_ALBUM_PHOTOS}
          accessibilityRole="button"
        >
          {busy ? (
            <ActivityIndicator color={colors.ink} />
          ) : (
            <Text style={styles.addBtnText}>
              {locale === 'ko' ? '+ 사진 저장' : '+ Save photo'}
            </Text>
          )}
        </Pressable>
      ) : null}

      <FlatList
        data={photos}
        keyExtractor={(item) => item.id}
        numColumns={3}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={photos.length ? styles.row : undefined}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {locale === 'ko' ? '아직 저장된 사진이 없어요.' : 'No saved photos yet.'}
          </Text>
        }
        renderItem={({ item, index }) => (
          <View style={styles.cell}>
            <Image source={{ uri: item.storagePath }} style={styles.thumb} resizeMode="cover" />
            {index < 3 ? (
              <View style={styles.corkBadge}>
                <Text style={styles.corkBadgeText}>cork</Text>
              </View>
            ) : null}
            {isMine ? (
              <Pressable
                style={styles.deleteBtn}
                onPress={() => void onDelete(item)}
                accessibilityRole="button"
                accessibilityLabel={locale === 'ko' ? '삭제' : 'Delete'}
              >
                <Text style={styles.deleteText}>{locale === 'ko' ? '삭제' : 'Del'}</Text>
              </Pressable>
            ) : null}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, gap: 4 },
  back: { fontSize: 13, fontWeight: '600', color: colors.ink, marginBottom: 4 },
  title: { fontSize: 20, fontWeight: '600', color: colors.ink },
  sub: { fontSize: 12, color: colors.muted, lineHeight: 18 },
  addBtn: {
    marginHorizontal: 16,
    marginVertical: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.ink,
    borderRadius: 10,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnDisabled: { opacity: 0.5 },
  addBtnText: { fontSize: 13, fontWeight: '700', color: colors.ink },
  grid: { paddingHorizontal: 12, paddingBottom: 28 },
  row: { gap: 8 },
  cell: {
    flex: 1,
    aspectRatio: 1,
    marginBottom: 8,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#E8E2DA',
    maxWidth: '32%',
  },
  thumb: { width: '100%', height: '100%' },
  corkBadge: {
    position: 'absolute',
    left: 4,
    top: 4,
    backgroundColor: 'rgba(42,36,48,0.75)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  corkBadgeText: { fontSize: 9, color: '#FFF', fontWeight: '700' },
  deleteBtn: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  deleteText: { fontSize: 10, fontWeight: '700', color: colors.ink },
  empty: {
    marginTop: 40,
    textAlign: 'center',
    color: colors.muted,
    fontSize: 13,
  },
});
