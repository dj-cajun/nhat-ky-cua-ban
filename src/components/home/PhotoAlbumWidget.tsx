import { useState } from 'react';
import { assertCleanText } from '@/lib/profanity-shield';
import { MAX_CAPTION_CHARS } from '@/types';

export function PhotoAlbumWidget() {
  const [caption, setCaption] = useState('우리단짝단짝');
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(caption);
  const [error, setError] = useState('');

  const saveCaption = () => {
    const check = assertCleanText(draft);
    if (!check.ok) {
      setError(check.message);
      return;
    }
    setCaption(draft.trim());
    setIsEditing(false);
    setError('');
  };

  return (
    <>
      <div className="diary-panel flex h-full flex-col p-2">
        <div className="mb-1 flex items-center gap-1 text-xs font-bold">
          <span>📷</span>
          <span>미니 사진첩</span>
        </div>
        <div className="diary-border mb-1 flex flex-1 items-center justify-center rounded bg-slate-100 text-3xl">
          🖼️
        </div>
        <button
          type="button"
          onClick={() => {
            setDraft(caption);
            setIsEditing(true);
          }}
          className="diary-border truncate rounded bg-white px-2 py-1 text-center text-xs"
        >
          {caption || '캡션 입력 (10자)'}
        </button>
      </div>

      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="diary-panel w-full max-w-xs p-4">
            <h3 className="mb-2 text-sm font-bold">사진 캡션</h3>
            <p className="mb-2 text-xs text-slate-500">정확히 최대 {MAX_CAPTION_CHARS}글자</p>
            <input
              type="text"
              value={draft}
              maxLength={MAX_CAPTION_CHARS}
              onChange={(e) => setDraft(e.target.value)}
              className="diary-border mb-2 w-full rounded px-2 py-2 text-center text-sm"
              placeholder="방과후스쿠터"
            />
            <p className="mb-2 text-right text-xs text-slate-500">
              {draft.length}/{MAX_CAPTION_CHARS}
            </p>
            {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="diary-border flex-1 rounded py-2 text-sm"
              >
                취소
              </button>
              <button
                type="button"
                onClick={saveCaption}
                className="diary-border flex-1 rounded bg-slate-800 py-2 text-sm text-white"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
