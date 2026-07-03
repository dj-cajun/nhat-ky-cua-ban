import { useAtom } from 'jotai';
import { vi } from '@/i18n/vi';
import {
  DOODLE_STICKERS,
  stickerSlotAtom,
  type StickerSlotKey,
} from '@/stores/stickerStore';

interface StickerDecorSheetProps {
  slot: StickerSlotKey;
  onClose: () => void;
}

const SLOT_LABELS: Record<StickerSlotKey, string> = {
  slotA: vi.doodle.slotProfile,
  slotB: vi.doodle.slotPhoto,
  slotC: vi.doodle.slotCloud,
  slotD: vi.doodle.slotBoard,
};

export function StickerDecorSheet({ slot, onClose }: StickerDecorSheetProps) {
  const [stickers, setStickers] = useAtom(stickerSlotAtom);

  const pick = (emoji: string) => {
    setStickers((prev) => ({ ...prev, [slot]: emoji }));
    onClose();
  };

  const clear = () => {
    setStickers((prev) => ({ ...prev, [slot]: '' }));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#2e2a25]/40 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="cy-card w-full max-w-sm bg-[#fffef0] p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-[#2e2a25]">{vi.doodle.shopTitle}</h2>
          <button type="button" onClick={onClose} className="text-xs font-bold text-zinc-500">
            {vi.home.cancel}
          </button>
        </div>
        <p className="mb-3 text-xs font-bold text-rose-500">{SLOT_LABELS[slot]}</p>
        <div className="mb-4 flex flex-wrap justify-center gap-3">
          {DOODLE_STICKERS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => pick(emoji)}
              className={`cy-hard-btn flex h-12 w-12 items-center justify-center rounded-xl bg-white text-2xl ${
                stickers[slot] === emoji ? 'ring-2 ring-rose-400' : ''
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
        {stickers[slot] && (
          <button
            type="button"
            onClick={clear}
            className="w-full rounded-lg border-2 border-[#2e2a25] py-2 text-xs font-extrabold text-red-600"
          >
            {vi.doodle.remove}
          </button>
        )}
      </div>
    </div>
  );
}
