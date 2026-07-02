import { useAtomValue, useSetAtom } from 'jotai';
import { vi } from '@/i18n/vi';
import { displayUserAtom, appPageAtom } from '@/stores/atoms';

export function StatusBar() {
  const user = useAtomValue(displayUserAtom);
  const setPage = useSetAtom(appPageAtom);

  return (
    <header className="cy-card flex shrink-0 items-center justify-between px-3 py-1.5 font-mono text-[11px]">
      <div className="flex items-center gap-2 font-bold tracking-tight">
        <span>
          TODAY <strong className="text-sm">{user.visitCountToday}</strong>
        </span>
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
    </header>
  );
}
