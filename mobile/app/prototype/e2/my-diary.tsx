import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HompyDiaryPlus } from '@/features/e2-prototype/HompyDiaryPlus';
import { ProtoChrome } from '@/features/e2-prototype/ProtoChrome';
import { e2Fixtures } from '@/features/e2-prototype/fixtures';
import { hompy } from '@/constants/hompy-theme';

/** Prototype: mini-hompy base + desk scene strip (matches product). */
export default function E2MyDiaryPrototype() {
  const today = e2Fixtures.myToday;
  const [writing, setWriting] = useState(false);
  const [focusHint, setFocusHint] = useState(false);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ProtoChrome step="mine" tint={hompy.muted} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <HompyDiaryPlus
          backLabel="friend’s today"
          onBack={() => router.push('/prototype/e2/friend-diary')}
          ownerName={today.ownerName}
          mood={today.mood}
          sentence={writing ? '…keeping one quiet line' : today.sentence}
          music={today.music}
          photoLabel={today.photoLabel}
          sceneVariant="myDesk"
          isMine
          onPressScene={() => setWriting(true)}
          writeHint={writing ? 'writing mode (prototype · no save)' : today.writeHint}
          showTomato
          onTomato={() => setFocusHint(true)}
          focusHint={
            focusHint ? 'focus room stays a small door — not a dashboard' : null
          }
          footer={
            <Pressable
              style={styles.loop}
              onPress={() => router.push('/prototype/e2')}
              accessibilityRole="button"
            >
              <Text style={styles.loopText}>← return to the universe</Text>
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
  loop: { marginTop: 12, minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  loopText: { fontSize: 13, fontWeight: '600', color: hompy.ink },
});
