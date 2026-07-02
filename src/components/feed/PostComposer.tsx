import { useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import type { BoardType } from '@/types';
import { assertCleanText } from '@/lib/profanity-shield';
import { db } from '@/lib/db';
import { emitRealtime } from '@/lib/realtime';
import { currentUserAtom, postsAtom, viewModeAtom, strangerHostIdAtom } from '@/stores/atoms';

interface PostComposerProps {
  onClose: () => void;
}

export function PostComposer({ onClose }: PostComposerProps) {
  const viewMode = useAtomValue(viewModeAtom);
  const user = useAtomValue(currentUserAtom);
  const hostId = useAtomValue(strangerHostIdAtom);
  const setPosts = useSetAtom(postsAtom);

  const [content, setContent] = useState('');
  const [board, setBoard] = useState<BoardType>(viewMode === 'my' ? 'diary' : 'guestbook');
  const [hasPhoto, setHasPhoto] = useState(false);
  const [hasLink, setHasLink] = useState(false);
  const [error, setError] = useState('');

  const boardType: BoardType = board;

  const title =
    boardType === 'diary'
      ? '🤫 비밀 카드 쓰기'
      : boardType === 'school'
        ? '📢 학교 게시판'
        : '✍️ 방명록 카드';

  const handleSubmit = () => {
    const check = assertCleanText(content);
    if (!check.ok) {
      setError(check.message);
      return;
    }
    if (!content.trim()) {
      setError('내용을 입력하세요.');
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
        message: '학교게시판에 새로운 글이 올라왔습니다.',
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
                비밀 카드
              </button>
              <button
                type="button"
                onClick={() => setBoard('school')}
                className={`diary-border rounded px-2 py-1 ${board === 'school' ? 'bg-amber-100 font-bold' : ''}`}
              >
                학교 게시판
              </button>
            </>
          )}
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          maxLength={200}
          placeholder={viewMode === 'my' ? '비밀 이야기...' : '방명록 남기기...'}
          className="diary-border mb-2 w-full resize-none rounded-lg p-3 text-sm"
        />

        <div className="mb-3 flex gap-3 text-xs">
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={hasPhoto} onChange={(e) => setHasPhoto(e.target.checked)} />
            📸 사진
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={hasLink} onChange={(e) => setHasLink(e.target.checked)} />
            🔗 링크
          </label>
        </div>

        {error && <p className="mb-2 text-xs text-red-600">{error}</p>}

        <button
          type="button"
          onClick={handleSubmit}
          className="diary-border w-full rounded-lg bg-slate-800 py-3 text-sm font-bold text-white"
        >
          게시
        </button>
      </div>
    </div>
  );
}
