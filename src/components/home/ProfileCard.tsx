import { useEffect } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { db } from '@/lib/db';
import { pickAlbumPhoto } from '@/lib/photo-picker';
import { ensureProfileName, getProfileDisplayName } from '@/lib/profile-name';
import { isPlaceholderZaloName } from '@/lib/zalo-auth';
import { hasSurnameLetterUnlock } from '@/lib/dotori-economy';
import { vi } from '@/i18n/vi';
import { currentUserAtom, displayUserAtom, viewModeAtom } from '@/stores/atoms';
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

function MaskedName({ surname, firstLetter }: { surname: string; firstLetter?: string | null }) {
  return (
    <span className="cy-badge-pink inline-flex items-center gap-1.5 text-sm">
      <span>{vi.home.surnameLabel} {surname}</span>
      <span className="cy-name-mask" aria-hidden>
        {firstLetter ? `${firstLetter}…` : vi.home.nameHidden}
      </span>
    </span>
  );
}

export function ProfileCard() {
  const user = useAtomValue(displayUserAtom);
  const currentUser = useAtomValue(currentUserAtom);
  const setUser = useSetAtom(currentUserAtom);
  const viewMode = useAtomValue(viewModeAtom);
  const isStranger = viewMode === 'stranger';
  const myName = getProfileDisplayName(currentUser);
  const surnameLetter =
    isStranger && hasSurnameLetterUnlock(user.id)
      ? user.surname.trim().charAt(0).toUpperCase()
      : null;

  useEffect(() => {
    if (isStranger) return;
    if (currentUser.realName?.trim() && !isPlaceholderZaloName(currentUser.realName)) return;
    const repaired = ensureProfileName(currentUser);
    if (repaired.realName !== currentUser.realName) {
      setUser(repaired);
    }
  }, [currentUser, isStranger, setUser]);

  const handlePhotoPick = async () => {
    if (isStranger) return;
    const url = await pickAlbumPhoto();
    if (!url) return;
    const updated = db.updateProfile({ avatarUrl: url });
    if (updated) {
      setUser(updated);
    }
  };

  return (
    <section className="cy-card flex shrink-0 gap-3 p-2.5">
      {isStranger ? (
        <DetectiveSilhouette />
      ) : (
        <button
          type="button"
          onClick={() => void handlePhotoPick()}
          className="cy-avatar cy-avatar-editable"
          aria-label={vi.home.profilePhotoTap}
        >
          <ProfileAvatar avatarUrl={currentUser.avatarUrl} />
        </button>
      )}

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-1.5">
          {isStranger ? (
            <MaskedName surname={user.surname} firstLetter={surnameLetter} />
          ) : (
            <span className="cy-badge-pink text-sm font-bold text-black">
              {currentUser.badgeEmoji && (
                <span className="mr-1" aria-hidden>
                  {currentUser.badgeEmoji}
                </span>
              )}
              {myName}
            </span>
          )}
          <span className="font-mono text-[10px] text-zinc-600">
            {user.schoolName} {user.className}
          </span>
        </div>
        <p className="truncate text-xs italic text-zinc-700">&quot;{user.statusMessage}&quot;</p>
      </div>
    </section>
  );
}
