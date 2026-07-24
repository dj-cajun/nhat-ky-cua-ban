import { useMemo, useState, type ReactNode } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';
import { useLocale, useMessages } from '@/i18n';
import * as store from '@/lib/v1-store';
import {
  v1CirclesAtom,
  v1DiaryOwnerIdAtom,
  v1PageAtom,
  v1ProfileAtom,
} from '@/stores/v1-atoms';
import { DIARY_MOODS, type DiaryMood } from '@/types/circle';

/**
 * Your Diary mini-hompy
 * Keeps pastel profile / calendar / album / guestbook atmosphere.
 * Maps to circle diary data — no school, Zalo, Dotori, visitors, investigation.
 */
export function DiaryHomePage() {
  const t = useMessages();
  const [locale] = useLocale();
  const me = useAtomValue(v1ProfileAtom);
  const ownerId = useAtomValue(v1DiaryOwnerIdAtom);
  const circles = useAtomValue(v1CirclesAtom);
  const setPage = useSetAtom(v1PageAtom);
  const setOwner = useSetAtom(v1DiaryOwnerIdAtom);
  const [tick, setTick] = useState(0);
  const refresh = () => setTick((n) => n + 1);

  const owner = ownerId ? store.getProfileById(ownerId) : null;
  const isMine = Boolean(me && ownerId && me.id === ownerId);
  const entry = ownerId ? store.getDiaryEntry(ownerId) : null;
  const guestbook = ownerId ? store.listGuestbook(ownerId, 4) : [];
  const entries = ownerId ? store.listDiaryEntries(ownerId) : [];
  const mood = DIARY_MOODS.find((m) => m.id === entry?.mood);
  const brand = locale === 'ko' ? '너의 다이어리' : 'Your Diary';

  const members = useMemo(() => {
    if (!me) return [];
    const seen = new Set<string>();
    const list: { id: string; name: string }[] = [];
    for (const c of circles) {
      for (const m of store.listCircleMembers(c.id, me.id)) {
        if (m.userId === me.id || seen.has(m.userId)) continue;
        seen.add(m.userId);
        const p = store.getProfileById(m.userId);
        if (p) list.push({ id: p.id, name: p.displayName });
      }
    }
    if (list.length === 0) {
      for (const p of store.listDirectoryProfiles(me.id).slice(0, 5)) {
        list.push({ id: p.id, name: p.displayName });
      }
    }
    return list;
    // tick forces refresh after guestbook / owner change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [circles, me, tick]);

  const canView = useMemo(() => {
    if (!me || !ownerId) return false;
    if (isMine) return true;
    if (!entry) return true;
    return store.canViewDiary(me.id, ownerId, entry);
  }, [me, ownerId, entry, isMine, tick]);

  if (!me || !ownerId || !owner) {
    return (
      <div className="cy-shell">
        <div className="flex flex-1 items-center justify-center text-sm text-slate-500">
          {t.app.loading}
        </div>
      </div>
    );
  }

  return (
    <div className="cy-shell" data-theme="default">
      <div className="cy-canvas">
        <header className="cy-card cy-box-sky flex shrink-0 items-center justify-between gap-2 px-3 py-2">
          <button
            type="button"
            onClick={() => setPage('universe')}
            className="text-left text-[11px] font-bold text-slate-700"
          >
            ← {locale === 'ko' ? '내 우주' : 'Universe'}
          </button>
          <p className="text-xs font-bold tracking-wide text-slate-800">{brand}</p>
          <LanguageSwitcher compact />
        </header>

        <section className="cy-card cy-box-blush shrink-0 p-3">
          <div className="flex items-center gap-3">
            <div className="cy-avatar flex h-14 w-14 items-center justify-center rounded-full bg-white text-xl font-bold text-slate-800">
              {owner.displayName.slice(0, 1)}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-bold text-slate-900">{owner.displayName}</h1>
              <p className="text-[11px] text-slate-600">
                {mood
                  ? `${mood.emoji} ${locale === 'ko' ? mood.label : mood.id}`
                  : locale === 'ko'
                    ? '오늘의 기분 없음'
                    : 'No mood today'}
              </p>
              {circles[0] && (
                <p className="mt-0.5 truncate text-[10px] text-slate-500">
                  {circles[0].symbol} {circles[0].name}
                </p>
              )}
            </div>
            {isMine && (
              <button
                type="button"
                onClick={() => setPage('diary-edit')}
                className="cy-hard-btn shrink-0 bg-white px-2 py-1 text-[10px] font-bold"
              >
                {locale === 'ko' ? '오늘 수정' : 'Edit today'}
              </button>
            )}
          </div>

          <div className="cy-today-me mt-3">
            <p className="cy-today-me-label">{locale === 'ko' ? '오늘 나는' : 'Today I…'}</p>
            {canView ? (
              <p className="cy-today-me-text">
                {entry?.tenCharText?.trim() ||
                  entry?.shortText?.trim() ||
                  (locale === 'ko' ? '아직 오늘 기록이 없어요.' : 'Today is still blank.')}
              </p>
            ) : (
              <p className="cy-today-me-text text-slate-400">
                {locale === 'ko'
                  ? '이 기록은 공개되지 않았어요.'
                  : 'This entry isn’t shared with you.'}
              </p>
            )}
          </div>
        </section>

        {members.length > 0 && (
          <section className="cy-card cy-box-lemon flex shrink-0 gap-2 overflow-x-auto px-2 py-2">
            <button
              type="button"
              onClick={() => {
                setOwner(me.id);
                refresh();
              }}
              className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-bold ${
                isMine ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-300 bg-white'
              }`}
            >
              {locale === 'ko' ? '내 홈' : 'My home'}
            </button>
            {members.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setOwner(m.id);
                  refresh();
                }}
                className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-bold ${
                  ownerId === m.id
                    ? 'border-slate-800 bg-slate-800 text-white'
                    : 'border-slate-300 bg-white'
                }`}
              >
                {m.name}
              </button>
            ))}
          </section>
        )}

        <div className="grid min-h-0 flex-1 grid-cols-2 gap-2 overflow-hidden">
          <DiaryWeekCalendar
            entries={entries}
            locale={locale}
            onPick={() => isMine && setPage('diary-edit')}
          />
          <DiaryAlbumPanel locale={locale} hasEntry={Boolean(canView && entry)} />
        </div>

        <section className="cy-card cy-box-lavender cy-board-preview flex min-h-0 flex-[1.1] flex-col overflow-hidden p-2">
          <div className="cy-board-preview-scroll space-y-2">
            <BoardBlock
              title={locale === 'ko' ? '짧은 글' : 'Short entry'}
              empty={locale === 'ko' ? '아직 짧은 글이 없어요.' : 'No short entry yet.'}
            >
              {canView && entry?.shortText ? (
                <p className="text-[11px] leading-relaxed text-slate-700">{entry.shortText}</p>
              ) : null}
            </BoardBlock>

            <BoardBlock
              title={locale === 'ko' ? '방명록' : 'Guestbook'}
              empty={locale === 'ko' ? '아직 방명록이 없어요.' : 'No guestbook notes yet.'}
            >
              {guestbook.length > 0 ? (
                <ul className="space-y-1">
                  {guestbook.map((g) => (
                    <li key={g.id} className="text-[11px] text-slate-700">
                      <span className="text-slate-400">
                        {store.getProfileById(g.authorUserId)?.displayName ?? '·'} ·{' '}
                      </span>
                      {g.body}
                    </li>
                  ))}
                </ul>
              ) : null}
            </BoardBlock>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPage('circle')}
                className="cy-hard-btn bg-white px-2.5 py-1.5 text-[10px] font-bold"
              >
                {locale === 'ko' ? '가명 게시판 →' : 'Alias board →'}
              </button>
              <div className="cy-hard-btn flex items-center gap-1 bg-white px-2.5 py-1.5 text-[10px] font-bold text-slate-600">
                ♪ {locale === 'ko' ? '오늘의 음악 (Spotify)' : "Today’s music (Spotify)"}
              </div>
            </div>

            {!isMine && circles.length > 0 && (
              <GuestbookComposer
                ownerId={ownerId}
                authorId={me.id}
                locale={locale}
                onDone={refresh}
              />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function BoardBlock({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: ReactNode;
}) {
  const has = Boolean(children);
  return (
    <div>
      <p className="cy-board-section-title text-[10px] font-bold text-slate-600">{title}</p>
      {has ? children : <p className="text-[10px] text-zinc-400">{empty}</p>}
    </div>
  );
}

function DiaryWeekCalendar({
  entries,
  locale,
  onPick,
}: {
  entries: { entryDate: string; tenCharText?: string; mood?: DiaryMood }[];
  locale: string;
  onPick: () => void;
}) {
  const days =
    locale === 'ko' ? ['일', '월', '화', '수', '목', '금', '토'] : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const byDate = new Map(entries.map((e) => [e.entryDate, e]));
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay());

  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    return { key, day: days[i], n: d.getDate(), entry: byDate.get(key) };
  });

  return (
    <section className="cy-card cy-box-mint flex min-h-0 flex-col overflow-hidden p-2">
      <p className="mb-1 text-[10px] font-bold text-slate-600">
        {today.getFullYear()}.{today.getMonth() + 1}
      </p>
      <div className="scrollbar-hide min-h-0 flex-1 space-y-1 overflow-y-auto">
        {week.map((d) => (
          <button
            key={d.key}
            type="button"
            onClick={onPick}
            className="flex w-full items-baseline gap-1 border-b border-dotted border-slate-300 pb-0.5 text-left"
          >
            <span className="w-4 text-[10px] font-bold text-slate-500">{d.day}</span>
            <span className="w-4 text-[10px] text-slate-700">{d.n}</span>
            <span className="min-w-0 flex-1 truncate text-[10px] text-slate-600">
              {d.entry?.tenCharText || '·'}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function DiaryAlbumPanel({ locale, hasEntry }: { locale: string; hasEntry: boolean }) {
  return (
    <section className="cy-card cy-box-peach flex min-h-0 flex-col overflow-hidden p-2">
      <p className="mb-1 text-[10px] font-bold text-slate-600">
        {locale === 'ko' ? '미니 사진첩' : 'Mini album'}
      </p>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center rounded-md bg-white/70 p-2 text-center">
        <img src="/photo-album-default.svg" alt="" className="mb-2 h-16 w-16 opacity-80" />
        <p className="text-[10px] text-slate-500">
          {hasEntry
            ? locale === 'ko'
              ? '오늘의 한 컷'
              : 'Today’s frame'
            : locale === 'ko'
              ? '아직 사진이 없어요'
              : 'No photos yet'}
        </p>
      </div>
    </section>
  );
}

function GuestbookComposer({
  ownerId,
  authorId,
  locale,
  onDone,
}: {
  ownerId: string;
  authorId: string;
  locale: string;
  onDone: () => void;
}) {
  const [body, setBody] = useState('');
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value.slice(0, 120))}
        placeholder={locale === 'ko' ? '방명록을 남겨요' : 'Leave a guestbook note'}
        className="h-14 w-full resize-none text-[11px] outline-none"
      />
      <button
        type="button"
        disabled={!body.trim()}
        onClick={() => {
          store.addGuestbook(ownerId, authorId, body);
          setBody('');
          onDone();
        }}
        className="mt-1 rounded-md bg-slate-800 px-2 py-1 text-[10px] font-bold text-white disabled:opacity-40"
      >
        {locale === 'ko' ? '남기기' : 'Post'}
      </button>
    </div>
  );
}
