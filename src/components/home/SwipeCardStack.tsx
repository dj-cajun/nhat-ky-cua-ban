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
  const currentPost = posts[cardIndex % Math.max(posts.length, 1)];
  const boardIndex = BOARD_ORDER.indexOf(activeBoard);

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
    const threshold = 50;

    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > threshold) {
      const nextIndex =
        dx > 0
          ? (boardIndex - 1 + BOARD_ORDER.length) % BOARD_ORDER.length
          : (boardIndex + 1) % BOARD_ORDER.length;
      setActiveBoard(BOARD_ORDER[nextIndex]);
      setCardIndex(0);
    } else if (Math.abs(dy) > threshold) {
      if (dy < 0) {
        setCardIndex((i) => i + 1);
      } else {
        setCardIndex((i) => Math.max(0, i - 1));
      }
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

  if (!currentPost) {
    return (
      <section className="cy-board flex flex-1 items-center justify-center">
        <div className="cy-board-body flex w-full items-center justify-center text-sm text-zinc-400">
          {vi.home.noPosts}
        </div>
      </section>
    );
  }

  return (
    <>
      <section
        className={`cy-board min-h-0 flex-1 ${voteLock ? 'pointer-events-none opacity-90' : ''}`}
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
        </div>

        <div className="cy-board-footer">
          <div className="flex items-center gap-2 text-zinc-500">
            <span>{vi.home.swipeCard}</span>
            <span className="text-zinc-300">·</span>
            <span>{vi.home.swipeBoardNav}</span>
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
