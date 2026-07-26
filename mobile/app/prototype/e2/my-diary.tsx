import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DiaryScene, ObjectRow } from '@/features/e2-prototype/DiaryScene';
import { ProtoChrome } from '@/features/e2-prototype/ProtoChrome';
import { Starfield } from '@/features/e2-prototype/Starfield';
import { e2Fixtures } from '@/features/e2-prototype/fixtures';
import { e2 } from '@/features/e2-prototype/tokens';

/**
 * E2 My Diary — same world as friend diary; writing present but not a form wall;
 * tomato focus as a single small object.
 */
export default function E2MyDiaryPrototype() {
  const today = e2Fixtures.myToday;
  const [writing, setWriting] = useState(false);
  const [focusHint, setFocusHint] = useState(false);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.bg}>
        <Starfield opacity={0.35} />
        <View style={styles.wash} />
        <ProtoChrome step="mine" tint={e2.myDiary.muted} />
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            onPress={() => router.push('/prototype/e2/friend-diary')}
            accessibilityRole="button"
            accessibilityLabel="Back to friend diary"
            hitSlop={10}
          >
            <Text style={styles.back}>← friend’s today</Text>
          </Pressable>

          <DiaryScene
            palette={e2.myDiary}
            ownerName={today.ownerName}
            mood={today.mood}
            sentence={writing ? '…keeping one quiet line' : today.sentence}
            music={today.music}
            photoLabel={today.photoLabel}
            sceneVariant="myDesk"
            onPressScene={() => setWriting(true)}
            sceneA11y="Edit today’s diary scene"
          />

          <Text style={styles.writeHint}>
            {writing ? 'writing mode (prototype · no save)' : today.writeHint}
          </Text>

          <ObjectRow
            palette={e2.myDiary}
            showTomato
            onTomato={() => setFocusHint(true)}
          />
          {focusHint ? (
            <Text style={styles.focusHint}>focus room stays a small door — not a dashboard</Text>
          ) : null}

          <Pressable
            style={styles.loop}
            onPress={() => router.push('/prototype/e2')}
            accessibilityRole="button"
            accessibilityLabel="Return to universe home"
          >
            <Text style={styles.loopText}>← return to the universe</Text>
          </Pressable>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: e2.myDiary.washEdge },
  bg: { flex: 1, backgroundColor: e2.myDiary.washEdge },
  wash: {
    ...StyleSheet.absoluteFill,
    backgroundColor: e2.myDiary.wash,
    opacity: 0.95,
  },
  scroll: {
    paddingHorizontal: e2.spacePad,
    paddingBottom: 40,
    paddingTop: 8,
  },
  back: {
    fontFamily: e2.type.body,
    fontSize: 13,
    color: e2.myDiary.muted,
    marginBottom: 8,
  },
  writeHint: {
    marginTop: 14,
    fontFamily: e2.type.body,
    fontSize: 13,
    color: e2.myDiary.muted,
  },
  focusHint: {
    marginTop: 10,
    fontFamily: e2.type.body,
    fontSize: 12,
    color: e2.myDiary.mood,
  },
  loop: {
    marginTop: 32,
    minHeight: 44,
    justifyContent: 'center',
  },
  loopText: {
    fontFamily: e2.type.bodyMed,
    fontSize: 14,
    color: e2.myDiary.ink,
  },
});
