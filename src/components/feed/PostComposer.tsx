import { useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import type { BoardType } from '@/types';
import { assertCleanText } from '@/lib/profanity-shield';
import { db } from '@/lib/db';
import { emitRealtime } from '@/lib/realtime';
import { REALTIME_MESSAGES } from '@/config/app-content';
import { vi } from '@/i18n/vi';
import { currentUserAtom, postsAtom, viewModeAtom, strangerHostIdAtom } from '@/stores/atoms';

interface PostComposerProps {
  onClose: () => void;
  initialBoard?: BoardType;
}

export function PostComposer({ onClose, initialBoard }: PostComposerProps) {
  const viewMode = useAtomValue(viewModeAtom);
  const user = useAtomValue(currentUserAtom);
  const hostId = useAtomValue(strangerHostIdAtom);
  const setPosts = useSetAtom(postsAtom);

  const [content, setContent] = useState('');
  const [board, setBoard] = useState<BoardType>(
    initialBoard ?? (viewMode === 'my' ? 'diary' : 'guestbook'),
  );
  const [hasPhoto, setHasPhoto] = useState(false);
  const [hasLink, setHasLink] = useState(false);
  const [error, setError] = useState('');

  const boardType: BoardType = board;

  const title =
    boardType === 'diary'
      ? vi.feed.writeSecret
      : boardType === 'school'
        ? vi.feed.schoolBoard
        : vi.feed.guestbookCard;

  const handleSubmit = () => {
    const check = assertCleanText(content);
    if (!check.ok) {
      setError(check.message);
      return;
    }
    if (!content.trim()) {
      setError(vi.feed.emptyContent);
      return;
    }

    db.addPost({
      authorId: user.id,
      boardType,
      content: content.trim(),
      hasPhoto,
      hasVideo: false,
      hasLink,
      targetUserId: hostId ?? undefined,
    });

    setPosts(db.getPosts());

    if (boardType === 'school' || boardType === 'diary') {
      emitRealtime({
        type: 'new_post',
        message: REALTIME_MESSAGES.newSchoolPost,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
      <div className="diary-panel w-full max-w-md rounded-t-2xl p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold">{title}</h3>
          <button type="button" onClick={onClose} className="text-sm">
            ✕
          </button>
        </div>

        <div className="mb-3 flex gap-2 text-xs">
          {viewMode === 'my' && (
            <>
              <button
                type="button"
                onClick={() => setBoard('diary')}
                className={`diary-border rounded px-2 py-1 ${board === 'diary' ? 'bg-amber-100 font-bold' : ''}`}
              >
                {vi.feed.secretTab}
              </button>
              <button
                type="button"
                onClick={() => setBoard('school')}
                className={`diary-border rounded px-2 py-1 ${board === 'school' ? 'bg-amber-100 font-bold' : ''}`}
              >
                {vi.feed.schoolTab}
              </button>
            </>
          )}
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          maxLength={200}
          placeholder={viewMode === 'my' ? vi.feed.placeholderMy : vi.feed.placeholderGuest}
          className="diary-border mb-2 w-full resize-none rounded-lg p-3 text-sm"
        />

        <div className="mb-3 flex gap-3 text-xs">
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={hasPhoto} onChange={(e) => setHasPhoto(e.target.checked)} />
            {vi.feed.photo}
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={hasLink} onChange={(e) => setHasLink(e.target.checked)} />
            {vi.feed.link}
          </label>
        </div>

        {error && <p className="mb-2 text-xs text-red-600">{error}</p>}

        <button
          type="button"
          onClick={handleSubmit}
          className="doodle-btn-primary w-full py-3 text-sm"
        >
          {vi.feed.publish}
        </button>
      </div>
    </div>
  );
}
