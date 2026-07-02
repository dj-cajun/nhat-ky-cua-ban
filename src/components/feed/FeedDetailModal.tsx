import { useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import type { FeedPost } from '@/types';
import { assertCleanText } from '@/lib/profanity-shield';
import { db } from '@/lib/db';
import { showInterstitialAd } from '@/lib/zalo-ads';
import { vi } from '@/i18n/vi';
import { strangerUserAtom, viewModeAtom, strangerHostIdAtom, currentUserAtom } from '@/stores/atoms';

interface FeedDetailModalProps {
  post: FeedPost;
  onClose: () => void;
}

export function FeedDetailModal({ post, onClose }: FeedDetailModalProps) {
  const setViewMode = useSetAtom(viewModeAtom);
  const setStrangerUser = useSetAtom(strangerUserAtom);
  const setHostId = useSetAtom(strangerHostIdAtom);
  const currentUser = useAtomValue(currentUserAtom);

  const [comments, setComments] = useState(() => db.getComments(post.id));
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');

  const handleWarp = async () => {
    const classmate = db.getClassmateById(post.authorId);
    if (!classmate) return;
    await showInterstitialAd();
    setStrangerUser(classmate);
    setHostId(post.authorId);
    setViewMode('stranger');
    onClose();
  };

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
    <div className="fixed inset-0 z-50 flex flex-col bg-[#faf9f6]">
      <header className="diary-border flex items-center justify-between p-3">
        <button type="button" onClick={onClose} className="text-sm font-bold">
          {vi.feed.close}
        </button>
        <span className="text-sm font-bold">{vi.feed.detail}</span>
        <span className="w-10" />
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        <button type="button" onClick={() => void handleWarp()} className="mb-3 text-sm font-bold underline">
          {vi.home.anonymous} / Ẩn danh
        </button>

        <p className="mb-4 whitespace-pre-line text-base leading-relaxed">{post.content}</p>

        {(post.hasPhoto || post.hasVideo) && (
          <div className="diary-border mb-4 flex aspect-video items-center justify-center rounded-lg bg-slate-100">
            {post.hasPhoto && <span className="text-4xl">{vi.feed.media}</span>}
            {post.hasVideo && <span className="text-4xl">{vi.feed.video}</span>}
          </div>
        )}

        <section className="diary-panel p-3">
          <h4 className="mb-2 text-sm font-bold">{vi.feed.comments}</h4>
          <div className="mb-3 space-y-2">
            {comments.length === 0 && (
              <p className="text-xs text-slate-400">{vi.feed.noComments}</p>
            )}
            {comments.map((c) => (
              <div key={c.id} className="text-xs">
                <span className="font-bold">{vi.home.anonymous}</span>
                <span className="ml-2">{c.content}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={vi.feed.commentPlaceholder}
              className="diary-border flex-1 rounded px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={handleComment}
              className="diary-border rounded bg-slate-800 px-3 text-sm text-white"
            >
              {vi.feed.submit}
            </button>
          </div>
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </section>
      </div>
    </div>
  );
}
