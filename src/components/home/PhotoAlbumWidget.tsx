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
      <div className="cy-card flex h-full flex-col p-1.5">
        <div className="mb-0.5 text-[11px] font-bold">{vi.home.photoAlbum}</div>
        <div className="cy-card-inset mb-1 flex flex-1 flex-col overflow-hidden bg-zinc-100">
          <div className="flex h-3 items-center gap-1 border-b border-zinc-400 bg-zinc-300 px-1">
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
          </div>
          <div
            className="flex flex-1 items-center justify-center"
            style={{
              background: 'linear-gradient(180deg, #87ceeb 0%, #6b8e6b 60%, #4a6741 100%)',
              filter: 'grayscale(100%) contrast(1.15)',
            }}
            aria-hidden
          />
        </div>
        <button
          type="button"
          onClick={() => {
            setDraft(caption);
            setIsEditing(true);
          }}
          className="cy-card-inset truncate rounded px-1.5 py-0.5 text-center text-[10px]"
        >
          {caption || vi.home.captionPlaceholder}
        </button>
      </div>

      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center">
          <div className="cy-card w-full max-w-xs p-4">
            <h3 className="mb-2 text-sm font-bold">{vi.home.captionTitle}</h3>
            <p className="mb-2 text-xs text-zinc-500">{vi.home.maxChars(MAX_CAPTION_CHARS)}</p>
            <input
              type="text"
              value={draft}
              maxLength={MAX_CAPTION_CHARS}
              onChange={(e) => setDraft(e.target.value)}
              className="cy-card-inset mb-2 w-full rounded px-2 py-2 text-center text-sm"
              placeholder={vi.home.photoPlaceholder}
            />
            <p className="mb-2 text-right text-xs text-zinc-500">
              {draft.length}/{MAX_CAPTION_CHARS}
            </p>
            {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="cy-hard-btn min-h-[44px] flex-1 rounded bg-white py-2 text-sm"
              >
                {vi.home.cancel}
              </button>
              <button
                type="button"
                onClick={saveCaption}
                className="cy-write-btn min-h-[44px] flex-1 py-2 text-sm"
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
