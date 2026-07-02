import { useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { StatusBar } from '@/components/home/StatusBar';
import { ProfileCard } from '@/components/home/ProfileCard';
import { VisitorTicker } from '@/components/home/VisitorTicker';
import { CalendarWidget } from '@/components/home/CalendarWidget';
import { PhotoAlbumWidget } from '@/components/home/PhotoAlbumWidget';
import { SwipeCardStack } from '@/components/home/SwipeCardStack';
import { RealtimeToast } from '@/components/common/RealtimeToast';
import { VoteLockOverlay } from '@/components/vote/VoteLockOverlay';
import { PostComposer } from '@/components/feed/PostComposer';
import { AffiliateCurator } from '@/components/home/AffiliateCurator';
import { useVoteScheduler, useVoteNotifications } from '@/hooks/useVoteScheduler';
import { useDbSync } from '@/hooks/useDbSync';
import { viewModeAtom, showVoteOverlayAtom } from '@/stores/atoms';

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
    <div className="mx-auto flex h-screen max-w-md flex-col overflow-hidden bg-[#faf9f6] p-2">
      <RealtimeToast />

      {viewMode === 'stranger' && (
        <button
          type="button"
          onClick={() => setViewMode('my')}
          className="diary-border mb-2 shrink-0 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-bold"
        >
          ← 내 다이어리로 돌아가기
        </button>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-2">
        <StatusBar />
        <ProfileCard />
        {viewMode === 'my' && <VisitorTicker />}
        <div className="grid min-h-0 shrink-0 grid-cols-2 gap-2" style={{ height: '28%' }}>
          <CalendarWidget />
          <PhotoAlbumWidget />
        </div>
        <AffiliateCurator />
        <SwipeCardStack />
      </div>

      {canWrite && (
        <button
          type="button"
          onClick={() => setShowComposer(true)}
          className="diary-border fixed bottom-4 right-4 z-30 rounded-full bg-slate-800 px-4 py-3 text-sm font-bold text-white shadow-lg"
        >
          {viewMode === 'my' ? '🤫 비밀 카드' : '✍️ 방명록'}
        </button>
      )}

      {showComposer && <PostComposer onClose={() => setShowComposer(false)} />}
      {showVote && <VoteLockOverlay />}
    </div>
  );
}
