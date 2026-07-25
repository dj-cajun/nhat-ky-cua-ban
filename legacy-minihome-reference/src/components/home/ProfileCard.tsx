import { useEffect, useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { db } from '@/lib/db';
import { pickAlbumPhoto } from '@/lib/photo-picker';
import { assertCleanText } from '@/lib/profanity-shield';
import { ensureProfileName, getProfileDisplayName } from '@/lib/profile-name';
import { isPlaceholderZaloName } from '@/lib/zalo-auth';
import { hasSurnameLetterUnlock } from '@/lib/dotori-economy';
import { isSurnameBlurred } from '@/lib/local-db';
import { vi } from '@/i18n/vi';
import { MAX_STATUS_MESSAGE_CHARS } from '@/types';
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
      <span className="cy-badge-pink inline-flex items-center gap-1.5 text-sm">
        <span>{vi.home.surnameLabel}</span>
        <span className="cy-name-mask" aria-hidden>
          {vi.home.nameHidden}
        </span>
      </span>
    );
  }
  return (
    <span className="cy-badge-pink inline-flex items-center gap-1.5 text-sm">
      <span>{vi.home.surnameLabel} {surname}</span>
      <span className="cy-name-mask" aria-hidden>
        {firstLetter ? `${firstLetter}…` : vi.home.nameHidden}
      </span>
    </span>
  );
}

function TodayMeBlock({
  message,
  editable,
  onSave,
}: {
  message: string;
  editable: boolean;
  onSave?: (next: string) => { ok: true } | { ok: false; message: string };
}) {
  const [draft, setDraft] = useState(message);
  const [error, setError] = useState('');

  useEffect(() => {
    setDraft(message);
    setError('');
  }, [message]);

  const commit = () => {
    if (!editable || !onSave) return;
    const trimmed = draft.trim();
    if (trimmed === message) {
      setError('');
      return;
    }
    const result = onSave(trimmed);
    if (!result.ok) {
      setError(result.message);
      setDraft(message);
      return;
    }
    setError('');
  };

  return (
    <div className="cy-today-me">
      <p className="cy-today-me-label">{vi.home.todayMeLabel}</p>
      {editable ? (
        <>
          <input
            type="text"
            value={draft}
            maxLength={MAX_STATUS_MESSAGE_CHARS}
            onChange={(e) => {
              setDraft(e.target.value);
              setError('');
            }}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.currentTarget.blur();
              }
            }}
            placeholder={vi.home.todayMePlaceholder}
            className="cy-today-me-input"
            aria-label={vi.home.todayMeLabel}
          />
          {error && <p className="text-[10px] text-red-600">{error}</p>}
        </>
      ) : (
        <p className="cy-today-me-text">
          {message.trim() || vi.home.todayMePlaceholder}
        </p>
      )}
    </div>
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

  const saveStatusMessage = (next: string): { ok: true } | { ok: false; message: string } => {
    const check = assertCleanText(next);
    if (!check.ok) return check;
    const updated = db.updateProfile({ statusMessage: next });
    if (updated) {
      setUser(updated);
    }
    return { ok: true };
  };

  return (
    <section className="cy-card cy-box-blush flex shrink-0 gap-3 p-2.5">
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
            <MaskedName
              surname={user.surname}
              firstLetter={surnameLetter}
              fullyHidden={isSurnameBlurred(user)}
            />
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
        <TodayMeBlock
          message={user.statusMessage}
          editable={!isStranger}
          onSave={saveStatusMessage}
        />
      </div>
    </section>
  );
}
