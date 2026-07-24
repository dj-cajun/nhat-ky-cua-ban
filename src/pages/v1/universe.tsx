import { useMemo } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import * as store from '@/lib/v1-store';
import {
  v1ActiveCircleIdAtom,
  v1CirclesAtom,
  v1DiaryOwnerIdAtom,
  v1PageAtom,
  v1ProfileAtom,
} from '@/stores/v1-atoms';
import { listActivePosts, listActivePresence, listCircleMembers } from '@/lib/v1-store';

export function UniversePage() {
  const profile = useAtomValue(v1ProfileAtom);
  const circles = useAtomValue(v1CirclesAtom);
  const setPage = useSetAtom(v1PageAtom);
  const setCircleId = useSetAtom(v1ActiveCircleIdAtom);
  const setDiaryOwner = useSetAtom(v1DiaryOwnerIdAtom);
  const pendingInvites = profile ? store.listPendingInvitesFor(profile.id) : [];

  const cards = useMemo(() => {
    return circles.map((circle) => {
      const members = listCircleMembers(circle.id);
      const presence = listActivePresence(circle.id);
      const posts = listActivePosts(circle.id);
      const today = new Date().toISOString().slice(0, 10);
      const wroteToday = members.filter((m) => store.getDiaryEntry(m.userId, today)).length;
      return { circle, members, presence, posts, wroteToday };
    });
  }, [circles]);

  if (!profile) return null;

  return (
    <div className="mx-auto flex h-screen max-w-md flex-col bg-[#f3efe8] px-4 py-5">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-[#7C9A8E]">내 우주</p>
          <h1 className="text-xl font-semibold text-[#2f2a26]">관계의 지도</h1>
        </div>
        <button
          type="button"
          onClick={() => {
            setDiaryOwner(profile.id);
            setPage('diary');
          }}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2f2a26] text-sm text-white"
          aria-label="내 다이어리"
        >
          {profile.displayName.slice(0, 1)}
        </button>
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center">
        <button
          type="button"
          onClick={() => {
            setDiaryOwner(profile.id);
            setPage('diary');
          }}
          className="z-10 flex h-28 w-28 flex-col items-center justify-center rounded-full border-2 border-[#cfc4b6] bg-white shadow-sm"
        >
          <span className="text-2xl">{profile.displayName.slice(0, 1)}</span>
          <span className="mt-1 text-xs text-[#6b635c]">{profile.displayName}</span>
        </button>

        <div className="absolute inset-0 flex flex-wrap content-between justify-between gap-3 p-2 pt-8">
          {cards.map(({ circle, presence, posts, wroteToday }, index) => {
            const angle = (index / Math.max(cards.length, 1)) * Math.PI * 2;
            const style =
              cards.length === 0
                ? undefined
                : ({
                    position: 'absolute' as const,
                    left: `${50 + Math.cos(angle) * 34}%`,
                    top: `${48 + Math.sin(angle) * 32}%`,
                    transform: 'translate(-50%, -50%)',
                  } as const);
            return (
              <button
                key={circle.id}
                type="button"
                style={style}
                onClick={() => {
                  setCircleId(circle.id);
                  setPage('circle');
                }}
                className={`flex h-24 w-24 flex-col items-center justify-center rounded-full border-2 text-center ${
                  presence.length > 0 ? 'animate-pulse border-[#7C9A8E]' : 'border-transparent'
                }`}
              >
                <span
                  className="flex h-20 w-20 flex-col items-center justify-center rounded-full text-white shadow"
                  style={{ backgroundColor: circle.color }}
                >
                  <span className="text-lg">{circle.symbol}</span>
                  <span className="mt-0.5 max-w-[4.5rem] truncate text-[10px]">{circle.name}</span>
                  <span className="text-[9px] opacity-90">오늘 {wroteToday}명</span>
                  {posts[0] && <span className="text-[9px]">공지</span>}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {pendingInvites.length > 0 && (
          <button
            type="button"
            onClick={() => setPage('invites')}
            className="w-full rounded-2xl border border-[#c4a484] bg-[#fff8f0] px-4 py-3 text-left text-sm"
          >
            개척 초대 {pendingInvites.length}건 대기 중
          </button>
        )}
        <button
          type="button"
          onClick={() => setPage('circle-create')}
          className="w-full rounded-2xl border border-[#d9d0c4] bg-white py-3 text-sm text-[#2f2a26]"
        >
          서클 만들기 (친구 2명과 함께)
        </button>
      </div>
    </div>
  );
}
