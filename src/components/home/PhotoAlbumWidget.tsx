import { useSetAtom } from 'jotai';
import { db } from '@/lib/db';
import { vi } from '@/i18n/vi';
import { appPageAtom } from '@/stores/atoms';

export function PhotoAlbumWidget() {
  const setPage = useSetAtom(appPageAtom);
  const album = db.getPhoto();

  const openAlbum = () => {
    setPage('album');
  };

  return (
    <div className="cy-album-widget">
      <div className="mb-0.5 shrink-0 text-[11px] font-bold">{vi.home.photoAlbum}</div>
      <button
        type="button"
        onClick={openAlbum}
        className="cy-card-inset cy-album-frame mb-1 min-h-0 text-left"
        aria-label={vi.album.open}
      >
        <div className="cy-album-chrome">
          <span className="cy-album-chrome-dot" />
          <span className="cy-album-chrome-dot" />
          <span className="cy-album-chrome-dot" />
        </div>
        <div className="cy-album-screen">
          <img src={album.imageUrl} alt="" draggable={false} />
        </div>
      </button>
      <button
        type="button"
        onClick={openAlbum}
        className="cy-card-inset shrink-0 truncate rounded px-1.5 py-0.5 text-center text-[10px]"
      >
        {album.caption || vi.home.captionPlaceholder}
      </button>
    </div>
  );
}
