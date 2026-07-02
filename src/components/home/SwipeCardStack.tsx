import { useRef, useState } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import type { BoardType, FeedPost } from '@/types';
import { BOARD_LABELS } from '@/i18n/vi';
import { vi } from '@/i18n/vi';
import { db } from '@/lib/db';
import { showInterstitialAd } from '@/lib/zalo-ads';
import {
  activeBoardAtom,
  cardIndexAtom,
  strangerUserAtom,
  viewModeAtom,
  voteLockAtom,
  postsAtom,
  strangerHostIdAtom,
} from '@/stores/atoms';
import { FeedDetailModal } from '@/components/feed/FeedDetailModal';

const BOARD_ORDER: BoardType[] = ['diary', 'school', 'vote', 'guestbook'];

function truncateContent(text: string, maxLines = 3): string {
  const lines = text.split('\n');
  if (lines.length > maxLines) {
    return lines.slice(0, maxLines).join('\n') + '…';
  }
  if (text.length > 80) {
    return text.slice(0, 80) + '…';
  }
  return text;
}

function MediaIcons({ post }: { post: FeedPost }) {
  return (
    <span className="ml-1 inline-flex gap-0.5">
      {post.hasPhoto && <span>📸</span>}
      {post.hasVideo && <span>🎥</span>}
      {post.hasLink && <span>🔗</span>}
    </span>
  );
}

function NavBtn({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="cy-board-nav-btn"
    >
      {label}
    </button>
  );
}

type SwipeCardStackProps = {
  onWrite?: () => void;
  canWrite?: boolean;
};

export function SwipeCardStack({ onWrite, canWrite = false }: SwipeCardStackProps) {
  const [activeBoard, setActiveBoard] = useAtom(activeBoardAtom);
  const [cardIndex, setCardIndex] = useAtom(cardIndexAtom);
  const allPosts = useAtomValue(postsAtom);
  const voteLock = useAtomValue(voteLockAtom);
  const setViewMode = useSetAtom(viewModeAtom);
  const setStrangerUser = useSetAtom(strangerUserAtom);
  const setHostId = useSetAtom(strangerHostIdAtom);

  const [selectedPost, setSelectedPost] = useState<FeedPost | null>(null);
  const touchStart = useRef({ x: 0, y: 0 });

  const posts = allPosts[activeBoard] ?? [];
  const postCount = posts.length;
  const safeIndex = postCount > 0 ? cardIndex % postCount : 0;
  const currentPost = postCount > 0 ? posts[safeIndex] : null;
  const boardIndex = BOARD_ORDER.indexOf(activeBoard);

  const goPrevBoard = () => {
    if (voteLock) return;
    const nextIndex = (boardIndex - 1 + BOARD_ORDER.length) % BOARD_ORDER.length;
    setActiveBoard(BOARD_ORDER[nextIndex]);
    setCardIndex(0);
  };

  const goNextBoard = () => {
    if (voteLock) return;
    const nextIndex = (boardIndex + 1) % BOARD_ORDER.length;
    setActiveBoard(BOARD_ORDER[nextIndex]);
    setCardIndex(0);
  };

  const goPrevCard = () => {
    if (voteLock || postCount === 0) return;
    setCardIndex((i) => (i <= 0 ? postCount - 1 : i - 1));
  };

  const goNextCard = () => {
    if (voteLock || postCount === 0) return;
    setCardIndex((i) => (i + 1) % postCount);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (voteLock) return;

    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    const threshold = 40;

    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > threshold) {
      if (dx > 0) goPrevBoard();
      else goNextBoard();
    } else if (Math.abs(dy) > threshold && postCount > 0) {
      if (dy < 0) goNextCard();
      else goPrevCard();
    }
  };

  const handleAuthorWarp = async (post: FeedPost) => {
    if (voteLock) return;
    const classmate = db.getClassmateById(post.authorId);
    if (!classmate) return;

    await showInterstitialAd();
    setStrangerUser(classmate);
    setHostId(post.authorId);
    setViewMode('stranger');
  };

  return (
    <>
      <section
        className={`cy-board min-h-0 flex-1 touch-pan-y ${voteLock ? 'pointer-events-none opacity-90' : ''}`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="cy-board-header">
          <span>[ {BOARD_LABELS[activeBoard]} ]</span>
          <span className="cy-pink-text text-[10px] tracking-widest">
            {vi.home.liveUpdate}
            {voteLock && ` ${vi.home.lock}`}
          </span>
        </div>

        <div className="cy-board-body">
          {currentPost ? (
            <div
              role="button"
              tabIndex={0}
              onClick={() => !voteLock && setSelectedPost(currentPost)}
              onKeyDown={(e) => e.key === 'Enter' && !voteLock && setSelectedPost(currentPost)}
              className="cy-board-post"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  void handleAuthorWarp(currentPost);
                }}
                className="mb-2 w-fit text-xs font-bold text-yellow-300 underline"
              >
                {vi.home.anonymous}
              </button>
              <p className="flex-1 whitespace-pre-line text-sm leading-relaxed text-zinc-100">
                {truncateContent(currentPost.content)}
                <MediaIcons post={currentPost} />
              </p>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-zinc-400">
              {vi.home.noPosts}
            </div>
          )}
        </div>

        <div className="cy-board-footer">
          <div className="flex items-center gap-1.5 text-zinc-500">
            <NavBtn label="▲" onClick={goPrevCard} disabled={voteLock || postCount === 0} />
            <NavBtn label="▼" onClick={goNextCard} disabled={voteLock || postCount === 0} />
            <span className="px-0.5 text-[10px]">{vi.home.navCard}</span>
            <span className="text-zinc-300">·</span>
            <NavBtn label="◀" onClick={goPrevBoard} disabled={voteLock} />
            <NavBtn label="▶" onClick={goNextBoard} disabled={voteLock} />
            <span className="px-0.5 text-[10px]">{vi.home.navBoard}</span>
          </div>
          {canWrite && onWrite && (
            <button type="button" onClick={onWrite} className="cy-write-btn">
              {vi.home.write}
            </button>
          )}
        </div>
      </section>

      {selectedPost && (
        <FeedDetailModal post={selectedPost} onClose={() => setSelectedPost(null)} />
      )}
    </>
  );
}
