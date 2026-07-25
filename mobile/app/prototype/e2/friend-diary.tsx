import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DiaryScene, ObjectRow } from '@/features/e2-prototype/DiaryScene';
import { ProtoChrome } from '@/features/e2-prototype/ProtoChrome';
import { Starfield } from '@/features/e2-prototype/Starfield';
import { e2Fixtures } from '@/features/e2-prototype/fixtures';
import { e2 } from '@/features/e2-prototype/tokens';

/**
 * E2 Friend Diary — their today as one scene; no visitor pressure; no equal cards.
 */
export default function E2FriendDiaryPrototype() {
  const today = e2Fixtures.friendToday;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.bg}>
        <Starfield opacity={0.35} />
        <View style={styles.wash} />
        <ProtoChrome step="friend" tint={e2.friendDiary.muted} />
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            onPress={() => router.push('/prototype/e2/circle')}
            accessibilityRole="button"
            accessibilityLabel="Back to circle"
            hitSlop={10}
          >
            <Text style={styles.back}>← {e2Fixtures.circles[0].name}</Text>
          </Pressable>

          <DiaryScene
            palette={e2.friendDiary}
            ownerName={today.ownerName}
            mood={today.mood}
            sentence={today.sentence}
            music={today.music}
            photoLabel={today.photoLabel}
            sceneA11y={`${today.ownerName}'s diary today`}
          />

          <ObjectRow palette={e2.friendDiary} />

          <Pressable
            style={styles.compare}
            onPress={() => router.push('/prototype/e2/my-diary')}
            accessibilityRole="button"
            accessibilityLabel="Compare with my diary"
          >
            <Text style={styles.compareText}>same world · open my diary →</Text>
          </Pressable>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: e2.friendDiary.washEdge },
  bg: { flex: 1, backgroundColor: e2.friendDiary.washEdge },
  wash: {
    ...StyleSheet.absoluteFill,
    backgroundColor: e2.friendDiary.wash,
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
    color: e2.friendDiary.muted,
    marginBottom: 8,
  },
  compare: {
    marginTop: 28,
    minHeight: 44,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  compareText: {
    fontFamily: e2.type.bodyMed,
    fontSize: 14,
    color: e2.friendDiary.ink,
  },
});
