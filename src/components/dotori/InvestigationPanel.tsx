import { useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { vi } from '@/i18n/vi';
import { DOTORI_PRICES } from '@/types/dotori';
import {
  buyHintUnlock,
  buySurnameLetter,
  getPurchasedHintTexts,
  hasSurnameLetterUnlock,
} from '@/lib/dotori-economy';
import { currentUserAtom, displayUserAtom } from '@/stores/atoms';

export function InvestigationPanel() {
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
        ? vi.dotori.spendFail.insufficient
        : reason === 'limit'
          ? vi.dotori.spendFail.limit
          : vi.dotori.spendFail.already_owned;
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
    <section className="cy-card shrink-0 p-2.5">
      <h3 className="mb-2 text-xs font-bold">{vi.investigate.title}</h3>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={Boolean(letter)}
          onClick={handleLetter}
          className="cy-hard-btn rounded px-2 py-1 text-[10px] font-bold disabled:opacity-40"
        >
          {letter
            ? `${letter}… (${vi.investigate.owned})`
            : vi.investigate.surnameLetter(DOTORI_PRICES.surname_letter)}
        </button>
        <button
          type="button"
          disabled={hints.length >= 2}
          onClick={handleHint}
          className="cy-hard-btn rounded px-2 py-1 text-[10px] font-bold disabled:opacity-40"
        >
          {hints.length >= 2
            ? vi.investigate.owned
            : vi.investigate.hintUnlock(DOTORI_PRICES.hint_unlock)}
        </button>
      </div>
      {hints.length > 0 && (
        <ul className="mt-2 space-y-1 text-[10px] text-zinc-700">
          {hints.map((hint) => (
            <li key={hint}>
              {vi.investigate.revealed} {hint}
            </li>
          ))}
        </ul>
      )}
      {toast && <p className="mt-1 text-[10px] text-red-600">{toast}</p>}
    </section>
  );
}
