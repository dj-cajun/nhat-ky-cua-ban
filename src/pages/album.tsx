import { useRef, useState } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { assertCleanText } from '@/lib/profanity-shield';
import { db } from '@/lib/db';
import { pickAlbumPhoto } from '@/lib/photo-picker';
import { MAX_ALBUM_PHOTOS, MAX_CAPTION_CHARS } from '@/types';
import { vi } from '@/i18n/vi';
import { photoIndexAtom, viewModeAtom } from '@/stores/atoms';

type AlbumPageProps = {
  onBack: () => void;
};

type FlyDirection = 'left' | 'right';

const SWIPE_THRESHOLD = 64;
const FLY_DURATION_MS = 240;

export function AlbumPage({ onBack }: AlbumPageProps) {
  const viewMode = useAtomValue(viewModeAtom);
  const [index, setIndex] = useAtom(photoIndexAtom);
  const [photos, setPhotos] = useState(() => db.getPhotoGallery());
  const [isEditing, setIsEditing] = useState(false);
  const [draftCaption, setDraftCaption] = useState('');
  const [draftImage, setDraftImage] = useState('');
  const [error, setError] = useState('');
  const [picking, setPicking] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [flying, setFlying] = useState<FlyDirection | null>(null);

  const pointerStart = useRef({ x: 0, y: 0 });
  const dragXRef = useRef(0);
  const swipeLocked = useRef<'horizontal' | 'vertical' | null>(null);
  const stackRef = useRef<HTMLDivElement>(null);

  const canEdit = viewMode === 'my';
  const total = photos.length;
  const safeIndex = total > 0 ? ((index % total) + total) % total : 0;
  const current = total > 0 ? photos[safeIndex] : null;
  const canSwipe = total > 1 && !isEditing && !flying;

  const goTo = (nextIndex: number) => {
    if (total === 0) return;
    setIndex(((nextIndex % total) + total) % total);
    dragXRef.current = 0;
    setDragX(0);
    setIsDragging(false);
    swipeLocked.current = null;
  };

  const flyTo = (direction: FlyDirection) => {
    if (!canSwipe) return;
    setFlying(direction);
    window.setTimeout(() => {
      if (direction === 'left') goTo(safeIndex + 1);
      else goTo(safeIndex - 1);
      setFlying(null);
    }, FLY_DURATION_MS);
  };

  const resetDrag = () => {
    dragXRef.current = 0;
    setDragX(0);
    setIsDragging(false);
    swipeLocked.current = null;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!canSwipe) return;
    pointerStart.current = { x: e.clientX, y: e.clientY };
    swipeLocked.current = null;
    dragXRef.current = 0;
    setDragX(0);
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !canSwipe) return;

    const dx = e.clientX - pointerStart.current.x;
    const dy = e.clientY - pointerStart.current.y;

    if (!swipeLocked.current) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      swipeLocked.current = Math.abs(dx) >= Math.abs(dy) ? 'horizontal' : 'vertical';
    }

    if (swipeLocked.current === 'vertical') {
      setIsDragging(false);
      swipeLocked.current = null;
      return;
    }

    e.preventDefault();
    dragXRef.current = dx;
    setDragX(dx);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    const dx = dragXRef.current;
    const lock = swipeLocked.current;
    resetDrag();

    if (!canSwipe || lock === 'vertical') return;

    if (dx <= -SWIPE_THRESHOLD) flyTo('left');
    else if (dx >= SWIPE_THRESHOLD) flyTo('right');
  };

  const openEdit = () => {
    if (!current) return;
    setDraftCaption(current.caption);
    setDraftImage(current.imageUrl);
    setError('');
    setIsEditing(true);
  };

  const handleChoosePhoto = async () => {
    setPicking(true);
    setError('');
    try {
      const url = await pickAlbumPhoto();
      if (!url) return;
      setDraftImage(url);
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
      const gallery = db.getPhotoGallery();
      setPhotos(gallery);
      setIndex(gallery.length - 1);
    } finally {
      setPicking(false);
    }
  };

  const saveEdit = () => {
    if (!current) return;
    const check = assertCleanText(draftCaption);
    if (!check.ok) {
      setError(check.message);
      return;
    }
    db.updatePhotoCard(current.id, {
      imageUrl: draftImage,
      caption: draftCaption.trim(),
    });
    setPhotos(db.getPhotoGallery());
    setIsEditing(false);
    setError('');
  };

  const cardTransform = flying
    ? flying === 'left'
      ? 'translateX(-125%) rotate(-14deg)'
      : 'translateX(125%) rotate(14deg)'
    : `translateX(${dragX}px) rotate(${dragX * 0.06}deg)`;

  return (
    <div className="cy-shell">
      <div className="cy-canvas flex min-h-0 flex-1 flex-col">
        <header className="cy-card flex shrink-0 items-center justify-between px-3 py-2">
          <button type="button" onClick={onBack} className="text-xs font-bold">
            {vi.album.back}
          </button>
          <h1 className="text-sm font-bold">{vi.album.title}</h1>
          {canEdit ? (
            <button
              type="button"
              onClick={() => (isEditing ? setIsEditing(false) : openEdit())}
              disabled={!current}
              className="text-xs font-bold text-y2k-pink disabled:opacity-40"
            >
              {isEditing ? vi.home.cancel : vi.album.edit}
            </button>
          ) : (
            <span className="w-10" />
          )}
        </header>

        <section className="flex min-h-0 flex-1 flex-col items-center justify-center px-3 py-4">
          {total === 0 ? (
            <button
              type="button"
              onClick={() => void handleUpload()}
              disabled={picking || !canEdit}
              className="cy-photo-card cy-photo-empty flex aspect-[3/4] w-full max-w-xs flex-col items-center justify-center gap-2 p-6 text-center"
            >
              <span className="text-3xl">📷</span>
              <span className="text-sm font-bold">
                {picking ? vi.album.uploading : vi.album.emptyUpload}
              </span>
            </button>
          ) : isEditing && current ? (
            <div className="cy-card w-full max-w-sm p-4">
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
          ) : current ? (
            <>
              <div ref={stackRef} className="cy-photo-stack relative w-full max-w-xs">
                {total > 1 && (
                  <div
                    className="cy-photo-card cy-photo-card--back pointer-events-none absolute inset-x-3 top-2 scale-[0.96] opacity-70"
                    aria-hidden
                  >
                    <img
                      src={photos[(safeIndex + 1) % total].imageUrl}
                      alt=""
                      draggable={false}
                    />
                  </div>
                )}

                <div
                  className="cy-photo-card relative z-10 cursor-grab active:cursor-grabbing"
                  style={{
                    transform: cardTransform,
                    transition: isDragging ? 'none' : `transform ${FLY_DURATION_MS}ms ease-out, opacity ${FLY_DURATION_MS}ms ease-out`,
                    opacity: flying ? 0 : Math.max(0.55, 1 - Math.abs(dragX) / 420),
                  }}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                >
                  <img src={current.imageUrl} alt="" draggable={false} />
                  <div className="cy-photo-caption">{current.caption || vi.home.captionPlaceholder}</div>
                  {isDragging && Math.abs(dragX) > 24 && (
                    <span
                      className={`cy-photo-swipe-hint ${
                        dragX < 0 ? 'cy-photo-swipe-hint--next' : 'cy-photo-swipe-hint--prev'
                      }`}
                    >
                      {dragX < 0 ? '→' : '←'}
                    </span>
                  )}
                </div>
              </div>

              <p className="mt-3 font-mono text-xs font-bold text-zinc-600">
                {vi.album.counter(safeIndex + 1, total)}
              </p>

              <p className="mt-1 text-center text-[10px] text-zinc-500">{vi.album.swipeHint}</p>

              <div className="mt-3 flex gap-1.5">
                {photos.map((photo, photoIndex) => (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => goTo(photoIndex)}
                    className={`h-1.5 rounded-full transition-all ${
                      photoIndex === safeIndex ? 'w-4 bg-y2k-pink' : 'w-1.5 bg-zinc-300'
                    }`}
                    aria-label={vi.album.counter(photoIndex + 1, total)}
                  />
                ))}
              </div>

              {canEdit && (
                <button
                  type="button"
                  onClick={() => void handleUpload()}
                  disabled={picking || photos.length >= MAX_ALBUM_PHOTOS}
                  className="cy-hard-btn mt-4 rounded-lg bg-white px-4 py-2 text-xs font-bold disabled:opacity-40"
                >
                  {picking ? vi.album.uploading : vi.album.upload}
                </button>
              )}
            </>
          ) : null}

          {error && !isEditing && <p className="mt-3 text-xs text-red-600">{error}</p>}
        </section>
      </div>
    </div>
  );
}
