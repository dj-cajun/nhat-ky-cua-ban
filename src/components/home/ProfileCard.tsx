import { useAtomValue } from 'jotai';
import { vi } from '@/i18n/vi';
import { displayUserAtom, viewModeAtom } from '@/stores/atoms';
import { ProfileAvatar } from './ProfileAvatar';

function DetectiveSilhouette() {
  return (
    <div className="cy-avatar" aria-hidden>
      <span className="text-3xl grayscale" title={vi.home.detective}>
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
    <section className="cy-card flex shrink-0 gap-3 p-2.5">
      {isStranger ? (
        <DetectiveSilhouette />
      ) : (
        <div className="cy-avatar">
          <ProfileAvatar />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-1.5">
          <span className="cy-badge-pink text-sm">
            {isStranger ? `Họ: ${user.surname}` : user.realName}
          </span>
          <span className="font-mono text-[10px] text-zinc-600">
            {user.schoolName} {user.className}
          </span>
        </div>
        <p className="truncate text-xs italic text-zinc-700">&quot;{user.statusMessage}&quot;</p>
      </div>
    </section>
  );
}
