import { useAtomValue } from 'jotai';
import { displayUserAtom, viewModeAtom } from '@/stores/atoms';

function DetectiveSilhouette() {
  return (
    <div
      className="diary-border flex h-14 w-14 items-center justify-center rounded-md bg-slate-200"
      aria-hidden
    >
      <span className="text-2xl grayscale" title="탐정 실루엣">
        🕵️
      </span>
    </div>
  );
}

export function ProfileCard() {
  const user = useAtomValue(displayUserAtom);
  const viewMode = useAtomValue(viewModeAtom);
  const isStranger = viewMode === 'stranger';

  return (
    <section className="diary-panel flex shrink-0 gap-3 p-3">
      {isStranger ? (
        <DetectiveSilhouette />
      ) : (
        <div className="diary-border flex h-14 w-14 items-center justify-center rounded-md bg-white text-2xl">
          👤
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className="diary-border rounded px-2 py-0.5 text-xs font-bold">
            {isStranger ? `Họ: ${user.surname}` : user.realName}
          </span>
          <span className="text-xs text-slate-600">
            {user.schoolName} {user.className}
          </span>
        </div>
        <p className="truncate text-sm italic text-slate-700">&quot;{user.statusMessage}&quot;</p>
      </div>
    </section>
  );
}
