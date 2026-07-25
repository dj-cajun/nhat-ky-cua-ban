import { useMemo, useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import * as store from '@/lib/v1-store';
import { DIARY_MOODS, MAX_TEN_CHAR, type DiaryMood, type DiaryVisibilityMode } from '@/types/circle';
import {
  v1CirclesAtom,
  v1DiaryOwnerIdAtom,
  v1PageAtom,
  v1ProfileAtom,
} from '@/stores/v1-atoms';

export function DiaryPage() {
  const profile = useAtomValue(v1ProfileAtom);
  const ownerId = useAtomValue(v1DiaryOwnerIdAtom);
  const setPage = useSetAtom(v1PageAtom);
  const circles = useAtomValue(v1CirclesAtom);

  const owner = ownerId ? store.getProfileById(ownerId) : null;
  const isMine = profile?.id === ownerId;
  const entry = ownerId ? store.getDiaryEntry(ownerId) : null;
  const guestbook = ownerId ? store.listGuestbook(ownerId, 3) : [];
  const mood = DIARY_MOODS.find((m) => m.id === entry?.mood);

  const canView = useMemo(() => {
    if (!profile || !ownerId || !entry) return isMine;
    if (!entry) return true;
    return store.canViewDiary(profile.id, ownerId, entry);
  }, [profile, ownerId, entry, isMine]);

  if (!profile || !ownerId || !owner) {
    return (
      <div className="p-6 text-sm">
        <button type="button" onClick={() => setPage('universe')}>
          ← 우주로
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-screen max-w-md flex-col overflow-y-auto bg-[#faf7f2] px-4 py-5">
      <button
        type="button"
        onClick={() => setPage('universe')}
        className="mb-4 self-start text-sm text-[#6b635c]"
      >
        ← 우주
      </button>

      <header className="mb-6 flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#2f2a26] text-lg text-white">
          {owner.displayName.slice(0, 1)}
        </div>
        <div>
          <h1 className="text-xl font-semibold text-[#2f2a26]">{owner.displayName}</h1>
          <p className="text-sm text-[#6b635c]">
            {mood ? `${mood.emoji} ${mood.label}` : '오늘의 기분 없음'}
          </p>
        </div>
      </header>

      {!canView && entry ? (
        <p className="rounded-2xl bg-white p-4 text-sm text-[#6b635c]">
          이 기록은 공개되지 않았어요.
        </p>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-[#8a8178]">{new Date().toLocaleDateString('ko-KR')}</p>

          {entry?.tenCharText && (
            <section className="rounded-2xl border border-[#ebe4da] bg-white p-4">
              <p className="text-xs text-[#7C9A8E]">10자 기록</p>
              <p className="mt-2 text-lg font-medium tracking-wide">{entry.tenCharText}</p>
            </section>
          )}

          {entry?.shortText && (
            <section className="rounded-2xl border border-[#ebe4da] bg-white p-4">
              <p className="text-xs text-[#7C9A8E]">짧은 글</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{entry.shortText}</p>
            </section>
          )}

          {!entry && (
            <p className="rounded-2xl border border-dashed border-[#d9d0c4] p-4 text-sm text-[#8a8178]">
              아직 오늘 기록이 없어요.
            </p>
          )}

          {guestbook.length > 0 && (
            <section className="rounded-2xl border border-[#ebe4da] bg-white p-4">
              <p className="text-xs text-[#7C9A8E]">방명록</p>
              <ul className="mt-2 space-y-2">
                {guestbook.map((g) => (
                  <li key={g.id} className="text-sm text-[#2f2a26]">
                    <span className="text-[#8a8178]">
                      {store.getProfileById(g.authorUserId)?.displayName ?? '멤버'} ·{' '}
                    </span>
                    {g.body}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      <div className="mt-6 space-y-2">
        {isMine && (
          <button
            type="button"
            onClick={() => setPage('diary-edit')}
            className="w-full rounded-2xl bg-[#2f2a26] py-3 text-sm text-white"
          >
            오늘 수정
          </button>
        )}
        {!isMine && (
          <GuestbookComposer
            ownerId={ownerId}
            authorId={profile.id}
            sharedCircle={circles.length > 0}
          />
        )}
      </div>
    </div>
  );
}

function GuestbookComposer({
  ownerId,
  authorId,
  sharedCircle,
}: {
  ownerId: string;
  authorId: string;
  sharedCircle: boolean;
}) {
  const [body, setBody] = useState('');
  if (!sharedCircle) return null;
  return (
    <div className="rounded-2xl border border-[#ebe4da] bg-white p-3">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={120}
        placeholder="방명록을 남겨요"
        className="h-20 w-full resize-none text-sm outline-none"
      />
      <button
        type="button"
        disabled={!body.trim()}
        onClick={() => {
          store.addGuestbook(ownerId, authorId, body);
          setBody('');
          window.location.reload();
        }}
        className="mt-2 rounded-xl bg-[#2f2a26] px-3 py-2 text-xs text-white disabled:opacity-40"
      >
        남기기
      </button>
    </div>
  );
}

export function DiaryEditPage() {
  const profile = useAtomValue(v1ProfileAtom);
  const circles = useAtomValue(v1CirclesAtom);
  const setPage = useSetAtom(v1PageAtom);
  const existing = profile ? store.getDiaryEntry(profile.id) : null;

  const [mood, setMood] = useState<DiaryMood | undefined>(existing?.mood);
  const [ten, setTen] = useState(existing?.tenCharText ?? '');
  const [shortText, setShortText] = useState(existing?.shortText ?? '');
  const [visibility, setVisibility] = useState<DiaryVisibilityMode>(
    existing?.visibilityMode ?? 'private',
  );
  const [selectedCircles, setSelectedCircles] = useState<string[]>([]);
  const [error, setError] = useState('');

  if (!profile) return null;

  const save = () => {
    try {
      store.upsertDiaryEntry({
        userId: profile.id,
        mood,
        tenCharText: ten.trim() || undefined,
        shortText: shortText.trim() || undefined,
        visibilityMode: visibility,
        circleIds: visibility === 'selected_circles' ? selectedCircles : undefined,
      });
      setPage('diary');
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장 실패');
    }
  };

  return (
    <div className="mx-auto flex h-screen max-w-md flex-col overflow-y-auto bg-[#faf7f2] px-4 py-5">
      <button type="button" onClick={() => setPage('diary')} className="mb-4 self-start text-sm">
        ← 취소
      </button>
      <h1 className="text-xl font-semibold">오늘 수정</h1>
      <p className="mt-1 text-sm text-[#6b635c]">모든 항목을 채울 필요는 없어요.</p>

      <section className="mt-6">
        <p className="mb-2 text-xs text-[#8a8178]">기분</p>
        <div className="flex flex-wrap gap-2">
          {DIARY_MOODS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMood(m.id)}
              className={`rounded-full border px-3 py-1.5 text-xs ${
                mood === m.id ? 'border-[#2f2a26] bg-[#2f2a26] text-white' : 'border-[#e4dcd2] bg-white'
              }`}
            >
              {m.emoji} {m.label}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <p className="mb-2 text-xs text-[#8a8178]">10자 기록 ({ten.length}/{MAX_TEN_CHAR})</p>
        <input
          value={ten}
          maxLength={MAX_TEN_CHAR}
          onChange={(e) => setTen(e.target.value)}
          className="w-full rounded-xl border border-[#e4dcd2] bg-white px-3 py-2 text-sm"
        />
      </section>

      <section className="mt-6">
        <p className="mb-2 text-xs text-[#8a8178]">짧은 글</p>
        <textarea
          value={shortText}
          maxLength={280}
          onChange={(e) => setShortText(e.target.value)}
          className="h-28 w-full rounded-xl border border-[#e4dcd2] bg-white px-3 py-2 text-sm"
        />
      </section>

      <section className="mt-6">
        <p className="mb-2 text-xs text-[#8a8178]">공개 범위</p>
        {(
          [
            ['private', '나만 보기'],
            ['selected_circles', '선택한 서클'],
            ['all_circles', '내가 속한 모든 서클'],
          ] as const
        ).map(([id, label]) => (
          <label key={id} className="mb-2 flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={visibility === id}
              onChange={() => setVisibility(id)}
            />
            {label}
          </label>
        ))}
        {visibility === 'selected_circles' && (
          <div className="mt-2 space-y-1">
            {circles.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedCircles.includes(c.id)}
                  onChange={(e) => {
                    setSelectedCircles((prev) =>
                      e.target.checked ? [...prev, c.id] : prev.filter((id) => id !== c.id),
                    );
                  }}
                />
                {c.name}
              </label>
            ))}
          </div>
        )}
      </section>

      {error && <p className="mt-3 text-sm text-[#b45353]">{error}</p>}

      <button
        type="button"
        onClick={save}
        className="mt-8 w-full rounded-2xl bg-[#2f2a26] py-3 text-sm text-white"
      >
        저장
      </button>
    </div>
  );
}
