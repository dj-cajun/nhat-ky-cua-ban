import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors } from '@/constants/theme';
import { useMessages } from '@/i18n';
import { toAppError } from '@/lib/errors';
import { track } from '@/lib/logger';
import { resolveSpotifyTrack, searchSpotifyTracks } from './diary-music.service';
import type { SpotifyTrackSearchResult } from './diary-music.types';

type Props = {
  onSelect: (track: SpotifyTrackSearchResult) => void;
  onCancel?: () => void;
};

export function SpotifyTrackPicker({ onSelect, onCancel }: Props) {
  const t = useMessages();
  const [query, setQuery] = useState('');
  const [link, setLink] = useState('');
  const [results, setResults] = useState<SpotifyTrackSearchResult[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<SpotifyTrackSearchResult | null>(null);
  const reqSeq = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const seq = ++reqSeq.current;
    const t = setTimeout(() => {
      void (async () => {
        setPending(true);
        setError('');
        track('diary_music_search_started', { market: 'US' });
        try {
          const items = await searchSpotifyTracks({ query: q, market: 'US', limit: 10 });
          if (seq === reqSeq.current) setResults(items);
        } catch (e) {
          if (seq === reqSeq.current) setError(toAppError(e).message);
        } finally {
          if (seq === reqSeq.current) setPending(false);
        }
      })();
    }, 400);
    return () => clearTimeout(t);
  }, [query]);

  const resolveLink = async () => {
    setPending(true);
    setError('');
    try {
      const trackResult = await resolveSpotifyTrack(link);
      setPreview(trackResult);
    } catch (e) {
      setError(toAppError(e).message);
    } finally {
      setPending(false);
    }
  };

  if (preview) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>{t.diaryMusic.confirmTitle}</Text>
        <Text style={styles.previewTrack}>{preview.trackName}</Text>
        <Text style={styles.previewArtist}>{preview.artistNames.join(', ')}</Text>
        <Pressable
          style={styles.btn}
          onPress={() => {
            track('diary_music_track_selected', { market: 'US' });
            onSelect(preview);
          }}
        >
          <Text style={styles.btnText}>{t.diaryMusic.confirm}</Text>
        </Pressable>
        <Pressable onPress={() => setPreview(null)}>
          <Text style={styles.cancel}>{t.diaryMusic.backToSearch}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t.diaryMusic.pickerTitle}</Text>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={t.diaryMusic.searchPlaceholder}
        placeholderTextColor={colors.soft}
        style={styles.input}
        autoCorrect={false}
      />
      <Text style={styles.or}>{t.diaryMusic.orPaste}</Text>
      <TextInput
        value={link}
        onChangeText={setLink}
        placeholder={t.diaryMusic.linkPlaceholder}
        placeholderTextColor={colors.soft}
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Pressable style={styles.secondary} onPress={() => void resolveLink()} disabled={!link.trim()}>
        <Text style={styles.secondaryText}>{t.diaryMusic.resolveLink}</Text>
      </Pressable>

      {pending ? <ActivityIndicator color={colors.accent} style={{ marginTop: 12 }} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        style={{ marginTop: 12, maxHeight: 280 }}
        renderItem={({ item }) => (
          <Pressable style={styles.result} onPress={() => setPreview(item)}>
            <Text style={styles.resultTrack} numberOfLines={1}>
              {item.trackName}
              {item.explicit ? ' · E' : ''}
            </Text>
            <Text style={styles.resultArtist} numberOfLines={1}>
              {item.artistNames.join(', ')}
              {item.albumName ? ` · ${item.albumName}` : ''}
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={
          query.trim().length >= 2 && !pending ? (
            <Text style={styles.empty}>{t.diaryMusic.noResults}</Text>
          ) : null
        }
      />

      {onCancel ? (
        <Pressable onPress={onCancel}>
          <Text style={styles.cancel}>{t.diaryMusic.cancel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 12,
  },
  title: { fontSize: 14, fontWeight: '600', color: colors.ink, marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    padding: 10,
    color: colors.ink,
    marginBottom: 8,
  },
  or: { fontSize: 11, color: colors.soft, marginBottom: 6 },
  secondary: { paddingVertical: 8 },
  secondaryText: { color: colors.accent, fontSize: 13 },
  result: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  resultTrack: { fontSize: 14, color: colors.ink, fontWeight: '500' },
  resultArtist: { marginTop: 2, fontSize: 12, color: colors.muted },
  empty: { color: colors.soft, textAlign: 'center', marginTop: 12 },
  error: { color: colors.warn, marginTop: 8, fontSize: 12 },
  previewTrack: { fontSize: 16, fontWeight: '600', color: colors.ink },
  previewArtist: { marginTop: 4, color: colors.muted, marginBottom: 12 },
  btn: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '600' },
  cancel: { marginTop: 12, color: colors.muted, textAlign: 'center' },
});
