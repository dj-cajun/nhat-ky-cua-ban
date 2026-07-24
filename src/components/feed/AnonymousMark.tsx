import { useSetAtom } from 'jotai';
import type { FeedPost } from '@/types';
import { db } from '@/lib/db';
import { showInterstitialAd } from '@/lib/zalo-ads';
import { useMessages } from '@/i18n';
import { strangerUserAtom, viewModeAtom, strangerHostIdAtom } from '@/stores/atoms';

type AnonymousMarkProps = {
  post: FeedPost;
  disabled?: boolean;
  onWarp?: () => void;
};

export function AnonymousMark({ post, disabled, onWarp }: AnonymousMarkProps) {
  const t = useMessages();
  const setViewMode = useSetAtom(viewModeAtom);
  const setStrangerUser = useSetAtom(strangerUserAtom);
  const setHostId = useSetAtom(strangerHostIdAtom);

  const handleWarp = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;

    const classmate = db.getClassmateById(post.authorId);
    if (!classmate) return;

    await showInterstitialAd();
    setStrangerUser(classmate);
    setHostId(post.authorId);
    setViewMode('stranger');
    onWarp?.();
  };

  return (
    <button
      type="button"
      onClick={(e) => void handleWarp(e)}
      disabled={disabled}
      className="shrink-0 leading-none disabled:opacity-40"
      aria-label={t.home.anonymous}
    >
      {t.home.anonymousMark}
    </button>
  );
}
