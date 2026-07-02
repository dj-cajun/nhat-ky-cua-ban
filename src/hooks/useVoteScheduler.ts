import { useEffect } from 'react';
import { useSetAtom } from 'jotai';
import { db } from '@/lib/db';
import { isVoteHourVN, todayDateStr } from '@/lib/vote-service';
import {
  activeBoardAtom,
  showVoteOverlayAtom,
  voteLockAtom,
} from '@/stores/atoms';

async function sendVotePushNotification(): Promise<void> {
  try {
    const { requestSendNotification } = await import('zmp-sdk/apis');
    await requestSendNotification();
  } catch {
    // Zalo 환경 외 무시
  }
}

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
        const pushed = localStorage.getItem(`vote_push_${todayDateStr()}`);
        if (!pushed) {
          localStorage.setItem(`vote_push_${todayDateStr()}`, 'true');
          void sendVotePushNotification();
        }
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
      const today = todayDateStr();
      const notified = localStorage.getItem(`vote_notified_${today}`);
      if (notified) return;

      const forceDemo = new URLSearchParams(window.location.search).get('notify') === 'demo';

      const vnHour = parseInt(
        new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Ho_Chi_Minh',
          hour: 'numeric',
          hour12: false,
        }).format(new Date()),
        10,
      );

      if (!forceDemo && vnHour < 21) return;

      const profile = db.getProfile();
      if (!profile) return;

      const nominations = db.getNominations(profile.id, today);
      if (nominations.length === 0 && !forceDemo) return;

      const nomination = nominations[0];
      const hintText = nomination?.hintText ?? '키 170~175cm';

      localStorage.setItem(`vote_notified_${today}`, 'true');
      void import('@/lib/realtime').then(({ emitRealtime }) => {
        emitRealtime({
          type: 'vote_nomination',
          message: '누군가 당신을 지목했습니다.',
          hint: hintText,
        });
      });
    };

    check();
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, []);
}
