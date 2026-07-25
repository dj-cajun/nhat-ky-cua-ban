import { useMemo, useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
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
 * No brand line, no my-home/friend visit strip.
 */
export function DiaryHomePage() {
  const t = useMessages();
  const [locale] = useLocale();
  const me = useAtomValue(v1ProfileAtom);
  const ownerId = useAtomValue(v1DiaryOwnerIdAtom);
  const circles = useAtomValue(v1CirclesAtom);
  const setPage = useSetAtom(v1PageAtom);
  const [tick, setTick] = useState(0);
  const refresh = () => setTick((n) => n + 1);

  const owner = ownerId ? store.getProfileById(ownerId) : null;
  const isMine = Boolean(me && ownerId && me.id === ownerId);
  const entry = ownerId ? store.getDiaryEntry(ownerId) : null;
  const guestbook = ownerId ? store.listGuestbook(ownerId, 3) : [];
  const freeBoard = ownerId ? store.listFreeBoard(ownerId, 3) : [];
  const entries = ownerId ? store.listDiaryEntries(ownerId) : [];
  const mood = DIARY_MOODS.find((m) => m.id === entry?.mood);
  const sharedCircle = circles[0] ?? null;

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
        <header className="cy-card cy-box-sky flex shrink-0 items-center gap-2 px-3 py-2">
          <button
            type="button"
            onClick={() => setPage('universe')}
            className="text-left text-[11px] font-bold text-slate-700"
          >
            ← {locale === 'ko' ? '내 우주' : 'Universe'}
          </button>
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

        <div className="grid min-h-0 flex-1 grid-cols-2 gap-2 overflow-hidden">
          <DiaryWeekCalendar
            entries={entries}
            locale={locale}
            onPick={() => isMine && setPage('diary-edit')}
          />
          <DiaryAlbumPanel locale={locale} hasEntry={Boolean(canView && entry)} />
        </div>

        <section className="cy-card cy-box-lavender cy-board-preview cy-board-preview-home flex min-h-0 flex-[1.1] flex-col overflow-hidden p-2">
          <div className="cy-board-preview-scroll">
            {sharedCircle ? (
              <SchoolBoardSection
                title={locale === 'ko' ? '써클게시판' : 'Circle board'}
                tone="school"
                empty={locale === 'ko' ? '아직 써클 글이 없어요.' : 'No circle posts yet.'}
                lines={[]}
                onOpen={() => setPage('circle')}
              />
            ) : null}

            <SchoolBoardSection
              title={locale === 'ko' ? '방명록' : 'Guestbook'}
              tone="guestbook"
              empty={locale === 'ko' ? '아직 방명록이 없어요.' : 'No guestbook notes yet.'}
              lines={guestbook.map((g) => ({
                id: g.id,
                author: store.getProfileById(g.authorUserId)?.displayName ?? '·',
                body: g.body,
              }))}
              onOpen={() => undefined}
            />

            <SchoolBoardSection
              title={locale === 'ko' ? '자유게시판' : 'Free board'}
              tone="diary"
              empty={
                locale === 'ko' ? '아직 자유게시판 글이 없어요.' : 'No free-board posts yet.'
              }
              lines={freeBoard.map((p) => ({
                id: p.id,
                author: store.getProfileById(p.authorUserId)?.displayName ?? '·',
                body: p.body,
              }))}
              onOpen={() => undefined}
            />

            <div className="flex flex-wrap gap-2 pt-2">
              <div className="cy-hard-btn flex items-center gap-1 bg-white px-2.5 py-1.5 text-[10px] font-bold text-slate-600">
                ♪ {locale === 'ko' ? '오늘의 음악 (Spotify)' : "Today’s music (Spotify)"}
              </div>
            </div>

            {!isMine ? (
              <GuestbookComposer
                ownerId={ownerId}
                authorId={me.id}
                locale={locale}
                onDone={refresh}
              />
            ) : null}
            <FreeBoardComposer
              ownerId={ownerId}
              authorId={me.id}
              isMine={isMine}
              locale={locale}
              onDone={refresh}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function SchoolBoardSection({
  title,
  tone,
  empty,
  lines,
  onOpen,
}: {
  title: string;
  tone: 'school' | 'guestbook' | 'diary';
  empty: string;
  lines: { id: string; author: string; body: string }[];
  onOpen: () => void;
}) {
  const slots = Array.from({ length: 3 }, (_, i) => lines[i] ?? null);
  const toneClass =
    tone === 'school'
      ? 'cy-board-section-title--school'
      : tone === 'guestbook'
        ? 'cy-board-section-title--guestbook'
        : 'cy-board-section-title--diary';

  return (
    <div className="sk-divider-top first:border-0 first:pt-0">
      <button
        type="button"
        onClick={onOpen}
        className={`cy-board-section-title cy-board-row-tappable w-full ${toneClass}`}
      >
        <span className="min-w-0 flex-1 truncate">{title}</span>
        <span className="cy-board-post-row-cue" aria-hidden>
          ›
        </span>
      </button>
      {slots.map((line, i) => {
        if (!line) {
          return (
            <div key={`${title}-slot-${i}`} className="cy-board-post-row">
              {lines.length === 0 && i === 0 ? (
                <span className="text-[10px] text-zinc-400">{empty}</span>
              ) : null}
            </div>
          );
        }
        return (
          <button
            key={line.id}
            type="button"
            onClick={onOpen}
            className="cy-board-post-row cy-board-row-tappable w-full"
          >
            <span className="shrink-0 text-[10px] font-bold text-zinc-400">{line.author}</span>
            <span className="min-w-0 flex-1 truncate text-zinc-700">{line.body}</span>
            <span className="cy-board-post-row-cue" aria-hidden>
              ·
            </span>
          </button>
        );
      })}
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
    <div className="mt-2 rounded-lg border border-amber-200/80 bg-[#fff8ee] p-2">
      <p className="mb-1 text-[10px] font-bold text-slate-600">
        {locale === 'ko' ? '방명록 쓰기' : 'Write guestbook'}
      </p>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value.slice(0, 120))}
        placeholder={locale === 'ko' ? '방명록을 남겨요' : 'Leave a guestbook note'}
        className="h-14 w-full resize-none bg-transparent text-[11px] outline-none"
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

function FreeBoardComposer({
  ownerId,
  authorId,
  isMine,
  locale,
  onDone,
}: {
  ownerId: string;
  authorId: string;
  isMine: boolean;
  locale: string;
  onDone: () => void;
}) {
  const [body, setBody] = useState('');
  return (
    <div className="mt-2 rounded-lg border border-rose-200/80 bg-[#fff0f5] p-2">
      <p className="mb-1 text-[10px] font-bold text-slate-600">
        {locale === 'ko'
          ? isMine
            ? '자유게시판 쓰기 (주인)'
            : '자유게시판 쓰기'
          : isMine
            ? 'Write free board (owner)'
            : 'Write free board'}
      </p>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value.slice(0, 200))}
        placeholder={
          locale === 'ko' ? '자유게시판에 남겨요' : 'Write on the free board'
        }
        className="h-14 w-full resize-none bg-transparent text-[11px] outline-none"
      />
      <button
        type="button"
        disabled={!body.trim()}
        onClick={() => {
          store.addFreeBoard(ownerId, authorId, body);
          setBody('');
          onDone();
        }}
        className="mt-1 rounded-md bg-slate-800 px-2 py-1 text-[10px] font-bold text-white disabled:opacity-40"
      >
        {locale === 'ko' ? '올리기' : 'Post'}
      </button>
    </div>
  );
}
