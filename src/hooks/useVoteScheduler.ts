import { useEffect } from 'react';
import { useSetAtom } from 'jotai';
import { db } from '@/lib/db';
import { isVoteHourVN, todayDateStr } from '@/lib/vote-service';
import {
  activeBoardAtom,
  showVoteOverlayAtom,
  voteLockAtom,
} from '@/stores/atoms';

/** 17:00 VN 투표 Lock 스케줄러 */
export function useVoteScheduler(): void {
  const setVoteLock = useSetAtom(voteLockAtom);
  const setShowVote = useSetAtom(showVoteOverlayAtom);
  const setActiveBoard = useSetAtom(activeBoardAtom);

  useEffect(() => {
    const check = () => {
      const forceDemo =
        new URLSearchParams(window.location.search).get('vote') === 'demo' ||
        localStorage.getItem('vote_demo') === 'true';

      const shouldLock = (isVoteHourVN() || forceDemo) && !db.isVoteComplete();

      if (shouldLock) {
        setVoteLock(true);
        setShowVote(true);
        setActiveBoard('vote');
      } else if (!forceDemo) {
        setVoteLock(false);
      }
    };

    check();
    const interval = setInterval(check, 30_000);
    return () => clearInterval(interval);
  }, [setVoteLock, setShowVote, setActiveBoard]);
}

/** 21:00 지목 알림 체크 */
export function useVoteNotifications(): void {
  useEffect(() => {
    const check = () => {
      const votes = db.getVotes().filter((v) => v.date === todayDateStr());
      const notified = localStorage.getItem(`vote_notified_${todayDateStr()}`);
      if (notified) return;

      const vnHour = parseInt(
        new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Ho_Chi_Minh',
          hour: 'numeric',
          hour12: false,
        }).format(new Date()),
        10,
      );

      if (vnHour >= 21 && votes.length > 0) {
        const profile = db.getProfile();
        if (!profile) return;

        const nominated = votes.find((v) => v.selectedUserId === profile.id);
        if (nominated) {
          localStorage.setItem(`vote_notified_${todayDateStr()}`, 'true');
          void import('@/lib/realtime').then(({ emitRealtime }) => {
            emitRealtime({
              type: 'vote_nomination',
              message: '누군가 당신을 지목했습니다!',
              hint: nominated.hintShield,
            });
          });
        }
      }
    };

    check();
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, []);
}
