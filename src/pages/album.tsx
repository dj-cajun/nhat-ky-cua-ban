import { useState } from 'react';
import type { PhotoCard } from '@/types';
import { assertCleanText } from '@/lib/profanity-shield';
import { db } from '@/lib/db';
import { pickAlbumPhoto } from '@/lib/photo-picker';
import { MAX_ALBUM_PHOTOS, MAX_CAPTION_CHARS } from '@/types';
import { vi } from '@/i18n/vi';
import { viewModeAtom } from '@/stores/atoms';
import { useAtomValue } from 'jotai';

type AlbumPageProps = {
  onBack: () => void;
};

const PIN_RATIOS = ['3/4', '4/5', '1/1', '5/6', '2/3'] as const;

function pinAspectRatio(photo: PhotoCard, index: number): string {
  const seed = photo.id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return PIN_RATIOS[(seed + index) % PIN_RATIOS.length];
}

export function AlbumPage({ onBack }: AlbumPageProps) {
  const viewMode = useAtomValue(viewModeAtom);
  const [photos, setPhotos] = useState(() => db.getPhotoGallery());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftCaption, setDraftCaption] = useState('');
  const [draftImage, setDraftImage] = useState('');
  const [error, setError] = useState('');
  const [picking, setPicking] = useState(false);

  const canEdit = viewMode === 'my';
  const editingPhoto = editingId ? photos.find((photo) => photo.id === editingId) : null;

  const refreshPhotos = () => {
    setPhotos(db.getPhotoGallery());
  };

  const openEdit = (photo: PhotoCard) => {
    if (!canEdit) return;
    setEditingId(photo.id);
    setDraftCaption(photo.caption);
    setDraftImage(photo.imageUrl);
    setError('');
  };

  const closeEdit = () => {
    setEditingId(null);
    setError('');
  };

  const handleChoosePhoto = async () => {
    setPicking(true);
    setError('');
    try {
      const url = await pickAlbumPhoto();
      if (url) setDraftImage(url);
    } finally {
      setPicking(false);
    }
  };

  const handleUpload = async () => {
    if (photos.length >= MAX_ALBUM_PHOTOS) {
      setError(vi.album.maxPhotos(MAX_ALBUM_PHOTOS));
      return;
    }

    setPicking(true);
    setError('');
    try {
      const url = await pickAlbumPhoto();
      if (!url) return;
      db.addPhotoCard(url, '');
      refreshPhotos();
    } finally {
      setPicking(false);
    }
  };

  const saveEdit = () => {
    if (!editingId) return;
    const check = assertCleanText(draftCaption);
    if (!check.ok) {
      setError(check.message);
      return;
    }
    db.updatePhotoCard(editingId, {
      imageUrl: draftImage,
      caption: draftCaption.trim(),
    });
    refreshPhotos();
    closeEdit();
  };

  return (
    <div className="cy-shell">
      <div className="cy-canvas flex min-h-0 flex-1 flex-col">
        <header className="cy-card flex shrink-0 items-center justify-between px-3 py-2">
          <button type="button" onClick={onBack} className="text-xs font-bold">
            {vi.album.back}
          </button>
          <h1 className="text-sm font-bold">{vi.album.title}</h1>
          <span className="font-mono text-[10px] font-bold text-zinc-500">
            {vi.album.counter(photos.length, MAX_ALBUM_PHOTOS)}
          </span>
        </header>

        <section className="relative min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {photos.length === 0 ? (
            <button
              type="button"
              onClick={() => void handleUpload()}
              disabled={picking || !canEdit}
              className="cy-pinterest-pin cy-photo-empty mx-auto flex aspect-[3/4] w-full max-w-[10rem] flex-col items-center justify-center gap-2 p-4 text-center"
            >
              <span className="text-3xl">📷</span>
              <span className="text-xs font-bold">
                {picking ? vi.album.uploading : vi.album.emptyUpload}
              </span>
            </button>
          ) : (
            <div className="cy-pinterest-grid">
              {photos.map((photo, index) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => openEdit(photo)}
                  disabled={!canEdit}
                  className="cy-pinterest-pin text-left disabled:cursor-default"
                >
                  <div
                    className="cy-pinterest-pin-image"
                    style={{ aspectRatio: pinAspectRatio(photo, index) }}
                  >
                    <img src={photo.imageUrl} alt="" draggable={false} loading="lazy" />
                  </div>
                  <p className="cy-pinterest-pin-caption">
                    {photo.caption || vi.home.captionPlaceholder}
                  </p>
                </button>
              ))}

              {canEdit && photos.length < MAX_ALBUM_PHOTOS && (
                <button
                  type="button"
                  onClick={() => void handleUpload()}
                  disabled={picking}
                  className="cy-pinterest-pin cy-pinterest-pin-add"
                >
                  <div className="cy-pinterest-pin-image flex aspect-[3/4] items-center justify-center">
                    <span className="text-2xl">{picking ? '…' : '+'}</span>
                  </div>
                  <p className="cy-pinterest-pin-caption">{vi.album.upload}</p>
                </button>
              )}
            </div>
          )}

          {error && !editingId && <p className="mt-2 px-1 text-xs text-red-600">{error}</p>}
        </section>

        {canEdit && photos.length > 0 && (
          <div className="shrink-0 border-t-2 border-black bg-white px-3 py-2">
            <button
              type="button"
              onClick={() => void handleUpload()}
              disabled={picking || photos.length >= MAX_ALBUM_PHOTOS}
              className="cy-write-btn w-full py-2 text-sm disabled:opacity-40"
            >
              {picking ? vi.album.uploading : vi.album.upload}
            </button>
          </div>
        )}
      </div>

      {editingPhoto && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="cy-card w-full max-w-sm p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold">{vi.album.edit}</h3>
              <button type="button" onClick={closeEdit} className="text-xs text-zinc-500">
                ✕
              </button>
            </div>

            <button
              type="button"
              onClick={() => void handleChoosePhoto()}
              disabled={picking}
              className="cy-card-inset mb-3 w-full overflow-hidden"
            >
              <div className="relative aspect-[3/4] w-full overflow-hidden bg-black">
                <img
                  src={draftImage}
                  alt=""
                  draggable={false}
                  className="absolute inset-0 h-full w-full object-cover object-center"
                />
                <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-xs font-bold text-white">
                  {picking ? vi.album.uploading : vi.home.choosePhoto}
                </span>
              </div>
            </button>

            <input
              type="text"
              value={draftCaption}
              maxLength={MAX_CAPTION_CHARS}
              onChange={(e) => setDraftCaption(e.target.value)}
              className="cy-card-inset mb-2 w-full rounded px-2 py-2 text-center text-sm"
              placeholder={vi.home.photoPlaceholder}
            />
            <p className="mb-2 text-right text-xs text-zinc-500">
              {draftCaption.length}/{MAX_CAPTION_CHARS}
            </p>
            {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
            <button type="button" onClick={saveEdit} className="cy-write-btn w-full py-2 text-sm">
              {vi.home.save}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
