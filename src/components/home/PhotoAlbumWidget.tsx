import { useAtom } from 'jotai';
import { useSetAtom } from 'jotai';
import { db } from '@/lib/db';
import { vi } from '@/i18n/vi';
import { appPageAtom } from '@/stores/atoms';
import { stickerSlotAtom } from '@/stores/stickerStore';

interface PhotoAlbumWidgetProps {
  onOpenDecor: () => void;
  onOpenPomodoro: () => void;
}

export function PhotoAlbumWidget({ onOpenDecor, onOpenPomodoro }: PhotoAlbumWidgetProps) {
  const setPage = useSetAtom(appPageAtom);
  const [stickers, setStickers] = useAtom(stickerSlotAtom);
  const album = db.getPhoto();

  const openAlbum = () => {
    setPage('album');
  };

  return (
    <div className="cy-card relative flex h-full min-h-0 flex-col justify-between overflow-hidden bg-[#fffdf5] p-2.5">
      {stickers.slotB && (
        <button
          type="button"
          onClick={() => setStickers((prev) => ({ ...prev, slotB: '' }))}
          className="cy-doodle-sticker-slot -right-1 -top-2.5 animate-pulse"
          aria-label={vi.doodle.remove}
        >
          {stickers.slotB}
        </button>
      )}

      <div className="flex items-center justify-between border-b border-dashed border-[#2e2a25]/20 pb-1">
        <span className="text-[9px] font-extrabold uppercase tracking-wider text-rose-500">
          📷 {vi.doodle.photoBooth}
        </span>
      </div>

      <button
        type="button"
        onClick={openAlbum}
        className="relative my-1.5 flex flex-1 items-center justify-center overflow-hidden rounded-xl border-2 border-[#2e2a25] bg-[#fefce6] p-1"
        aria-label={vi.album.open}
      >
        <img
          src={album.imageUrl}
          alt=""
          draggable={false}
          className="h-full w-full rounded-lg object-cover"
        />
        <span className="absolute bottom-1 right-2 max-w-[120px] truncate rounded-md bg-black/40 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
          {album.caption || vi.home.captionPlaceholder}
        </span>
      </button>

      <div className="mt-1 grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={onOpenDecor}
          className="rounded-lg border-2 border-[#2e2a25] bg-[#ffc6ff] py-1 text-[8px] font-extrabold transition-all active:scale-95"
        >
          💖 {vi.doodle.decorBtn}
        </button>
        <button
          type="button"
          onClick={onOpenPomodoro}
          className="rounded-lg border-2 border-[#2e2a25] bg-[#bae1ff] py-1 text-[8px] font-extrabold transition-all active:scale-95"
        >
          ⏳ {vi.doodle.pomoBtn}
        </button>
      </div>
    </div>
  );
}
