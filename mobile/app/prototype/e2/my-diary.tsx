import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DiaryHompyHome } from '@/features/diary-home';
import { ProtoChrome } from '@/features/e2-prototype/ProtoChrome';
import {
  e2CircleBoard,
  e2CircleBoardItems,
  e2DiaryCircles,
  e2DiaryMe,
  e2FreeBoard,
  e2FreeBoardAuthors,
  e2Guestbook,
  e2GuestbookAuthors,
  e2MusicCard,
  e2MyEntry,
} from '@/features/e2-prototype/diary-hompy-fixtures';
import { hompy } from '@/constants/hompy-theme';

/**
 * Same component as product diary — pastel pencil mini-hompy only.
 */
export default function E2MyDiaryPrototype() {
  const [entry, setEntry] = useState(e2MyEntry);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ProtoChrome step="mine" tint={hompy.muted} />
      <DiaryHompyHome
        me={e2DiaryMe}
        owner={e2DiaryMe}
        entry={entry}
        recentEntries={[entry]}
        guestbook={e2Guestbook}
        guestbookAuthors={e2GuestbookAuthors}
        freeBoard={e2FreeBoard}
        freeBoardAuthors={e2FreeBoardAuthors}
        circleBoard={e2CircleBoard}
        circleBoardItems={e2CircleBoardItems}
        circles={e2DiaryCircles}
        music={e2MusicCard(entry.id, 'Harbor Morning', 'lo-fi piano')}
        canView
        onEditToday={() =>
          setEntry((prev) => ({
            ...prev,
            shortText: '…keeping one quiet line',
            tenCharText: 'quiet line',
            updatedAt: new Date().toISOString(),
          }))
        }
        onOpenMusic={() => {}}
        backLabel="friend’s today"
        onBack={() => router.push('/prototype/e2/friend-diary')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: hompy.table },
});
