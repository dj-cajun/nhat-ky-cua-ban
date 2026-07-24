import { useState } from 'react';
import type { AuthProvider } from '@/types/circle';
import * as store from '@/lib/v1-store';

interface SignupPageProps {
  onComplete: () => void;
}

const PROVIDERS: { id: AuthProvider; label: string; ready: boolean }[] = [
  { id: 'apple', label: 'Apple로 계속', ready: false },
  { id: 'google', label: 'Google로 계속', ready: false },
  { id: 'email', label: '이메일로 계속', ready: true },
  { id: 'demo', label: '데모로 바로 시작', ready: true },
];

export function SignupPage({ onComplete }: SignupPageProps) {
  const [step, setStep] = useState<'auth' | 'terms' | 'profile'>('auth');
  const [provider, setProvider] = useState<AuthProvider>('demo');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');

  const startProvider = (id: AuthProvider, ready: boolean) => {
    if (!ready) {
      setError('1.0 베타에서는 이메일·데모 로그인만 지원합니다. Apple/Google은 준비 중입니다.');
      return;
    }
    setError('');
    setProvider(id);
    if (id === 'demo') {
      setDisplayName('나');
      setStep('terms');
      return;
    }
    setStep('terms');
  };

  const finish = () => {
    const name = displayName.trim();
    if (!name) {
      setError('이름을 입력해 주세요.');
      return;
    }
    store.createProfile({
      displayName: name,
      email: provider === 'email' ? email.trim() || undefined : undefined,
      authProvider: provider,
    });
    store.ensureDemoDirectory(store.getSessionProfile()!.id);
    onComplete();
  };

  return (
    <div className="mx-auto flex h-screen max-w-md flex-col bg-[#f7f4ef] px-5 py-8">
      <p className="text-xs tracking-wide text-[#7C9A8E]">너의 다이어리</p>
      <h1 className="mt-2 text-2xl font-semibold text-[#2f2a26]">
        {step === 'auth' && '로그인 방식을 선택하세요'}
        {step === 'terms' && '약관에 동의해 주세요'}
        {step === 'profile' && '나를 소개해 주세요'}
      </h1>
      <p className="mt-2 text-sm text-[#6b635c]">
        세 사람의 신뢰로 열리는 작은 서클에서, 아는 사람의 하루를 찾아갑니다.
      </p>

      {step === 'auth' && (
        <div className="mt-8 space-y-3">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => startProvider(p.id, p.ready)}
              className={`w-full rounded-2xl border px-4 py-3 text-left text-sm ${
                p.ready
                  ? 'border-[#cfc4b6] bg-white text-[#2f2a26]'
                  : 'border-dashed border-[#d9d0c4] bg-transparent text-[#9a9188]'
              }`}
            >
              {p.label}
              {!p.ready && <span className="ml-2 text-xs">준비 중</span>}
            </button>
          ))}
        </div>
      )}

      {step === 'terms' && (
        <div className="mt-8 space-y-4">
          <div className="rounded-2xl border border-[#e4dcd2] bg-white p-4 text-sm leading-relaxed text-[#5c554e]">
            서비스 이용약관 및 개인정보 처리방침에 동의합니다. 가명 게시·쪽지의 실제 작성자는
            다른 사용자와 관리자에게 공개되지 않으며, 신고 대응을 위해서만 시스템에 보존됩니다.
          </div>
          <label className="flex items-start gap-2 text-sm text-[#2f2a26]">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1"
            />
            약관 및 개인정보 처리에 동의합니다
          </label>
          {provider === 'email' && (
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              className="w-full rounded-xl border border-[#e4dcd2] bg-white px-3 py-2 text-sm"
            />
          )}
          <button
            type="button"
            disabled={!agreed}
            onClick={() => setStep('profile')}
            className="w-full rounded-2xl bg-[#2f2a26] py-3 text-sm text-white disabled:opacity-40"
          >
            다음
          </button>
        </div>
      )}

      {step === 'profile' && (
        <div className="mt-8 space-y-4">
          <label className="block text-xs text-[#6b635c]">이름 또는 활동명</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={24}
            className="w-full rounded-xl border border-[#e4dcd2] bg-white px-3 py-2 text-sm"
            placeholder="예: 민아"
          />
          <p className="text-xs text-[#9a9188]">프로필 사진은 나중에 추가할 수 있어요.</p>
          <button
            type="button"
            onClick={finish}
            className="w-full rounded-2xl bg-[#2f2a26] py-3 text-sm text-white"
          >
            내 다이어리 만들기
          </button>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-[#b45353]">{error}</p>}
    </div>
  );
}
