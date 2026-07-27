import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HompyDiaryPlus } from '@/features/e2-prototype/HompyDiaryPlus';
import { ProtoChrome } from '@/features/e2-prototype/ProtoChrome';
import { e2Fixtures } from '@/features/e2-prototype/fixtures';
import { hompy } from '@/constants/hompy-theme';

/** Prototype: mini-hompy base + today’s scene strip (matches product). */
export default function E2FriendDiaryPrototype() {
  const today = e2Fixtures.friendToday;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ProtoChrome step="friend" tint={hompy.muted} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <HompyDiaryPlus
          backLabel={e2Fixtures.circles[0].name}
          onBack={() => router.push('/prototype/e2/circle')}
          ownerName={today.ownerName}
          mood={today.mood}
          sentence={today.sentence}
          music={today.music}
          photoLabel={today.photoLabel}
          sceneVariant="friendWindow"
          footer={
            <Pressable
              style={styles.compare}
              onPress={() => router.push('/prototype/e2/my-diary')}
              accessibilityRole="button"
            >
              <Text style={styles.compareText}>same world · open my diary →</Text>
            </Pressable>
          }
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: hompy.table },
  scroll: { paddingBottom: 24, flexGrow: 1 },
  compare: { marginTop: 12, minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  compareText: { fontSize: 13, fontWeight: '600', color: hompy.ink },
});
