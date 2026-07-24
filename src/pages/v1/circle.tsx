import { useEffect, useMemo, useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import * as store from '@/lib/v1-store';
import {
  v1ActiveCircleIdAtom,
  v1DiaryOwnerIdAtom,
  v1PageAtom,
  v1ProfileAtom,
} from '@/stores/v1-atoms';

const SESSION_ID = crypto.randomUUID();

export function CirclePage() {
  const profile = useAtomValue(v1ProfileAtom);
  const circleId = useAtomValue(v1ActiveCircleIdAtom);
  const setPage = useSetAtom(v1PageAtom);
  const setDiaryOwner = useSetAtom(v1DiaryOwnerIdAtom);
  const [tick, setTick] = useState(0);

  const circle = circleId ? store.getCircle(circleId) : null;
  const members = circleId ? store.listCircleMembers(circleId) : [];
  const presence = useMemo(
    () => (circleId ? store.listActivePresence(circleId) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [circleId, tick],
  );
  const posts = useMemo(
    () => (circleId ? store.listActivePosts(circleId) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [circleId, tick],
  );
  const presenceIds = useMemo(() => new Set(presence.map((p) => p.userId)), [presence]);

  useEffect(() => {
    if (!circleId || !profile) return;
    store.heartbeatPresence(circleId, profile.id, SESSION_ID);
    const interval = setInterval(() => {
      store.heartbeatPresence(circleId, profile.id, SESSION_ID);
      setTick((n) => n + 1);
    }, 15_000);
    const onHide = () => {
      if (document.visibilityState === 'hidden') {
        store.clearPresence(circleId, profile.id);
      } else {
        store.heartbeatPresence(circleId, profile.id, SESSION_ID);
      }
    };
    document.addEventListener('visibilitychange', onHide);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onHide);
      store.clearPresence(circleId, profile.id);
    };
  }, [circleId, profile]);

  if (!profile || !circle || !circleId) {
    return (
      <div className="p-6 text-sm">
        서클을 찾을 수 없습니다.
        <button type="button" className="ml-2 underline" onClick={() => setPage('universe')}>
          돌아가기
        </button>
      </div>
    );
  }

  const activePost = posts[0];
  const responded = activePost ? store.hasResponded(activePost.id, profile.id) : false;

  return (
    <div className="mx-auto flex h-screen max-w-md flex-col bg-[#f7f4ef] px-4 py-5">
      <header className="mb-4 flex items-center gap-3">
        <button type="button" onClick={() => setPage('universe')} className="text-sm text-[#6b635c]">
          ← 우주
        </button>
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full text-white"
          style={{ backgroundColor: circle.color }}
        >
          {circle.symbol}
        </div>
        <div>
          <h1 className="text-lg font-semibold text-[#2f2a26]">{circle.name}</h1>
          <p className="text-xs text-[#8a8178]">
            멤버 {members.length} · 지금 {presence.length}명
          </p>
        </div>
      </header>

      {activePost && (
        <section className="mb-4 rounded-2xl border border-[#e4dcd2] bg-white p-4">
          <p className="text-xs text-[#7C9A8E]">
            {activePost.type === 'notice' ? '공지' : '투표'}
          </p>
          <h2 className="mt-1 text-sm font-semibold">{activePost.title}</h2>
          {activePost.body && <p className="mt-1 text-sm text-[#6b635c]">{activePost.body}</p>}
          {activePost.type === 'notice' && !responded && (
            <button
              type="button"
              className="mt-3 rounded-xl bg-[#2f2a26] px-3 py-2 text-xs text-white"
              onClick={() => {
                store.respondToPost(activePost.id, profile.id);
                setTick((n) => n + 1);
              }}
            >
              확인했어요
            </button>
          )}
          {responded && <p className="mt-3 text-xs text-[#b88b8b]">반응 완료 · 주홍 배지</p>}
        </section>
      )}

      <section className="min-h-0 flex-1 overflow-y-auto">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#8a8178]">멤버</h2>
        <div className="grid grid-cols-3 gap-3">
          {members.map((m) => {
            const person = store.getProfileById(m.userId);
            const online = presenceIds.has(m.userId);
            const orange = activePost ? store.hasResponded(activePost.id, m.userId) : false;
            return (
              <button
                key={m.userId}
                type="button"
                onClick={() => {
                  setDiaryOwner(m.userId);
                  setPage('diary');
                }}
                className="relative flex flex-col items-center rounded-2xl border border-[#ebe4da] bg-white p-3"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#efe8de] text-sm">
                  {(person?.displayName ?? '?').slice(0, 1)}
                </span>
                <span className="mt-2 max-w-full truncate text-xs text-[#2f2a26]">
                  {person?.displayName ?? '멤버'}
                </span>
                {m.isPioneer && (
                  <span className="mt-1 text-[9px] text-[#7C9A8E]">개척자</span>
                )}
                <span
                  className={`absolute right-2 top-2 h-2.5 w-2.5 rounded-full ${
                    orange ? 'bg-[#c45c3e]' : online ? 'bg-[#3f8f6b]' : 'bg-transparent'
                  }`}
                />
              </button>
            );
          })}
        </div>
      </section>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => setPage('circle-setup')}
          className="flex-1 rounded-2xl border border-[#d9d0c4] py-3 text-sm"
        >
          서클 설정
        </button>
        <button
          type="button"
          onClick={() => {
            const title = window.prompt('짧은 공지');
            if (!title) return;
            try {
              store.createNotice({
                circleId,
                createdBy: profile.id,
                title,
                closesAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              });
              setTick((n) => n + 1);
            } catch (e) {
              window.alert(e instanceof Error ? e.message : '실패');
            }
          }}
          className="flex-1 rounded-2xl bg-[#2f2a26] py-3 text-sm text-white"
        >
          공지 만들기
        </button>
      </div>
    </div>
  );
}
