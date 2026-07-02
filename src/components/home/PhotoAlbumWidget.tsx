import { useState } from 'react';
import { assertCleanText } from '@/lib/profanity-shield';
import { db } from '@/lib/db';
import { MAX_CAPTION_CHARS } from '@/types';
import { vi } from '@/i18n/vi';

export function PhotoAlbumWidget() {
  const album = db.getPhoto();
  const [caption, setCaption] = useState(album.caption);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(caption);
  const [error, setError] = useState('');

  const saveCaption = () => {
    const check = assertCleanText(draft);
    if (!check.ok) {
      setError(check.message);
      return;
    }
    db.saveCaption(draft.trim());
    setCaption(draft.trim());
    setIsEditing(false);
    setError('');
  };

  return (
    <>
      <div className="diary-panel flex h-full flex-col p-2">
        <div className="mb-1 flex items-center gap-1 text-xs font-bold">
          <span>📷</span>
          <span>{vi.home.photoAlbum}</span>
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
          {caption || vi.home.captionPlaceholder}
        </button>
      </div>

      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="diary-panel w-full max-w-xs p-4">
            <h3 className="mb-2 text-sm font-bold">{vi.home.captionTitle}</h3>
            <p className="mb-2 text-xs text-slate-500">{vi.home.maxChars(MAX_CAPTION_CHARS)}</p>
            <input
              type="text"
              value={draft}
              maxLength={MAX_CAPTION_CHARS}
              onChange={(e) => setDraft(e.target.value)}
              className="diary-border mb-2 w-full rounded px-2 py-2 text-center text-sm"
              placeholder={vi.home.photoPlaceholder}
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
                {vi.home.cancel}
              </button>
              <button
                type="button"
                onClick={saveCaption}
                className="diary-border flex-1 rounded bg-slate-800 py-2 text-sm text-white"
              >
                {vi.home.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
