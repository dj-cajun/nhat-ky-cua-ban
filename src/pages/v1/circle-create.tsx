import { useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import * as store from '@/lib/v1-store';
import { CIRCLE_COLORS, CIRCLE_SYMBOLS } from '@/types/circle';
import {
  v1ActiveCircleIdAtom,
  v1CirclesAtom,
  v1PageAtom,
  v1ProfileAtom,
} from '@/stores/v1-atoms';

export function CircleCreatePage() {
  const profile = useAtomValue(v1ProfileAtom);
  const setPage = useSetAtom(v1PageAtom);
  const setCircleId = useSetAtom(v1ActiveCircleIdAtom);
  const setCircles = useSetAtom(v1CirclesAtom);

  const [name, setName] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [error, setError] = useState('');
  const directory = profile ? store.ensureDemoDirectory(profile.id) : [];

  if (!profile) return null;

  const toggle = (id: string) => {
    setPicked((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return prev;
      return [...prev, id];
    });
  };

  const submit = () => {
    setError('');
    if (!name.trim()) {
      setError('서클 이름을 입력해 주세요.');
      return;
    }
    if (picked.length !== 2) {
      setError('함께 개척할 두 사람을 선택해 주세요.');
      return;
    }
    try {
      const { draft } = store.proposeCircle({
        name,
        inviterId: profile.id,
        inviteeIds: [picked[0], picked[1]],
      });
      // 데모: 두 친구 즉시 수락 → 개설
      const circle = store.demoAcceptAllAndOpen(draft.id);
      setCircles(store.listMyCircles(profile.id));
      setCircleId(circle.id);
      setPage('circle-setup');
    } catch (e) {
      setError(e instanceof Error ? e.message : '개설 실패');
    }
  };

  return (
    <div className="mx-auto flex h-screen max-w-md flex-col bg-[#f7f4ef] px-4 py-5">
      <button type="button" onClick={() => setPage('universe')} className="mb-4 self-start text-sm">
        ← 취소
      </button>
      <h1 className="text-xl font-semibold">서클 만들기</h1>
      <p className="mt-2 text-sm text-[#6b635c]">
        한 명이 혼자 열 수 없어요. 친구 두 명이 모두 수락해야 서클이 열립니다.
      </p>

      <label className="mt-6 text-xs text-[#8a8178]">임시 이름</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="mt-1 rounded-xl border border-[#e4dcd2] bg-white px-3 py-2 text-sm"
        placeholder="예: 금요일 스터디"
      />

      <p className="mt-6 text-xs text-[#8a8178]">함께 개척할 두 사람 ({picked.length}/2)</p>
      <div className="mt-2 space-y-2 overflow-y-auto">
        {directory.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => toggle(p.id)}
            className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm ${
              picked.includes(p.id)
                ? 'border-[#2f2a26] bg-[#2f2a26] text-white'
                : 'border-[#e4dcd2] bg-white'
            }`}
          >
            <span>{p.displayName}</span>
            <span className="text-xs opacity-70">앱 가입자</span>
          </button>
        ))}
      </div>

      {error && <p className="mt-3 text-sm text-[#b45353]">{error}</p>}

      <button
        type="button"
        onClick={submit}
        className="mt-auto rounded-2xl bg-[#2f2a26] py-3 text-sm text-white"
      >
        개척 요청 보내기
      </button>
      <p className="mt-2 text-center text-[11px] text-[#9a9188]">
        데모에서는 두 친구가 즉시 수락합니다.
      </p>
    </div>
  );
}

export function CircleSetupPage() {
  const profile = useAtomValue(v1ProfileAtom);
  const circleId = useAtomValue(v1ActiveCircleIdAtom);
  const setPage = useSetAtom(v1PageAtom);
  const setCircles = useSetAtom(v1CirclesAtom);
  const circle = circleId ? store.getCircle(circleId) : null;

  const [name, setName] = useState(circle?.name ?? '');
  const [description, setDescription] = useState(circle?.description ?? '');
  const [color, setColor] = useState(circle?.color ?? CIRCLE_COLORS[0]);
  const [symbol, setSymbol] = useState(circle?.symbol ?? CIRCLE_SYMBOLS[0]);

  if (!profile || !circle || !circleId) {
    return (
      <div className="p-6">
        <button type="button" onClick={() => setPage('universe')}>
          돌아가기
        </button>
      </div>
    );
  }

  const pioneers = store.listCircleMembers(circleId).filter((m) => m.isPioneer);

  const open = () => {
    store.updateCircleDesign(circleId, profile.id, {
      name: name.trim() || circle.name,
      description: description.trim(),
      color,
      symbol,
    });
    setCircles(store.listMyCircles(profile.id));
    setPage('circle');
  };

  return (
    <div className="mx-auto flex h-screen max-w-md flex-col overflow-y-auto bg-[#f7f4ef] px-4 py-5">
      <h1 className="text-xl font-semibold">서클을 열어요</h1>
      <p className="mt-2 text-sm text-[#6b635c]">세 사람이 서클을 열었어요.</p>

      <div className="mt-6 flex justify-center gap-3">
        {pioneers.map((m) => (
          <div
            key={m.userId}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-sm shadow"
          >
            {(store.getProfileById(m.userId)?.displayName ?? '?').slice(0, 1)}
          </div>
        ))}
      </div>

      <label className="mt-8 text-xs text-[#8a8178]">서클 이름</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="mt-1 rounded-xl border border-[#e4dcd2] bg-white px-3 py-2 text-sm"
      />

      <label className="mt-4 text-xs text-[#8a8178]">짧은 소개</label>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="mt-1 h-20 rounded-xl border border-[#e4dcd2] bg-white px-3 py-2 text-sm"
      />

      <p className="mt-4 text-xs text-[#8a8178]">색</p>
      <div className="mt-2 flex gap-2">
        {CIRCLE_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            className={`h-8 w-8 rounded-full ${color === c ? 'ring-2 ring-[#2f2a26]' : ''}`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      <p className="mt-4 text-xs text-[#8a8178]">상징</p>
      <div className="mt-2 flex gap-2">
        {CIRCLE_SYMBOLS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSymbol(s)}
            className={`flex h-10 w-10 items-center justify-center rounded-full border ${
              symbol === s ? 'border-[#2f2a26] bg-white' : 'border-transparent'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={open}
        className="mt-10 w-full rounded-2xl bg-[#2f2a26] py-3 text-sm text-white"
      >
        서클 열기
      </button>
    </div>
  );
}

export function InvitesPage() {
  const profile = useAtomValue(v1ProfileAtom);
  const setPage = useSetAtom(v1PageAtom);
  const setCircles = useSetAtom(v1CirclesAtom);
  const [, setTick] = useState(0);

  if (!profile) return null;
  const invites = store.listPendingInvitesFor(profile.id);

  return (
    <div className="mx-auto flex h-screen max-w-md flex-col bg-[#f7f4ef] px-4 py-5">
      <button type="button" onClick={() => setPage('universe')} className="mb-4 self-start text-sm">
        ← 우주
      </button>
      <h1 className="text-xl font-semibold">개척 초대</h1>
      <div className="mt-4 space-y-3">
        {invites.length === 0 && (
          <p className="text-sm text-[#8a8178]">대기 중인 초대가 없습니다.</p>
        )}
        {invites.map((invite) => {
          const inviter = store.getProfileById(invite.inviterId);
          return (
            <div key={invite.id} className="rounded-2xl border border-[#e4dcd2] bg-white p-4">
              <p className="text-sm">
                <strong>{inviter?.displayName ?? '친구'}</strong>님이 서클 개척을 제안했습니다.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  className="flex-1 rounded-xl bg-[#2f2a26] py-2 text-xs text-white"
                  onClick={() => {
                    store.respondToCreationInvite(invite.id, profile.id, true);
                    setCircles(store.listMyCircles(profile.id));
                    setTick((n) => n + 1);
                  }}
                >
                  수락
                </button>
                <button
                  type="button"
                  className="flex-1 rounded-xl border border-[#d9d0c4] py-2 text-xs"
                  onClick={() => {
                    store.respondToCreationInvite(invite.id, profile.id, false);
                    setTick((n) => n + 1);
                  }}
                >
                  거절
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
