import { useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { useMessages } from '@/i18n';
import { DOTORI_GIFT_AMOUNTS, DOTORI_PRICES, PROFILE_DECO_OPTIONS } from '@/types/dotori';
import { sendDecoGift, sendDotoriGift } from '@/lib/dotori-economy';
import { currentUserAtom, displayUserAtom } from '@/stores/atoms';

type GiftSheetProps = {
  onClose: () => void;
};

export function GiftSheet({ onClose }: GiftSheetProps) {
  const t = useMessages();
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
          ? t.dotori.spendFail.insufficient
          : t.dotori.spendFail.limit,
      );
      return;
    }
    setUser((u) => ({ ...u, dotoriBalance: result.balance }));
    setToast(t.dotori.giftSent);
    window.setTimeout(onClose, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4">
      <div className="diary-panel w-full max-w-md p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold">{t.gift.title}</h2>
          <button type="button" onClick={onClose} className="text-xs">
            {t.home.cancel}
          </button>
        </div>

        <div className="mb-3 flex gap-2">
          <button
            type="button"
            onClick={() => setTab('dotori')}
            className={`flex-1 py-1 text-xs font-bold pencil-chip ${tab === 'dotori' ? 'pencil-chip--selected bg-pastel-lavender' : ''}`}
          >
            {t.gift.dotori}
          </button>
          <button
            type="button"
            onClick={() => setTab('deco')}
            className={`flex-1 py-1 text-xs font-bold pencil-chip ${tab === 'deco' ? 'pencil-chip--selected bg-pastel-lavender' : ''}`}
          >
            {t.gift.deco} ({DOTORI_PRICES.gift_deco} 🌰)
          </button>
        </div>

        {tab === 'dotori' ? (
          <div className="mb-3 flex gap-2">
            {DOTORI_GIFT_AMOUNTS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setAmount(value)}
                className={`flex-1 py-2 text-xs font-bold pencil-chip ${amount === value ? 'pencil-chip--selected' : ''}`}
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
                className={`px-3 py-2 text-lg pencil-chip ${deco === emoji ? 'pencil-chip--selected' : ''}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        <input
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, 10))}
          placeholder={t.gift.messagePlaceholder}
          className="diary-border mb-3 w-full px-3 py-2 text-sm"
        />

        <button
          type="button"
          onClick={submit}
          className="pencil-btn-primary"
        >
          {t.gift.send}
        </button>
        {toast && <p className="mt-2 text-center text-xs text-emerald-700">{toast}</p>}
      </div>
    </div>
  );
}
