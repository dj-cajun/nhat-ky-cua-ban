import { useEffect, useState } from 'react';
import { vi } from '@/i18n/vi';

const POMO_SECONDS = 25 * 60;

interface PomodoroOverlayProps {
  onClose: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function PomodoroOverlay({ onClose }: PomodoroOverlayProps) {
  const [remaining, setRemaining] = useState(POMO_SECONDS);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running || remaining <= 0) return;
    const id = window.setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          setRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running, remaining]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#bae1ff]/90 p-4 backdrop-blur-sm">
      <div className="cy-card relative w-full max-w-xs bg-[#fffdf5] p-6 text-center">
        <p className="mb-1 text-4xl" aria-hidden>
          ☁️
        </p>
        <h2 className="mb-1 text-sm font-extrabold text-[#2e2a25]">{vi.doodle.pomoTitle}</h2>
        <p className="mb-4 text-[10px] font-bold text-slate-500">{vi.doodle.pomoSubtitle}</p>
        <p className="mb-6 font-mono text-4xl font-extrabold tracking-wider text-[#2e2a25]">
          {formatTime(remaining)}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setRunning((r) => !r)}
            className="cy-hard-btn flex-1 rounded-xl bg-[#ffc6ff] py-2.5 text-xs font-extrabold"
          >
            {running ? vi.doodle.pomoPause : vi.doodle.pomoStart}
          </button>
          <button
            type="button"
            onClick={() => {
              setRemaining(POMO_SECONDS);
              setRunning(false);
            }}
            className="cy-hard-btn flex-1 rounded-xl bg-white py-2.5 text-xs font-extrabold"
          >
            {vi.doodle.pomoReset}
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 text-xs font-bold text-zinc-500 underline"
        >
          {vi.home.cancel}
        </button>
        {remaining === 0 && (
          <p className="mt-3 text-xs font-extrabold text-emerald-700">{vi.doodle.pomoDone}</p>
        )}
      </div>
    </div>
  );
}
