import { useSetAtom } from 'jotai';
import { db } from '@/lib/db';
import { vi } from '@/i18n/vi';
import { appPageAtom } from '@/stores/atoms';

export function PhotoAlbumWidget() {
  const setPage = useSetAtom(appPageAtom);
  const photos = db.getPhotoGallery();
  const first = photos[0];
  const hasPhoto = Boolean(first?.imageUrl);

  const openAlbum = () => {
    setPage('album');
  };

  const caption = first?.caption || vi.home.captionPlaceholder;

  return (
    <div className="cy-album-widget">
      <div className="mb-0.5 shrink-0 text-[11px] font-bold">{vi.home.photoAlbum}</div>
      <button
        type="button"
        onClick={openAlbum}
        className="cy-album-picture flex min-h-0 w-full flex-1 flex-col items-center"
        aria-label={vi.album.open}
      >
        <div className="cy-album-frame-outer min-h-0 w-full flex-1">
          <div className="cy-album-frame-mat">
            {hasPhoto ? (
              <img src={first.imageUrl} alt="" draggable={false} className="cy-album-frame-photo" />
            ) : (
              <p className="cy-album-frame-empty">{vi.home.noPhoto}</p>
            )}
          </div>
        </div>
        {hasPhoto && (
          <span className="cy-album-caption-sticker" aria-hidden>
            {caption}
          </span>
        )}
      </button>
    </div>
  );
}
