import { useState } from 'react';
import { useSetAtom } from 'jotai';
import { vi } from '@/i18n/vi';
import { getMyGifts, getUnopenedGiftCount, openGift } from '@/lib/dotori-economy';
import { db } from '@/lib/db';
import { currentUserAtom } from '@/stores/atoms';

type GiftInboxProps = {
  onClose: () => void;
};

export function GiftInbox({ onClose }: GiftInboxProps) {
  const setUser = useSetAtom(currentUserAtom);
  const [gifts, setGifts] = useState(getMyGifts());

  const handleOpen = (giftId: string) => {
    const gift = openGift(giftId);
    if (!gift) return;
    setGifts(getMyGifts());
    const updated = db.getProfile();
    if (updated) setUser(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4">
      <div className="diary-panel max-h-[70vh] w-full max-w-md overflow-y-auto p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold">{vi.gift.inboxTitle}</h2>
          <button type="button" onClick={onClose} className="text-xs">
            {vi.home.cancel}
          </button>
        </div>
        {gifts.length === 0 ? (
          <p className="text-xs text-zinc-500">{vi.gift.inboxEmpty}</p>
        ) : (
          <ul className="space-y-2">
            {gifts.map((gift) => (
              <li key={gift.id} className="rounded border border-zinc-200 p-3 text-xs">
                <p className="font-bold">{vi.gift.from(gift.senderLabel)}</p>
                <p className="text-zinc-600">
                  {gift.giftType === 'dotori'
                    ? `🌰 × ${gift.amount}`
                    : gift.decoEmoji}
                  {gift.message ? ` · "${gift.message}"` : ''}
                </p>
                {!gift.opened && (
                  <button
                    type="button"
                    onClick={() => handleOpen(gift.id)}
                    className="mt-2 rounded bg-amber-100 px-2 py-1 font-bold"
                  >
                    {vi.gift.open}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function useGiftBadgeCount(): number {
  return getUnopenedGiftCount();
}
