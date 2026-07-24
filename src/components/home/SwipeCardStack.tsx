import { useAtomValue, useSetAtom } from 'jotai';
import type { BoardType, FeedPost } from '@/types';
import { useMessages } from '@/i18n';
import {
  activeBoardAtom,
  appPageAtom,
  postsAtom,
  voteLockAtom,
} from '@/stores/atoms';
import { AnonymousMark } from '@/components/feed/AnonymousMark';
import { MediaIcons } from '@/components/feed/MediaIcons';

const HOME_BOARDS: BoardType[] = ['diary', 'school', 'guestbook'];
const BOARD_TITLE_PASTEL: Record<BoardType, string> = {
  diary: 'cy-board-section-title--diary',
  school: 'cy-board-section-title--school',
  guestbook: 'cy-board-section-title--guestbook',
  vote: 'cy-board-section-title--vote',
};
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
  const t = useMessages();
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
      className={`cy-board-preview cy-box-lavender cy-board-preview-home ${
        canWrite && onWrite ? 'cy-board-preview-home--writable' : ''
      } ${voteLock ? 'opacity-90' : ''}`}
    >
      <div className="cy-board-preview-scroll">
        {HOME_BOARDS.map((board, index) => {
          const posts = Array.isArray(allPosts?.[board]) ? allPosts[board] : [];
          const slots = buildPreviewSlots(posts);

          return (
            <div key={board} className={index > 0 ? 'sk-divider-top' : ''}>
              <button
                type="button"
                onClick={() => openBoard(board)}
                disabled={voteLock}
                className={`cy-board-section-title cy-board-row-tappable w-full ${BOARD_TITLE_PASTEL[board]}`}
              >
                <span className="min-w-0 flex-1 truncate">{t.boards[board]}</span>
                <span className="cy-board-post-row-cue" aria-hidden>
                  ›
                </span>
              </button>

              {slots.map((post, slotIndex) => {
                if (!post) {
                  return (
                    <div key={`${board}-slot-${slotIndex}`} className="cy-board-post-row">
                      {posts.length === 0 && slotIndex === 0 ? (
                        <span className="text-[10px] text-zinc-400">{t.home.noPosts}</span>
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
                    className="cy-board-post-row cy-board-row-tappable w-full"
                  >
                    <AnonymousMark post={post} disabled={voteLock} />
                    <span className="min-w-0 flex-1 truncate text-zinc-700">
                      {truncateLine(post.content)}
                      <MediaIcons post={post} />
                    </span>
                    <span className="cy-board-post-row-cue" aria-hidden>
                      🐾
                    </span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {canWrite && onWrite && (
        <div className="cy-board-preview-write-bar">
          <button type="button" onClick={onWrite} className="cy-write-btn">
            {t.home.write}
          </button>
        </div>
      )}
    </section>
  );
}
