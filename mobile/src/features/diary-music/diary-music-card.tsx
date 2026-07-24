import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/theme';
import { useMessages } from '@/i18n';
import type { DiaryMusicCard } from './diary-music.types';
import { isAllowedSpotifyArtworkUrl } from './spotify-url-parser';

type Props = {
  music: DiaryMusicCard;
  onOpen: () => void;
  compact?: boolean;
};

/** Spotify design: square cover, no overlay icons/filters, small corner radius. */
export function DiaryMusicCardView({ music, onOpen, compact }: Props) {
  const t = useMessages();
  const art =
    music.artworkUrl && isAllowedSpotifyArtworkUrl(music.artworkUrl)
      ? music.artworkUrl
      : null;
  const radius = compact ? 4 : 8;

  return (
    <Pressable style={styles.wrap} onPress={onOpen} accessibilityRole="button">
      <Text style={styles.label}>{t.diaryMusic.today}</Text>
      <View style={styles.row}>
        {art ? (
          <Image
            source={{ uri: art }}
            style={[styles.art, { borderRadius: radius }]}
            resizeMode="contain"
            accessibilityLabel={music.albumName ?? music.trackName}
          />
        ) : (
          <View style={[styles.artPlaceholder, { borderRadius: radius }]} />
        )}
        <View style={styles.meta}>
          <Text style={styles.track} numberOfLines={2}>
            {music.trackName}
            {music.explicit ? '  E' : ''}
          </Text>
          <Text style={styles.artist} numberOfLines={1}>
            {music.artistNames.join(', ')}
          </Text>
          <Text style={styles.spotify}>{t.diaryMusic.spotify}</Text>
          <Text style={styles.listen}>{t.diaryMusic.listenOnSpotify}</Text>
        </View>
      </View>
    </Pressable>
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
  label: { fontSize: 11, color: colors.soft, marginBottom: 10, letterSpacing: 0.4 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  art: { width: 72, height: 72, backgroundColor: '#EFE8DE' },
  artPlaceholder: { width: 72, height: 72, backgroundColor: '#EFE8DE' },
  meta: { flex: 1 },
  track: { fontSize: 15, fontWeight: '600', color: colors.ink },
  artist: { marginTop: 4, fontSize: 13, color: colors.muted },
  spotify: { marginTop: 8, fontSize: 11, color: colors.soft },
  listen: { marginTop: 2, fontSize: 13, color: colors.accent },
});
