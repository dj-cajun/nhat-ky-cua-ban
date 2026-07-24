import { useMemo, useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import * as store from '@/lib/v1-store';
import {
  v1ActiveCircleIdAtom,
  v1ActiveJoinRequestIdAtom,
  v1ActiveRecommendationIdAtom,
  v1PageAtom,
  v1ProfileAtom,
} from '@/stores/v1-atoms';
import { CIRCLE_JOIN_RECOMMENDATION_COUNT } from '@/types/circle';

export function CircleJoinPage() {
  const profile = useAtomValue(v1ProfileAtom);
  const circleId = useAtomValue(v1ActiveCircleIdAtom);
  const setPage = useSetAtom(v1PageAtom);
  const setProfile = useSetAtom(v1ProfileAtom);
  const setRequestId = useSetAtom(v1ActiveJoinRequestIdAtom);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);

  const preview = circleId && profile ? store.getCircleInvitePreview(circleId, profile.id) : null;
  const picker = useMemo(() => {
    if (!circleId || !profile) return [];
    return store.listMemberProfilesForJoinPicker(circleId, profile.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [circleId, profile, tick]);

  if (!profile || !circleId || !preview) {
    return (
      <div className="p-6 text-sm">
        초대 정보를 찾을 수 없습니다.
        <button type="button" className="ml-2 underline" onClick={() => setPage('universe')}>
          돌아가기
        </button>
      </div>
    );
  }

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= CIRCLE_JOIN_RECOMMENDATION_COUNT) return prev;
      return [...prev, id];
    });
  };

  const submit = () => {
    setError('');
    try {
      const req = store.requestJoin(circleId, profile.id, selected);
      setRequestId(req.id);
      setPage('join-status');
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류');
    }
  };

  const becomeYujin = () => {
    store.ensureDemoDirectory(profile.id);
    store.demoAddMember(circleId, 'demo-friend-c');
    const yujin = store.switchDemoSession('demo-applicant-yujin');
    setProfile(yujin);
    setSelected([]);
    setTick((n) => n + 1);
  };

  return (
    <div className="mx-auto flex h-screen max-w-md flex-col bg-[#f7f4ef] px-4 py-5">
      <button type="button" className="mb-3 text-sm text-[#6b635c]" onClick={() => setPage('circle')}>
        ← 뒤로
      </button>
      <div className="mb-4 flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full text-white"
          style={{ backgroundColor: preview.color }}
        >
          {preview.symbol}
        </div>
        <div>
          <h1 className="text-xl font-semibold text-[#2f2a26]">{preview.name}</h1>
          <p className="text-xs text-[#8a8178]">{preview.memberCount}명</p>
        </div>
      </div>
      <p className="mb-4 text-sm leading-relaxed text-[#2f2a26]">
        3명의 추천이 있어야 들어갈 수 있어요
      </p>

      {preview.isMember ? (
        <button
          type="button"
          className="rounded-2xl bg-[#2f2a26] px-4 py-3 text-sm text-white"
          onClick={() => setPage('circle')}
        >
          이미 멤버입니다 · 서클 열기
        </button>
      ) : (
        <>
          <p className="mb-2 text-xs text-[#7C9A8E]">
            나를 아는 멤버 {selected.length}/{CIRCLE_JOIN_RECOMMENDATION_COUNT}
          </p>
          <div className="flex flex-wrap gap-2">
            {picker.map((p) => {
              const on = selected.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggle(p.id)}
                  className={`rounded-xl border px-3 py-2 text-sm ${
                    on ? 'border-[#2f2a26] bg-[#2f2a26] text-white' : 'border-[#e4dcd2] bg-white'
                  }`}
                >
                  {p.displayName}
                </button>
              );
            })}
          </div>
          {error ? <p className="mt-3 text-sm text-[#b45353]">{error}</p> : null}
          <button
            type="button"
            disabled={selected.length !== CIRCLE_JOIN_RECOMMENDATION_COUNT}
            onClick={submit}
            className="mt-5 rounded-2xl bg-[#2f2a26] px-4 py-3 text-sm text-white disabled:opacity-40"
          >
            가입 신청
          </button>
        </>
      )}

      <button type="button" onClick={becomeYujin} className="mt-6 text-xs text-[#8a8178] underline">
        데모: 유진으로 가입 신청
      </button>
    </div>
  );
}

export function JoinStatusPage() {
  const profile = useAtomValue(v1ProfileAtom);
  const requestId = useAtomValue(v1ActiveJoinRequestIdAtom);
  const setPage = useSetAtom(v1PageAtom);
  const setCircleId = useSetAtom(v1ActiveCircleIdAtom);
  const [tick, setTick] = useState(0);

  if (!profile || !requestId) {
    return (
      <div className="p-6 text-sm">
        신청을 찾을 수 없습니다.
        <button type="button" className="ml-2 underline" onClick={() => setPage('universe')}>
          우주로
        </button>
      </div>
    );
  }

  let progress: ReturnType<typeof store.getJoinProgress> | null = null;
  try {
    progress = store.getJoinProgress(requestId, profile.id);
  } catch {
    progress = null;
  }
  void tick;

  if (!progress) {
    return <div className="p-6 text-sm">신청 상태를 불러올 수 없습니다.</div>;
  }

  const label =
    progress.status === 'approved'
      ? '가입 완료'
      : progress.status === 'cancelled' || progress.status === 'expired'
        ? '요청 종료'
        : `추천 요청 중 · ${progress.recommended}/${progress.total}`;

  return (
    <div className="mx-auto flex h-screen max-w-md flex-col bg-[#f7f4ef] px-4 py-5">
      <button type="button" className="mb-3 text-sm text-[#6b635c]" onClick={() => setPage('universe')}>
        ← 우주
      </button>
      <h1 className="text-xl font-semibold text-[#2f2a26]">{label}</h1>
      {progress.status === 'pending' ? (
        <p className="mt-2 text-sm text-[#6b635c]">
          현재 {progress.recommended}/{progress.total}명이 추천했어요
        </p>
      ) : null}
      <button
        type="button"
        className="mt-4 rounded-xl border border-[#e4dcd2] bg-white px-4 py-3 text-sm"
        onClick={() => setTick((n) => n + 1)}
      >
        상태 새로고침
      </button>
      {progress.status === 'pending' ? (
        <button
          type="button"
          className="mt-2 text-sm text-[#b45353]"
          onClick={() => {
            store.cancelJoinRequest(requestId, profile.id);
            setTick((n) => n + 1);
          }}
        >
          요청 취소
        </button>
      ) : null}
      {progress.status === 'approved' ? (
        <button
          type="button"
          className="mt-4 rounded-2xl bg-[#2f2a26] px-4 py-3 text-sm text-white"
          onClick={() => {
            setCircleId(progress.circleId);
            setPage('circle');
          }}
        >
          서클 들어가기
        </button>
      ) : null}
    </div>
  );
}

export function RecommendationsPage() {
  const profile = useAtomValue(v1ProfileAtom);
  const setPage = useSetAtom(v1PageAtom);
  const setRecId = useSetAtom(v1ActiveRecommendationIdAtom);
  const items = profile ? store.listMyRecommendations(profile.id) : [];

  return (
    <div className="mx-auto flex h-screen max-w-md flex-col bg-[#f7f4ef] px-4 py-5">
      <button type="button" className="mb-3 text-sm text-[#6b635c]" onClick={() => setPage('universe')}>
        ← 우주
      </button>
      <h1 className="mb-4 text-xl font-semibold text-[#2f2a26]">추천 요청</h1>
      {items.length === 0 ? (
        <p className="text-sm text-[#8a8178]">대기 중인 추천이 없습니다.</p>
      ) : (
        items.map((item) => {
          const reqs = JSON.parse(localStorage.getItem('v1_circle_join_requests') || '[]') as {
            id: string;
            applicantId: string;
            circleId: string;
          }[];
          const req = reqs.find((r) => r.id === item.joinRequestId);
          const profiles = JSON.parse(localStorage.getItem('v1_profiles_directory') || '[]') as {
            id: string;
            displayName: string;
          }[];
          const applicant = profiles.find((p) => p.id === req?.applicantId);
          const circle = req ? store.getCircle(req.circleId) : null;
          return (
            <button
              key={item.id}
              type="button"
              className="mb-2 w-full rounded-2xl border border-[#e4dcd2] bg-white px-4 py-3 text-left"
              onClick={() => {
                setRecId(item.id);
                setPage('recommendation-detail');
              }}
            >
              <p className="font-medium text-[#2f2a26]">{applicant?.displayName ?? '신청자'}</p>
              <p className="text-xs text-[#8a8178]">{circle?.name}</p>
            </button>
          );
        })
      )}
    </div>
  );
}

export function RecommendationDetailPage() {
  const profile = useAtomValue(v1ProfileAtom);
  const recId = useAtomValue(v1ActiveRecommendationIdAtom);
  const setPage = useSetAtom(v1PageAtom);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const allRecs = JSON.parse(localStorage.getItem('v1_circle_recommendations') || '[]') as {
    id: string;
    joinRequestId: string;
    recommenderId: string;
    status: string;
  }[];
  const item = allRecs.find((r) => r.id === recId && r.recommenderId === profile?.id);

  const reqs = JSON.parse(localStorage.getItem('v1_circle_join_requests') || '[]') as {
    id: string;
    applicantId: string;
    circleId: string;
  }[];
  const req = item ? reqs.find((r) => r.id === item.joinRequestId) : null;
  const profiles = JSON.parse(localStorage.getItem('v1_profiles_directory') || '[]') as {
    id: string;
    displayName: string;
  }[];
  const applicant = profiles.find((p) => p.id === req?.applicantId);
  const circle = req ? store.getCircle(req.circleId) : null;

  const respond = (decision: 'recommended' | 'unknown') => {
    if (!profile || !recId) return;
    setError('');
    try {
      store.respondRecommendation(recId, profile.id, decision);
      setMessage('저장했습니다. 신청자에게는 선택이 공개되지 않습니다.');
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류');
    }
  };

  return (
    <div className="mx-auto flex h-screen max-w-md flex-col bg-[#f7f4ef] px-4 py-5">
      <button
        type="button"
        className="mb-3 text-sm text-[#6b635c]"
        onClick={() => setPage('recommendations')}
      >
        ← 목록
      </button>
      <h1 className="text-xl font-semibold text-[#2f2a26]">{applicant?.displayName ?? '신청자'}</h1>
      <p className="mt-1 text-xs text-[#8a8178]">{circle?.name}</p>
      <p className="mt-6 text-sm leading-relaxed text-[#2f2a26]">
        이 사람을 실제로 알고 있으며, 이 서클에 함께 있어도 괜찮나요?
      </p>
      {message || item?.status !== 'pending' ? (
        <p className="mt-4 text-sm text-[#6b635c]">
          {message || '저장했습니다. 신청자에게는 선택이 공개되지 않습니다.'}
        </p>
      ) : (
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            className="rounded-2xl bg-[#2f2a26] px-4 py-3 text-sm text-white"
            onClick={() => respond('recommended')}
          >
            추천하기
          </button>
          <button
            type="button"
            className="rounded-2xl border border-[#e4dcd2] bg-white px-4 py-3 text-sm"
            onClick={() => respond('unknown')}
          >
            잘 모르겠어요
          </button>
          <button
            type="button"
            className="rounded-2xl border border-[#e4dcd2] bg-white px-4 py-3 text-sm"
            onClick={() => setPage('recommendations')}
          >
            나중에
          </button>
        </div>
      )}
      {error ? <p className="mt-3 text-sm text-[#b45353]">{error}</p> : null}
    </div>
  );
}
