import { useRef, useState } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import type { BoardType, FeedPost } from '@/types';
import { BOARD_LABELS } from '@/types';
import { mockPosts, mockStrangerUser } from '@/lib/mock-data';
import { showInterstitialAd } from '@/lib/zalo-ads';
import {
  activeBoardAtom,
  cardIndexAtom,
  strangerUserAtom,
  viewModeAtom,
  voteLockAtom,
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

export function SwipeCardStack() {
  const [activeBoard, setActiveBoard] = useAtom(activeBoardAtom);
  const [cardIndex, setCardIndex] = useAtom(cardIndexAtom);
  const voteLock = useAtomValue(voteLockAtom);
  const setViewMode = useSetAtom(viewModeAtom);
  const setStrangerUser = useSetAtom(strangerUserAtom);

  const [selectedPost, setSelectedPost] = useState<FeedPost | null>(null);
  const touchStart = useRef({ x: 0, y: 0 });

  const posts = mockPosts[activeBoard] ?? [];
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
      // 가로 스와이프: 게시판 전환
      const nextIndex =
        dx > 0
          ? (boardIndex - 1 + BOARD_ORDER.length) % BOARD_ORDER.length
          : (boardIndex + 1) % BOARD_ORDER.length;
      setActiveBoard(BOARD_ORDER[nextIndex]);
      setCardIndex(0);
    } else if (Math.abs(dy) > threshold) {
      // 세로 스와이프: 카드 넘김
      if (dy < 0) {
        setCardIndex((i) => i + 1);
      } else {
        setCardIndex((i) => Math.max(0, i - 1));
      }
    }
  };

  const handleAuthorWarp = async (post: FeedPost) => {
    if (voteLock) return;
    await showInterstitialAd();
    setStrangerUser({ ...mockStrangerUser, id: post.authorId });
    setViewMode('stranger');
  };

  if (!currentPost) {
    return (
      <section className="diary-panel flex flex-1 items-center justify-center p-4 text-sm text-slate-500">
        게시글이 없습니다
      </section>
    );
  }

  return (
    <>
      <section
        className={`diary-panel flex min-h-0 flex-1 flex-col p-3 ${voteLock ? 'opacity-90' : ''}`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="font-bold">📖 [ {BOARD_LABELS[activeBoard]} ]</span>
          <span className="text-slate-500">
            ◀ 스와이프 ▶ {voteLock && '🔒 LOCK'}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setSelectedPost(currentPost)}
          className="diary-border flex min-h-0 flex-1 flex-col rounded-lg bg-white p-3 text-left"
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              void handleAuthorWarp(currentPost);
            }}
            className="mb-2 w-fit text-xs font-bold text-slate-800 underline"
          >
            🤫 익명
          </button>
          <p className="flex-1 whitespace-pre-line text-sm leading-relaxed">
            {truncateContent(currentPost.content)}
            <MediaIcons post={currentPost} />
          </p>
        </button>

        <p className="mt-2 text-center text-[10px] text-slate-400">
          ▲▼ 카드 · ◀▶ 게시판
        </p>
      </section>

      {selectedPost && (
        <FeedDetailModal post={selectedPost} onClose={() => setSelectedPost(null)} />
      )}
    </>
  );
}
