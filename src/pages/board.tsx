import { useState } from 'react';
import { useAtomValue } from 'jotai';
import type { FeedPost } from '@/types';
import { BOARD_LABELS } from '@/i18n/vi';
import { vi } from '@/i18n/vi';
import { activeBoardAtom, postsAtom, viewModeAtom, voteLockAtom } from '@/stores/atoms';
import { AnonymousMark } from '@/components/feed/AnonymousMark';
import { MediaIcons } from '@/components/feed/MediaIcons';
import { FeedDetailModal } from '@/components/feed/FeedDetailModal';
import { PostComposer } from '@/components/feed/PostComposer';

type BoardPageProps = {
  onBack: () => void;
};

export function BoardPage({ onBack }: BoardPageProps) {
  const activeBoard = useAtomValue(activeBoardAtom);
  const allPosts = useAtomValue(postsAtom);
  const voteLock = useAtomValue(voteLockAtom);
  const viewMode = useAtomValue(viewModeAtom);
  const canWrite = viewMode === 'my' || viewMode === 'stranger';

  const [selectedPost, setSelectedPost] = useState<FeedPost | null>(null);
  const [showComposer, setShowComposer] = useState(false);

  const posts = Array.isArray(allPosts?.[activeBoard]) ? allPosts[activeBoard] : [];

  return (
    <div className="cy-shell">
      <div className="cy-canvas flex min-h-0 flex-1 flex-col">
        <header className="cy-card flex shrink-0 items-center justify-between px-3 py-2">
          <button type="button" onClick={onBack} className="text-xs font-bold">
            {vi.board.back}
          </button>
          <h1 className="text-sm font-bold">{BOARD_LABELS[activeBoard]}</h1>
          <span className="w-10" />
        </header>

        <section
          className={`cy-board-preview flex min-h-0 flex-1 flex-col overflow-hidden ${voteLock ? 'opacity-90' : ''}`}
        >
          <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto">
            {posts.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-zinc-400">{vi.home.noPosts}</p>
            ) : (
              posts.map((post, index) => (
                <div key={post.id} className={index > 0 ? 'sk-divider-top' : ''}>
                  <button
                    type="button"
                    onClick={() => !voteLock && setSelectedPost(post)}
                    className="flex w-full gap-2 px-3 py-2.5 text-left text-[12px] leading-snug"
                  >
                    <AnonymousMark post={post} disabled={voteLock} />
                    <span className="min-w-0 flex-1 whitespace-pre-line text-zinc-800">
                      {post.content}
                      <MediaIcons post={post} />
                    </span>
                  </button>
                </div>
              ))
            )}
          </div>

          {canWrite && (
            <div className="pencil-bar px-2 py-1.5 text-right">
              <button
                type="button"
                onClick={() => !voteLock && setShowComposer(true)}
                disabled={voteLock}
                className="cy-write-btn disabled:opacity-40"
              >
                {vi.home.write}
              </button>
            </div>
          )}
        </section>
      </div>

      {selectedPost && (
        <FeedDetailModal post={selectedPost} onClose={() => setSelectedPost(null)} />
      )}
      {showComposer && (
        <PostComposer initialBoard={activeBoard} onClose={() => setShowComposer(false)} />
      )}
    </div>
  );
}
