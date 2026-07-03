import { useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { vi } from '@/i18n/vi';
import { DOTORI_GIFT_AMOUNTS, DOTORI_PRICES, PROFILE_DECO_OPTIONS } from '@/types/dotori';
import { sendDecoGift, sendDotoriGift } from '@/lib/dotori-economy';
import { currentUserAtom, displayUserAtom } from '@/stores/atoms';

type GiftSheetProps = {
  onClose: () => void;
};

export function GiftSheet({ onClose }: GiftSheetProps) {
  const target = useAtomValue(displayUserAtom);
  const setUser = useSetAtom(currentUserAtom);
  const [amount, setAmount] = useState<(typeof DOTORI_GIFT_AMOUNTS)[number]>(5);
  const [deco, setDeco] = useState<string>(PROFILE_DECO_OPTIONS[0]);
  const [message, setMessage] = useState('');
  const [tab, setTab] = useState<'dotori' | 'deco'>('dotori');
  const [toast, setToast] = useState('');

  const submit = () => {
    const result =
      tab === 'dotori'
        ? sendDotoriGift(target.id, amount, message)
        : sendDecoGift(target.id, deco, message);
    if (!result.ok) {
      setToast(
        result.reason === 'insufficient'
          ? vi.dotori.spendFail.insufficient
          : vi.dotori.spendFail.limit,
      );
      return;
    }
    setUser((u) => ({ ...u, dotoriBalance: result.balance }));
    setToast(vi.dotori.giftSent);
    window.setTimeout(onClose, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4">
      <div className="diary-panel w-full max-w-md p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold">{vi.gift.title}</h2>
          <button type="button" onClick={onClose} className="text-xs">
            {vi.home.cancel}
          </button>
        </div>

        <div className="mb-3 flex gap-2">
          <button
            type="button"
            onClick={() => setTab('dotori')}
            className={`flex-1 rounded-xl py-1 text-xs font-bold ${tab === 'dotori' ? 'bg-doodle-blush' : 'bg-doodle-paper'}`}
          >
            {vi.gift.dotori}
          </button>
          <button
            type="button"
            onClick={() => setTab('deco')}
            className={`flex-1 rounded-xl py-1 text-xs font-bold ${tab === 'deco' ? 'bg-doodle-blush' : 'bg-doodle-paper'}`}
          >
            {vi.gift.deco} ({DOTORI_PRICES.gift_deco} 🌰)
          </button>
        </div>

        {tab === 'dotori' ? (
          <div className="mb-3 flex gap-2">
            {DOTORI_GIFT_AMOUNTS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setAmount(value)}
                className={`flex-1 rounded border py-2 text-xs font-bold ${
                  amount === value ? 'bg-doodle-blush shadow-crayon-sm' : 'bg-doodle-paper'
                }`}
              >
                {value} 🌰
              </button>
            ))}
          </div>
        ) : (
          <div className="mb-3 flex flex-wrap gap-2">
            {PROFILE_DECO_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setDeco(emoji)}
                className={`rounded border px-3 py-2 text-lg ${
                  deco === emoji ? 'bg-doodle-blush shadow-crayon-sm' : 'bg-doodle-paper'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        <input
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, 10))}
          placeholder={vi.gift.messagePlaceholder}
          className="diary-border mb-3 w-full rounded px-3 py-2 text-sm"
        />

        <button
          type="button"
          onClick={submit}
          className="doodle-btn-primary w-full py-3 text-sm"
        >
          {vi.gift.send}
        </button>
        {toast && <p className="mt-2 text-center text-xs text-emerald-700">{toast}</p>}
      </div>
    </div>
  );
}
