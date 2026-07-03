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
import { InvestigationPanel } from '@/components/dotori/InvestigationPanel';
import { GiftSheet } from '@/components/dotori/GiftSheet';
import { ReportSheet } from '@/components/moderation/ReportSheet';
import { StickerDecorSheet } from '@/components/doodle/StickerDecorSheet';
import { PomodoroOverlay } from '@/components/doodle/PomodoroOverlay';
import { viewModeAtom, showVoteOverlayAtom, currentUserAtom, displayUserAtom } from '@/stores/atoms';
import type { StickerSlotKey } from '@/stores/stickerStore';
import { vi } from '@/i18n/vi';

export function HomePage() {
  const viewMode = useAtomValue(viewModeAtom);
  const currentUser = useAtomValue(currentUserAtom);
  const displayUser = useAtomValue(displayUserAtom);
  const showVote = useAtomValue(showVoteOverlayAtom);
  const setViewMode = useSetAtom(viewModeAtom);
  const [showComposer, setShowComposer] = useState(false);
  const [showGift, setShowGift] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [decorSlot, setDecorSlot] = useState<StickerSlotKey | null>(null);
  const [showPomodoro, setShowPomodoro] = useState(false);

  useVoteScheduler();
  useVoteNotifications();
  useDbSync();

  const canWrite = viewMode === 'my' || viewMode === 'stranger';
  const themeId = currentUser.themeId ?? 'default';

  return (
    <div className="cy-shell" data-theme={themeId}>
      <RealtimeToast />

      {viewMode === 'stranger' && (
        <div className="mb-1 flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setViewMode('my')}
            className="cy-hard-btn flex-1 rounded-lg px-3 py-1.5 text-xs"
          >
            {vi.home.backToMine}
          </button>
          <button
            type="button"
            onClick={() => setShowGift(true)}
            className="cy-hard-btn rounded-lg bg-white px-3 py-1.5 text-xs"
          >
            🎁
          </button>
          <button
            type="button"
            onClick={() => setShowReport(true)}
            className="cy-hard-btn rounded-lg bg-white px-3 py-1.5 text-xs"
          >
            ⚠️
          </button>
        </div>
      )}

      <div className="cy-canvas">
        <StatusBar />
        <ProfileCard onOpenStickerShop={() => setDecorSlot('slotA')} />
        {viewMode === 'stranger' && <InvestigationPanel />}
        <div className="grid min-h-0 flex-1 grid-cols-2 gap-2 overflow-hidden">
          <CalendarWidget />
          <PhotoAlbumWidget
            onOpenDecor={() => setDecorSlot('slotB')}
            onOpenPomodoro={() => setShowPomodoro(true)}
          />
        </div>
        <SwipeCardStack
          canWrite={canWrite}
          onWrite={() => setShowComposer(true)}
        />
      </div>

      {showComposer && <PostComposer onClose={() => setShowComposer(false)} />}
      {showGift && <GiftSheet onClose={() => setShowGift(false)} />}
      {showReport && (
        <ReportSheet
          targetUserId={displayUser.id}
          onClose={() => setShowReport(false)}
          onDone={() => setViewMode('my')}
        />
      )}
      {decorSlot && (
        <StickerDecorSheet slot={decorSlot} onClose={() => setDecorSlot(null)} />
      )}
      {showPomodoro && <PomodoroOverlay onClose={() => setShowPomodoro(false)} />}
      {showVote && <VoteLockOverlay />}
    </div>
  );
}
