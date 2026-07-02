import { useEffect, useRef, useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { vi } from '@/i18n/vi';
import { displayUserAtom, appPageAtom } from '@/stores/atoms';
import { TodayVisitorsPanel } from '@/components/home/TodayVisitorsPanel';

export function StatusBar() {
  const user = useAtomValue(displayUserAtom);
  const setPage = useSetAtom(appPageAtom);
  const [showTodayHints, setShowTodayHints] = useState(false);
  const todayMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showTodayHints) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!todayMenuRef.current?.contains(event.target as Node)) {
        setShowTodayHints(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [showTodayHints]);

  return (
    <div className="cy-card relative z-20 flex shrink-0 flex-col font-mono text-[11px]">
      <div className="flex items-center justify-between px-3 py-1.5">
        <div className="flex items-center gap-2 font-bold tracking-tight">
          <div ref={todayMenuRef} className="relative">
            <span>
              TODAY{' '}
              <button
                type="button"
                onClick={() => setShowTodayHints((open) => !open)}
                className={`cy-today-count inline-flex min-h-[28px] min-w-[28px] items-center justify-center rounded-sm px-1 text-sm font-bold underline decoration-dotted underline-offset-2 ${
                  showTodayHints ? 'cy-today-count--open' : ''
                }`}
                aria-label={vi.home.todayVisitorsTitle}
                aria-expanded={showTodayHints}
                aria-haspopup="menu"
              >
                {user.visitCountToday}
              </button>
            </span>

            {showTodayHints && <TodayVisitorsPanel />}
          </div>
          <span className="text-zinc-400">|</span>
          <span>
            TOTAL <strong className="text-sm">{user.visitCountTotal}</strong>
          </span>
        </div>
        <button
          type="button"
          onClick={() => setPage('dotori')}
          className="cy-badge-blue"
          aria-label={vi.status.dotoriAria}
        >
          <span className="text-[10px]">●</span>
          <strong>{user.dotoriBalance}</strong>
        </button>
      </div>
    </div>
  );
}
