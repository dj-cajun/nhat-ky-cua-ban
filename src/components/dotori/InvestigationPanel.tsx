import { useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { useMessages } from '@/i18n';
import { DOTORI_PRICES } from '@/types/dotori';
import {
  buyHintUnlock,
  buySurnameLetter,
  getPurchasedHintTexts,
  hasSurnameLetterUnlock,
} from '@/lib/dotori-economy';
import { currentUserAtom, displayUserAtom } from '@/stores/atoms';

export function InvestigationPanel() {
  const t = useMessages();
  const target = useAtomValue(displayUserAtom);
  const setUser = useSetAtom(currentUserAtom);
  const [hints, setHints] = useState<string[]>(() =>
    getPurchasedHintTexts(target.id, target.surname),
  );
  const [letter, setLetter] = useState<string | null>(() =>
    hasSurnameLetterUnlock(target.id)
      ? target.surname.trim().charAt(0).toUpperCase()
      : null,
  );
  const [toast, setToast] = useState('');

  const showFail = (reason: string) => {
    const msg =
      reason === 'insufficient'
        ? t.dotori.spendFail.insufficient
        : reason === 'limit'
          ? t.dotori.spendFail.limit
          : t.dotori.spendFail.already_owned;
    setToast(msg);
    window.setTimeout(() => setToast(''), 2000);
  };

  const handleLetter = () => {
    const result = buySurnameLetter(target.id, target.surname);
    if (!result.ok) {
      showFail(result.reason);
      return;
    }
    setLetter(result.letter ?? null);
    setUser((u) => ({ ...u, dotoriBalance: result.balance }));
  };

  const handleHint = () => {
    const result = buyHintUnlock(target.id, target.surname);
    if (!result.ok) {
      showFail(result.reason);
      return;
    }
    setHints(getPurchasedHintTexts(target.id, target.surname));
    setUser((u) => ({ ...u, dotoriBalance: result.balance }));
  };

  return (
    <section className="cy-card cy-box-lemon shrink-0 p-2.5">
      <h3 className="mb-2 text-xs font-bold">{t.investigate.title}</h3>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={Boolean(letter)}
          onClick={handleLetter}
          className="cy-hard-btn rounded px-2 py-1 text-[10px] font-bold disabled:opacity-40"
        >
          {letter
            ? `${letter}… (${t.investigate.owned})`
            : t.investigate.surnameLetter(DOTORI_PRICES.surname_letter)}
        </button>
        <button
          type="button"
          disabled={hints.length >= 2}
          onClick={handleHint}
          className="cy-hard-btn rounded px-2 py-1 text-[10px] font-bold disabled:opacity-40"
        >
          {hints.length >= 2
            ? t.investigate.owned
            : t.investigate.hintUnlock(DOTORI_PRICES.hint_unlock)}
        </button>
      </div>
      {hints.length > 0 && (
        <ul className="mt-2 space-y-1 text-[10px] text-zinc-700">
          {hints.map((hint) => (
            <li key={hint}>
              {t.investigate.revealed} {hint}
            </li>
          ))}
        </ul>
      )}
      {toast && <p className="mt-1 text-[10px] text-red-600">{toast}</p>}
    </section>
  );
}
