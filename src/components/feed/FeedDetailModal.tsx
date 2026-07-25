import { useState } from 'react';
import { useAtomValue } from 'jotai';
import type { FeedPost } from '@/types';
import { assertCleanText } from '@/lib/profanity-shield';
import { db } from '@/lib/db';
import { useMessages } from '@/i18n';
import { currentUserAtom } from '@/stores/atoms';
import { AnonymousMark } from '@/components/feed/AnonymousMark';

interface FeedDetailModalProps {
  post: FeedPost;
  onClose: () => void;
}

export function FeedDetailModal({ post, onClose }: FeedDetailModalProps) {
  const t = useMessages();
  const currentUser = useAtomValue(currentUserAtom);

  const [comments, setComments] = useState(() => db.getComments(post.id));
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');

  const handleComment = () => {
    const check = assertCleanText(draft);
    if (!check.ok) {
      setError(check.message);
      return;
    }
    if (!draft.trim()) return;
    db.addComment(post.id, currentUser.id, draft.trim());
    setComments(db.getComments(post.id));
    setDraft('');
    setError('');
  };

  return (
    <div className="page-shell fixed inset-0 z-50 flex flex-col">
      <header className="sk-divider-bottom flex items-center justify-between bg-[var(--paper)] p-3">
        <button type="button" onClick={onClose} className="text-sm font-bold">
          {t.feed.close}
        </button>
        <span className="text-sm font-bold">{t.feed.detail}</span>
        <span className="w-10" />
      </header>

      <div className="scrollbar-hide flex-1 overflow-y-auto p-4">
        <div className="mb-3">
          <AnonymousMark post={post} onWarp={onClose} />
        </div>

        <p className="mb-4 whitespace-pre-line text-base leading-relaxed">{post.content}</p>

        {(post.hasPhoto || post.hasVideo) && (
          <div className="diary-border mb-4 flex aspect-video items-center justify-center bg-pastel-lavender/40">
            {post.hasPhoto && <span className="text-4xl">{t.feed.media}</span>}
            {post.hasVideo && <span className="text-4xl">{t.feed.video}</span>}
          </div>
        )}

        <section className="diary-panel p-3">
          <h4 className="mb-2 text-sm font-bold">{t.feed.comments}</h4>
          <div className="mb-3 space-y-2">
            {comments.length === 0 && (
              <p className="text-xs text-slate-400">{t.feed.noComments}</p>
            )}
            {comments.map((c) => (
              <div key={c.id} className="text-xs">
                <span className="font-bold">{t.home.anonymousMark}</span>
                <span className="ml-2">{c.content}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t.feed.commentPlaceholder}
              className="diary-border flex-1 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={handleComment}
              className="pencil-btn-secondary px-3 text-sm"
            >
              {t.feed.submit}
            </button>
          </div>
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </section>
      </div>
    </div>
  );
}
