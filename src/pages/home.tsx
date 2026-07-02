import { useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { StatusBar } from '@/components/home/StatusBar';
import { ProfileCard } from '@/components/home/ProfileCard';
import { CalendarWidget } from '@/components/home/CalendarWidget';
import { PhotoAlbumWidget } from '@/components/home/PhotoAlbumWidget';
import { SwipeCardStack } from '@/components/home/SwipeCardStack';
import { RealtimeToast } from '@/components/common/RealtimeToast';
import { VoteLockOverlay } from '@/components/vote/VoteLockOverlay';
import { PostComposer } from '@/components/feed/PostComposer';
import { useVoteScheduler, useVoteNotifications } from '@/hooks/useVoteScheduler';
import { useDbSync } from '@/hooks/useDbSync';
import { viewModeAtom, showVoteOverlayAtom } from '@/stores/atoms';
import { vi } from '@/i18n/vi';

export function HomePage() {
  const viewMode = useAtomValue(viewModeAtom);
  const showVote = useAtomValue(showVoteOverlayAtom);
  const setViewMode = useSetAtom(viewModeAtom);
  const [showComposer, setShowComposer] = useState(false);

  useVoteScheduler();
  useVoteNotifications();
  useDbSync();

  const canWrite = viewMode === 'my' || viewMode === 'stranger';

  return (
    <div className="cy-shell">
      <RealtimeToast />

      {viewMode === 'stranger' && (
        <button
          type="button"
          onClick={() => setViewMode('my')}
          className="cy-hard-btn mb-1 shrink-0 rounded-lg border-[2.5px] border-black bg-y2k-pink-light px-3 py-1.5 text-xs font-bold"
        >
          {vi.home.backToMine}
        </button>
      )}

      <div className="cy-canvas">
        <StatusBar />
        <ProfileCard />
        <div className="grid min-h-0 flex-1 grid-cols-2 gap-2 overflow-hidden">
          <CalendarWidget />
          <PhotoAlbumWidget />
        </div>
        <SwipeCardStack
          canWrite={canWrite}
          onWrite={() => setShowComposer(true)}
        />
      </div>

      {showComposer && <PostComposer onClose={() => setShowComposer(false)} />}
      {showVote && <VoteLockOverlay />}
    </div>
  );
}
