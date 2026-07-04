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

export function AlbumPage({ onBack }: AlbumPageProps) {
  const viewMode = useAtomValue(viewModeAtom);
  const [photos, setPhotos] = useState(() => db.getPhotoGallery());
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftCaption, setDraftCaption] = useState('');
  const [draftImage, setDraftImage] = useState('');
  const [error, setError] = useState('');
  const [picking, setPicking] = useState(false);

  const canEdit = viewMode === 'my';
  const viewingPhoto = viewingId ? photos.find((photo) => photo.id === viewingId) : null;
  const editingPhoto = editingId ? photos.find((photo) => photo.id === editingId) : null;

  const refreshPhotos = () => {
    setPhotos(db.getPhotoGallery());
  };

  const openViewer = (photo: PhotoCard) => {
    setViewingId(photo.id);
    setError('');
  };

  const closeViewer = () => {
    setViewingId(null);
  };

  const openEdit = (photo: PhotoCard) => {
    if (!canEdit) return;
    setEditingId(photo.id);
    setDraftCaption(photo.caption);
    setDraftImage(photo.imageUrl);
    setViewingId(null);
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

  const handleDelete = (photoId: string) => {
    if (!canEdit) return;
    if (!window.confirm(vi.album.deleteConfirm)) return;
    db.deletePhotoCard(photoId);
    refreshPhotos();
    closeViewer();
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
              {photos.map((photo) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => openViewer(photo)}
                  className="cy-pinterest-pin text-left"
                >
                  <div className="cy-pinterest-pin-image">
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

          {error && !editingId && !viewingId && (
            <p className="mt-2 px-1 text-xs text-red-600">{error}</p>
          )}
        </section>

        {canEdit && photos.length > 0 && (
          <div className="pencil-bar">
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

      {viewingPhoto && (
        <div className="cy-photo-lightbox">
          <header className="flex shrink-0 items-center justify-between px-4 py-3 text-white">
            <button type="button" onClick={closeViewer} className="text-xs font-bold">
              {vi.album.viewClose}
            </button>
            {canEdit ? (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleDelete(viewingPhoto.id)}
                  className="text-xs font-bold text-red-300"
                >
                  {vi.album.delete}
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(viewingPhoto)}
                  className="text-xs font-bold text-y2k-pink-light"
                >
                  {vi.album.edit}
                </button>
              </div>
            ) : (
              <span className="w-8" />
            )}
          </header>

          <div className="cy-photo-lightbox-stage">
            <img
              src={viewingPhoto.imageUrl}
              alt=""
              draggable={false}
              className="cy-photo-lightbox-image"
            />
          </div>

          <p className="shrink-0 px-4 pb-4 text-center text-sm font-bold text-white">
            {viewingPhoto.caption || vi.home.captionPlaceholder}
          </p>
        </div>
      )}

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
              <div className="cy-photo-edit-preview">
                <img src={draftImage} alt="" draggable={false} />
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
            <button type="button" onClick={saveEdit} className="cy-write-btn mb-2 w-full py-2 text-sm">
              {vi.home.save}
            </button>
            <button
              type="button"
              onClick={() => handleDelete(editingPhoto.id)}
              className="pencil-btn-danger w-full py-2 text-sm"
            >
              {vi.album.delete}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
