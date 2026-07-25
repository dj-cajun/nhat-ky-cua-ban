import { useEffect, useRef, useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { vi } from '@/i18n/vi';
import { getUnopenedGiftCount } from '@/lib/dotori-economy';
import { currentUserAtom, appPageAtom } from '@/stores/atoms';
import { GiftInbox } from '@/components/dotori/GiftInbox';
import { TodayVisitorsPanel } from '@/components/home/TodayVisitorsPanel';

export function StatusBar() {
  const user = useAtomValue(currentUserAtom);
  const setPage = useSetAtom(appPageAtom);
  const [showTodayHints, setShowTodayHints] = useState(false);
  const [showGifts, setShowGifts] = useState(false);
  const [giftCount, setGiftCount] = useState(getUnopenedGiftCount());
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
    <>
      <div className="cy-card cy-box-sky relative z-20 flex shrink-0 flex-col font-doodle text-[11px]">
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
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => setShowGifts(true)}
              className="cy-status-btn cy-status-btn--gift"
              aria-label={vi.status.giftAria}
            >
              {vi.status.giftBtn}
              {giftCount > 0 && <span className="cy-status-btn-count">{giftCount}</span>}
            </button>
            <button
              type="button"
              onClick={() => setPage('dotori')}
              className="cy-status-btn cy-status-btn--dotori"
              aria-label={vi.status.dotoriAria}
            >
              {vi.status.dotoriBtn}
              <span className="cy-status-btn-count">{user.dotoriBalance}</span>
            </button>
          </div>
        </div>
      </div>
      {showGifts && (
        <GiftInbox
          onClose={() => {
            setShowGifts(false);
            setGiftCount(getUnopenedGiftCount());
          }}
        />
      )}
    </>
  );
}
