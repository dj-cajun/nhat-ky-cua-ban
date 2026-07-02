import { useEffect, useMemo, useState } from 'react';
import { SCHOOLS, CLASSES, REGION } from '@/config/app-content';
import {
  claimFounding,
  getFounding,
  getInviteUrl,
  joinFoundingByToken,
  resetFounding,
  simulateFoundingJoin,
  submitFoundingQuizzes,
  verifyFoundingGate,
} from '@/lib/class-founding';
import { getLoggedInZaloUser } from '@/lib/zalo-auth';
import { FOUNDING_QUIZ_COUNT, FOUNDING_REQUIRED_MEMBERS, type ClassFoundingRecord } from '@/types/founding';
import { vi } from '@/i18n/vi';

type FoundingPageProps = {
  onBack: () => void;
  onEnterHome?: () => void;
  initialJoinToken?: string | null;
};

type Screen = 'pick' | 'pending' | 'forming' | 'active' | 'gate';

function resolveScreen(record: ClassFoundingRecord | null): Screen {
  if (!record) return 'pick';
  if (record.status === 'pending') return 'pending';
  if (record.status === 'forming') return 'forming';
  if (record.status === 'active') return 'active';
  return 'pick';
}

export function FoundingPage({ onBack, onEnterHome, initialJoinToken }: FoundingPageProps) {
  const zaloUser = getLoggedInZaloUser();
  const [school, setSchool] = useState(REGION.defaultSchool);
  const [className, setClassName] = useState(REGION.defaultClass);
  const [record, setRecord] = useState<ClassFoundingRecord | null>(() => getFounding(school, className));
  const [screen, setScreen] = useState<Screen>(() => resolveScreen(getFounding(school, className)));
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [quizzes, setQuizzes] = useState(['', '', '']);
  const [gateAnswers, setGateAnswers] = useState(['', '', '']);
  const [gateError, setGateError] = useState(false);

  const inviteUrl = useMemo(
    () => (record ? getInviteUrl(record.inviteToken) : ''),
    [record],
  );

  const refresh = (nextSchool = school, nextClass = className) => {
    const next = getFounding(nextSchool, nextClass);
    setRecord(next);
    setScreen(resolveScreen(next));
  };

  useEffect(() => {
    if (!initialJoinToken) return;
    const result = joinFoundingByToken(initialJoinToken, zaloUser.id, zaloUser.name);
    if (!result.ok) {
      setMessage(vi.founding.joinErrors[result.reason]);
      return;
    }
    setSchool(result.record.schoolName);
    setClassName(result.record.className);
    setRecord(result.record);
    setScreen(resolveScreen(result.record));
    setMessage(vi.founding.joinSuccess);
  }, [initialJoinToken, zaloUser.id, zaloUser.name]);

  const handleClaim = () => {
    const result = claimFounding(school, className, zaloUser.id, zaloUser.name);
    if (!result.ok) {
      setMessage(vi.founding.claimErrors[result.reason]);
      if (result.reason === 'already_pending') {
        refresh();
      }
      return;
    }
    setRecord(result.record);
    setScreen('pending');
    setMessage('');
  };

  const handleShare = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleSimulateJoin = () => {
    if (!record) return;
    const next = simulateFoundingJoin(record.classKey);
    if (next) {
      setRecord(next);
      setScreen(resolveScreen(next));
    }
  };

  const handleSubmitQuizzes = () => {
    const result = submitFoundingQuizzes(school, className, quizzes);
    if (!result.ok) {
      setMessage(vi.founding.quizErrors[result.reason]);
      return;
    }
    setRecord(result.record);
    setScreen('active');
    setMessage('');
  };

  const handleVerifyGate = () => {
    const result = verifyFoundingGate(school, className, gateAnswers);
    if (!result.ok) {
      setGateError(true);
      return;
    }
    setGateError(false);
    setMessage(vi.founding.gateSuccess);
  };

  const handleResetDemo = () => {
    resetFounding(school, className);
    setRecord(null);
    setScreen('pick');
    setQuizzes(['', '', '']);
    setGateAnswers(['', '', '']);
    setMessage('');
    setGateError(false);
  };

  const memberCount = record?.members.length ?? 0;

  return (
    <div className="cy-shell">
      <div className="cy-canvas flex min-h-0 flex-1 flex-col">
        <header className="cy-card flex shrink-0 items-center justify-between px-3 py-2">
          <button type="button" onClick={onBack} className="text-xs font-bold">
            {vi.founding.back}
          </button>
          <h1 className="text-sm font-bold">{vi.founding.title}</h1>
          <span className="w-10" />
        </header>

        <main className="min-h-0 flex-1 space-y-3 overflow-y-auto p-2">
          <section className="cy-card p-3">
            <p className="mb-2 text-[10px] font-bold tracking-wide text-y2k-pink">
              {vi.founding.badge}
            </p>
            <p className="text-xs leading-relaxed text-zinc-700">{vi.founding.summary}</p>
          </section>

          {screen === 'pick' && (
            <section className="cy-card space-y-3 p-3">
              <h2 className="text-sm font-bold">{vi.founding.step1Title}</h2>
              <p className="text-xs text-zinc-600">{vi.founding.step1Desc}</p>
              <label className="block text-xs font-bold">{vi.onboarding.school}</label>
              <select
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                className="cy-card-inset w-full rounded px-2 py-2 text-sm"
              >
                {SCHOOLS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <label className="block text-xs font-bold">{vi.onboarding.class}</label>
              <select
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="cy-card-inset w-full rounded px-2 py-2 text-sm"
              >
                {CLASSES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <button type="button" onClick={handleClaim} className="cy-write-btn w-full py-2 text-sm">
                {vi.founding.claimBtn}
              </button>
            </section>
          )}

          {screen === 'pending' && record && (
            <section className="cy-card space-y-3 p-3">
              <div className="rounded border-2 border-black bg-zinc-100 px-3 py-2 text-center">
                <p className="text-xs font-bold text-red-600">{vi.founding.lockedTitle}</p>
                <p className="mt-1 text-[11px] text-zinc-600">
                  {school} · {className}
                </p>
              </div>
              <p className="text-xs leading-relaxed">{vi.founding.step2Desc}</p>
              <div className="cy-card-inset px-3 py-2 text-center">
                <p className="text-[10px] text-zinc-500">{vi.founding.progressLabel}</p>
                <p className="text-lg font-bold">
                  {vi.founding.progress(memberCount, FOUNDING_REQUIRED_MEMBERS)}
                </p>
              </div>
              <ul className="space-y-1 text-[11px]">
                {record.members.map((member) => (
                  <li key={member.userId} className="rounded border border-zinc-300 px-2 py-1">
                    {member.name}
                    {member.userId === record.founderUserId ? ` ${vi.founding.founderMark}` : ''}
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => void handleShare()} className="cy-hard-btn w-full rounded-lg bg-white py-2 text-sm font-bold">
                {copied ? vi.founding.copied : vi.founding.shareBtn}
              </button>
              <p className="break-all rounded bg-zinc-100 p-2 font-mono text-[9px] text-zinc-600">
                {inviteUrl}
              </p>
              <p className="text-[10px] text-zinc-500">{vi.founding.shareHint}</p>
              <button type="button" onClick={handleSimulateJoin} className="cy-card-inset w-full py-2 text-xs font-bold">
                {vi.founding.simulateJoin}
              </button>
            </section>
          )}

          {screen === 'forming' && record && (
            <section className="cy-card space-y-3 p-3">
              <h2 className="text-sm font-bold">{vi.founding.step4Title}</h2>
              <p className="text-xs text-zinc-600">{vi.founding.step4Desc}</p>
              {Array.from({ length: FOUNDING_QUIZ_COUNT }, (_, index) => (
                <div key={index}>
                  <label className="mb-1 block text-xs font-bold">
                    {vi.founding.quizLabel(index + 1)}
                  </label>
                  <input
                    type="text"
                    value={quizzes[index]}
                    onChange={(e) => {
                      const next = [...quizzes];
                      next[index] = e.target.value;
                      setQuizzes(next);
                    }}
                    className="cy-card-inset w-full rounded px-2 py-2 text-sm"
                    placeholder={vi.founding.quizPlaceholder}
                  />
                </div>
              ))}
              <button type="button" onClick={handleSubmitQuizzes} className="cy-write-btn w-full py-2 text-sm">
                {vi.founding.activateBtn}
              </button>
            </section>
          )}

          {screen === 'active' && record && (
            <>
              <section className="cy-card space-y-2 p-3">
                <h2 className="text-sm font-bold">{vi.founding.activeTitle}</h2>
                <p className="text-xs text-zinc-600">{vi.founding.activeDesc}</p>
                <ul className="space-y-1 text-[11px]">
                  {record.quizzes.map((quiz, index) => (
                    <li key={quiz} className="rounded border border-zinc-300 px-2 py-1">
                      {index + 1}. {quiz}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => setScreen('gate')}
                  className="cy-hard-btn w-full rounded-lg bg-white py-2 text-sm font-bold"
                >
                  {vi.founding.previewGate}
                </button>
                {onEnterHome && (
                  <button type="button" onClick={onEnterHome} className="cy-write-btn w-full py-2 text-sm">
                    {vi.founding.enterHome}
                  </button>
                )}
              </section>
            </>
          )}

          {screen === 'gate' && record && (
            <section className="cy-card space-y-3 p-3">
              <h2 className="text-sm font-bold">{vi.founding.gateTitle}</h2>
              <p className="text-xs text-zinc-600">{vi.founding.gateDesc}</p>
              {record.quizzes.map((quiz, index) => (
                <div key={quiz}>
                  <p className="mb-1 text-[11px] font-bold">{vi.founding.gateQuestion(index + 1)}</p>
                  <input
                    type="text"
                    value={gateAnswers[index]}
                    onChange={(e) => {
                      const next = [...gateAnswers];
                      next[index] = e.target.value;
                      setGateAnswers(next);
                      setGateError(false);
                    }}
                    className="cy-card-inset w-full rounded px-2 py-2 text-sm"
                    placeholder={vi.founding.gatePlaceholder}
                  />
                </div>
              ))}
              {gateError && <p className="text-xs text-red-600">{vi.founding.gateWrong}</p>}
              <button type="button" onClick={handleVerifyGate} className="cy-write-btn w-full py-2 text-sm">
                {vi.founding.gateSubmit}
              </button>
              <button type="button" onClick={() => setScreen('active')} className="text-xs text-zinc-500">
                {vi.founding.backToActive}
              </button>
            </section>
          )}

          {message && (
            <p className="rounded border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-700">{message}</p>
          )}

          <section className="cy-card-inset p-3">
            <p className="mb-2 text-[10px] font-bold text-zinc-500">{vi.founding.flowTitle}</p>
            <ol className="list-decimal space-y-1 pl-4 text-[10px] leading-relaxed text-zinc-600">
              {vi.founding.flowSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <button type="button" onClick={handleResetDemo} className="mt-3 text-[10px] font-bold text-zinc-500 underline">
              {vi.founding.resetDemo}
            </button>
          </section>
        </main>
      </div>
    </div>
  );
}
