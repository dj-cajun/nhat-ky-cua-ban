import { useAtomValue, useSetAtom } from 'jotai';
import type { BoardType, FeedPost } from '@/types';
import { BOARD_LABELS } from '@/i18n/vi';
import { vi } from '@/i18n/vi';
import {
  activeBoardAtom,
  appPageAtom,
  postsAtom,
  voteLockAtom,
} from '@/stores/atoms';
import { AnonymousMark } from '@/components/feed/AnonymousMark';
import { MediaIcons } from '@/components/feed/MediaIcons';

const HOME_BOARDS: BoardType[] = ['diary', 'school', 'guestbook'];
const PREVIEW_POST_COUNT = 3;

function truncateLine(text: string, maxLen = 48): string {
  const line = text.split('\n')[0] ?? '';
  if (line.length > maxLen) {
    return line.slice(0, maxLen) + '…';
  }
  return line;
}

function buildPreviewSlots(posts: FeedPost[]): (FeedPost | null)[] {
  return Array.from({ length: PREVIEW_POST_COUNT }, (_, index) => posts[index] ?? null);
}

type SwipeCardStackProps = {
  onWrite?: () => void;
  canWrite?: boolean;
};

export function SwipeCardStack({ onWrite, canWrite = false }: SwipeCardStackProps) {
  const allPosts = useAtomValue(postsAtom);
  const voteLock = useAtomValue(voteLockAtom);
  const setActiveBoard = useSetAtom(activeBoardAtom);
  const setPage = useSetAtom(appPageAtom);

  const openBoard = (board: BoardType) => {
    if (voteLock) return;
    setActiveBoard(board);
    setPage('board');
  };

  return (
    <section
      className={`cy-board-preview cy-board-preview-home ${
        canWrite && onWrite ? 'cy-board-preview-home--writable' : ''
      } ${voteLock ? 'opacity-90' : ''}`}
    >
      <div className="shrink-0">
        {HOME_BOARDS.map((board, index) => {
          const posts = Array.isArray(allPosts?.[board]) ? allPosts[board] : [];
          const slots = buildPreviewSlots(posts);

          return (
            <div key={board} className={index > 0 ? 'border-t border-zinc-300' : ''}>
              <button
                type="button"
                onClick={() => openBoard(board)}
                disabled={voteLock}
                className="cy-board-section-title w-full active:bg-y2k-pink-light/50 disabled:opacity-50"
              >
                {BOARD_LABELS[board]}
              </button>

              {slots.map((post, slotIndex) => {
                if (!post) {
                  return (
                    <div key={`${board}-slot-${slotIndex}`} className="cy-board-post-row">
                      {posts.length === 0 && slotIndex === 0 ? (
                        <span className="text-[10px] text-zinc-400">{vi.home.noPosts}</span>
                      ) : null}
                    </div>
                  );
                }

                return (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => openBoard(board)}
                    disabled={voteLock}
                    className="cy-board-post-row w-full disabled:opacity-50 active:bg-y2k-pink-light/30"
                  >
                    <AnonymousMark post={post} disabled={voteLock} />
                    <span className="min-w-0 flex-1 truncate text-zinc-700">
                      {truncateLine(post.content)}
                      <MediaIcons post={post} />
                    </span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {canWrite && onWrite && (
        <div className="mt-auto shrink-0 border-t-2 border-black px-2 py-1.5 text-right">
          <button type="button" onClick={onWrite} className="cy-write-btn">
            {vi.home.write}
          </button>
        </div>
      )}
    </section>
  );
}
