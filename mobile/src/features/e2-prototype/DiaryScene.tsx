import { Pressable, StyleSheet, Text, View } from 'react-native';
import { e2 } from './tokens';
import { e2Fixtures } from './fixtures';

type Palette = typeof e2.friendDiary | typeof e2.myDiary;

/** One dominant emotional scene — photo + sentence + mood + music as one frame. */
export function DiaryScene({
  palette,
  ownerName,
  mood,
  sentence,
  music,
  photoLabel,
  onPressScene,
  sceneA11y,
}: {
  palette: Palette;
  ownerName: string;
  mood: string;
  sentence: string;
  music: string;
  photoLabel: string;
  onPressScene?: () => void;
  sceneA11y: string;
}) {
  const body = (
    <View style={styles.scene}>
      <View style={[styles.photo, { backgroundColor: palette.scene }]}>
        <Text style={[styles.photoLabel, { color: palette.muted, fontFamily: e2.type.body }]}>
          {photoLabel}
        </Text>
        <View style={styles.photoGlow} />
      </View>
      <Text style={[styles.owner, { color: palette.muted, fontFamily: e2.type.bodyMed }]}>
        {ownerName.toUpperCase()} · TODAY
      </Text>
      <Text style={[styles.sentence, { color: palette.ink, fontFamily: e2.type.displayItalic }]}>
        {sentence}
      </Text>
      <Text style={[styles.mood, { color: palette.mood, fontFamily: e2.type.bodySemi }]}>
        {mood}
      </Text>
      <View style={[styles.music, { backgroundColor: palette.musicBar }]}>
        <Text style={[styles.musicText, { color: palette.ink, fontFamily: e2.type.body }]}>
          ♪  {music}
        </Text>
      </View>
    </View>
  );

  if (!onPressScene) return body;
  return (
    <Pressable
      onPress={onPressScene}
      accessibilityRole="button"
      accessibilityLabel={sceneA11y}
      style={({ pressed }) => pressed && { opacity: 0.92 }}
    >
      {body}
    </Pressable>
  );
}

export function ObjectRow({
  palette,
  showTomato,
  onTomato,
}: {
  palette: Palette;
  showTomato?: boolean;
  onTomato?: () => void;
}) {
  const items = [
    { key: 'album', label: e2Fixtures.objects.album },
    { key: 'letter', label: e2Fixtures.objects.letter },
    { key: 'calendar', label: e2Fixtures.objects.calendar },
  ] as const;

  return (
    <View style={styles.objects} accessibilityRole="summary">
      {items.map((item) => (
        <View
          key={item.key}
          style={[
            styles.object,
            { backgroundColor: palette.object, borderColor: palette.objectBorder },
          ]}
          accessibilityLabel={`${item.label} object`}
        >
          <Text style={[styles.objectText, { color: palette.ink, fontFamily: e2.type.bodyMed }]}>
            {item.label}
          </Text>
        </View>
      ))}
      {showTomato ? (
        <Pressable
          onPress={onTomato}
          accessibilityRole="button"
          accessibilityLabel="Focus room entrance"
          style={[
            styles.object,
            styles.tomato,
            { backgroundColor: e2.myDiary.tomatoSoft, borderColor: e2.myDiary.tomato },
          ]}
        >
          <Text style={[styles.objectText, { color: e2.myDiary.ink, fontFamily: e2.type.bodySemi }]}>
            {e2Fixtures.objects.tomato}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  scene: {
    marginTop: 8,
  },
  photo: {
    width: '100%',
    aspectRatio: 0.92,
    borderRadius: 28,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    padding: 18,
  },
  photoGlow: {
    position: 'absolute',
    top: '20%',
    left: '15%',
    width: '55%',
    height: '40%',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  photoLabel: {
    fontSize: 13,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    zIndex: 1,
  },
  owner: {
    marginTop: 18,
    fontSize: 11,
    letterSpacing: 2,
  },
  sentence: {
    marginTop: 10,
    fontSize: 26,
    lineHeight: 34,
  },
  mood: {
    marginTop: 12,
    fontSize: 15,
  },
  music: {
    marginTop: 16,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  musicText: {
    fontSize: 13,
  },
  objects: {
    marginTop: 28,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  object: {
    minWidth: e2.objectSize + 28,
    minHeight: e2.objectSize,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tomato: {
    minWidth: e2.objectSize + 12,
  },
  objectText: {
    fontSize: 13,
  },
});
