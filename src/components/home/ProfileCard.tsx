import { useEffect } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { db } from '@/lib/db';
import { pickAlbumPhoto } from '@/lib/photo-picker';
import { ensureProfileName, getProfileDisplayName } from '@/lib/profile-name';
import { isPlaceholderZaloName } from '@/lib/zalo-auth';
import { hasSurnameLetterUnlock } from '@/lib/dotori-economy';
import { isSurnameBlurred } from '@/lib/local-db';
import { vi } from '@/i18n/vi';
import { currentUserAtom, displayUserAtom, viewModeAtom } from '@/stores/atoms';
import { stickerSlotAtom } from '@/stores/stickerStore';
import { ProfileAvatar } from './ProfileAvatar';

function DetectiveSilhouette() {
  return (
    <div className="cy-doodle-avatar bg-slate-100" aria-hidden>
      <span className="text-xl text-slate-400" title={vi.home.detective}>
        🕵️
      </span>
    </div>
  );
}

function MaskedName({
  surname,
  firstLetter,
  fullyHidden,
}: {
  surname: string;
  firstLetter?: string | null;
  fullyHidden?: boolean;
}) {
  if (fullyHidden) {
    return (
      <span className="cy-badge-pink inline-flex items-center gap-1.5 text-[10px]">
        <span>{vi.home.surnameLabel}</span>
        <span className="cy-name-mask" aria-hidden>
          {vi.home.nameHidden}
        </span>
      </span>
    );
  }
  return (
    <span className="cy-badge-pink inline-flex items-center gap-1.5 text-[10px]">
      <span>
        {vi.home.surnameLabel} {surname}
      </span>
      <span className="cy-name-mask" aria-hidden>
        {firstLetter ? `${firstLetter}…` : vi.home.nameHidden}
      </span>
    </span>
  );
}

interface ProfileCardProps {
  onOpenStickerShop?: () => void;
}

export function ProfileCard({ onOpenStickerShop }: ProfileCardProps) {
  const user = useAtomValue(displayUserAtom);
  const currentUser = useAtomValue(currentUserAtom);
  const setUser = useSetAtom(currentUserAtom);
  const viewMode = useAtomValue(viewModeAtom);
  const [stickers, setStickers] = useAtom(stickerSlotAtom);
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

  const handleSlotA = () => {
    if (isStranger) return;
    if (stickers.slotA) {
      setStickers((prev) => ({ ...prev, slotA: '' }));
      return;
    }
    onOpenStickerShop?.();
  };

  return (
    <section className="cy-card relative shrink-0 bg-[#fffef0] p-3">
      {!isStranger && !stickers.slotA && (
        <button
          type="button"
          onClick={() => onOpenStickerShop?.()}
          className="absolute -left-1 -top-3 z-20 flex h-7 w-7 items-center justify-center rounded-full border-2 border-dashed border-[#2e2a25]/40 bg-white/80 text-xs opacity-70"
          aria-label={vi.doodle.slotProfile}
        >
          +
        </button>
      )}
      {!isStranger && stickers.slotA && (
        <button
          type="button"
          onClick={handleSlotA}
          className="cy-doodle-sticker-slot cy-doodle-sticker-slot--bounce -left-1 -top-3"
          aria-label={vi.doodle.remove}
        >
          {stickers.slotA}
        </button>
      )}

      <div className="flex items-center gap-3">
        {isStranger ? (
          <DetectiveSilhouette />
        ) : (
          <button
            type="button"
            onClick={() => void handlePhotoPick()}
            className="cy-doodle-avatar cy-avatar-editable overflow-hidden"
            aria-label={vi.home.profilePhotoTap}
          >
            <ProfileAvatar avatarUrl={currentUser.avatarUrl} />
          </button>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {isStranger ? (
              <MaskedName
                surname={user.surname}
                firstLetter={surnameLetter}
                fullyHidden={isSurnameBlurred(user)}
              />
            ) : (
              <span className="cy-badge-pink text-[10px] font-black">
                {currentUser.badgeEmoji && (
                  <span className="mr-1" aria-hidden>
                    {currentUser.badgeEmoji}
                  </span>
                )}
                {myName}
              </span>
            )}
            <span className="text-[8px] font-bold text-slate-400">
              {user.schoolName} {user.className}
            </span>
          </div>
          <p className="mt-1 truncate text-[9px] font-bold italic leading-normal text-slate-600">
            &quot;{user.statusMessage}&quot;
          </p>
        </div>
      </div>
    </section>
  );
}
