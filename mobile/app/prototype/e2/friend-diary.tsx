import { router } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DiaryHompyHome } from '@/features/diary-home';
import { ProtoChrome } from '@/features/e2-prototype/ProtoChrome';
import {
  e2CircleBoard,
  e2CircleBoardItems,
  e2DiaryCircles,
  e2DiaryFriend,
  e2DiaryMe,
  e2FreeBoard,
  e2FreeBoardAuthors,
  e2FriendEntry,
  e2Guestbook,
  e2GuestbookAuthors,
  e2MusicCard,
} from '@/features/e2-prototype/diary-hompy-fixtures';
import { e2Fixtures } from '@/features/e2-prototype/fixtures';
import { hompy } from '@/constants/hompy-theme';

/**
 * Same component as product diary — pastel pencil mini-hompy only.
 */
export default function E2FriendDiaryPrototype() {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ProtoChrome step="friend" tint={hompy.muted} />
      <DiaryHompyHome
        me={e2DiaryMe}
        owner={e2DiaryFriend}
        entry={e2FriendEntry}
        recentEntries={[e2FriendEntry]}
        guestbook={e2Guestbook}
        guestbookAuthors={e2GuestbookAuthors}
        freeBoard={e2FreeBoard}
        freeBoardAuthors={e2FreeBoardAuthors}
        circleBoard={e2CircleBoard}
        circleBoardItems={e2CircleBoardItems}
        circles={e2DiaryCircles}
        music={e2MusicCard(
          e2FriendEntry.id,
          'Moonlight Drive',
          'soft instrumental',
        )}
        canView
        onEditToday={() => {}}
        onOpenMusic={() => {}}
        backLabel={e2Fixtures.circles[0].name}
        onBack={() => router.push('/prototype/e2/circle')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: hompy.table },
});
