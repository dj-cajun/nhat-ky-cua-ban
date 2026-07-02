import { useAtomValue } from 'jotai';
import { displayUserAtom } from '@/stores/atoms';

export function StatusBar() {
  const user = useAtomValue(displayUserAtom);

  return (
    <header className="diary-border flex shrink-0 items-center justify-between rounded-lg px-3 py-2 text-xs font-medium">
      <div className="flex gap-3">
        <span>
          TODAY <strong className="text-sm">{user.visitCountToday}</strong>
        </span>
        <span className="text-slate-500">|</span>
        <span>
          TOTAL <strong className="text-sm">{user.visitCountTotal}</strong>
        </span>
      </div>
      <button
        type="button"
        className="diary-border flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5"
        aria-label="도토리 충전소"
      >
        <span>🌰</span>
        <strong className="text-sm">{user.dotoriBalance}</strong>
      </button>
    </header>
  );
}
