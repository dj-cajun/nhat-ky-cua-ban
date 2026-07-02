import { useMemo, useState } from 'react';
import { useSetAtom } from 'jotai';
import type { HintShield } from '@/types';
import { db } from '@/lib/db';
import { formatHintShield } from '@/lib/hint-crypto';
import { getDecryptedHint } from '@/lib/supabase-sync';
import { todayDateStr } from '@/lib/vote-service';
import { generateVoteQuestions, HINT_SHIELD_OPTIONS } from '@/lib/vote-service';
import { vi } from '@/i18n/vi';
import { voteLockAtom, showVoteOverlayAtom } from '@/stores/atoms';

export function VoteLockOverlay() {
  const setVoteLock = useSetAtom(voteLockAtom);
  const setShowVote = useSetAtom(showVoteOverlayAtom);
  const questions = useMemo(() => generateVoteQuestions(), []);

  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [shield, setShield] = useState<HintShield | null>(null);
  const [phase, setPhase] = useState<'vote' | 'shield'>('vote');

  const current = questions[step];
  const total = 12;

  const submitAnswer = () => {
    if (!selected || !current) return;

    if (phase === 'vote') {
      setPhase('shield');
      return;
    }

    if (!shield) return;

    const profile = db.getProfile();
    const hint = getDecryptedHint();
    const hintText =
      hint && profile
        ? formatHintShield(shield, hint, profile.surname)
        : shield;

    db.saveVote({
      questionIndex: current.index,
      selectedUserId: selected,
      hintShield: shield,
      date: todayDateStr(),
    });

    if (profile) {
      db.addNomination({
        targetUserId: selected,
        voterId: profile.id,
        hintShield: shield,
        hintText,
        date: todayDateStr(),
      });
    }

    if (step < total - 1) {
      setStep((s) => s + 1);
      setSelected(null);
      setShield(null);
      setPhase('vote');
    } else {
      setVoteLock(false);
      setShowVote(false);
    }
  };

  if (!current) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="diary-panel flex max-h-[90vh] w-full max-w-sm flex-col p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold">{vi.vote.title}</h2>
          <span className="text-xs text-slate-500">
            {step + 1} / {total}
          </span>
        </div>

        <p className="mb-4 text-sm font-medium">{current.text}</p>

        {phase === 'vote' ? (
          <div className="mb-4 space-y-2 overflow-y-auto">
            {current.options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelected(opt.id)}
                className={`diary-border w-full rounded-lg px-3 py-3 text-left text-sm ${
                  selected === opt.id ? 'bg-amber-100 font-bold' : 'bg-white'
                }`}
              >
                {opt.name}
              </button>
            ))}
          </div>
        ) : (
          <div className="mb-4 space-y-2">
            <p className="text-xs text-slate-600">{vi.vote.shieldPick}</p>
            {HINT_SHIELD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setShield(opt.value)}
                className={`diary-border w-full rounded-lg px-3 py-2 text-left text-sm ${
                  shield === opt.value ? 'bg-amber-100 font-bold' : 'bg-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          disabled={phase === 'vote' ? !selected : !shield}
          onClick={submitAnswer}
          className="diary-border rounded-lg bg-slate-800 py-3 text-sm font-bold text-white disabled:opacity-40"
        >
          {step < total - 1 || phase === 'vote' ? vi.vote.next : vi.vote.done}
        </button>

        <p className="mt-2 text-center text-[10px] text-slate-400">
          {vi.vote.lockNote}
        </p>
      </div>
    </div>
  );
}
