import { useState } from 'react';
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';
import { useLocale, useMessages } from '@/i18n';
import { loginWithZalo } from '@/lib/zalo-auth';

interface LoginPageProps {
  onLoggedIn: () => void;
}

export function LoginPage({ onLoggedIn }: LoginPageProps) {
  const t = useMessages();
  const [locale] = useLocale();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const brand = locale === 'ko' ? '너의 다이어리' : 'Your Diary';

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await loginWithZalo();
      onLoggedIn();
    } catch {
      setError(t.login.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell justify-between p-6">
      <div className="mb-4 flex justify-end">
        <LanguageSwitcher compact />
      </div>
      <div className="flex flex-1 flex-col justify-center">
        <p className="mb-2 text-xs font-medium text-emerald-700">{t.app.tagline}</p>
        <h1 className="mb-2 text-2xl font-bold leading-tight">{brand}</h1>
        <p className="mb-8 text-sm text-slate-600">{t.app.tagline}</p>

        <div className="diary-panel space-y-3 p-5">
          <p className="text-sm font-bold">{t.login.title}</p>
          <p className="text-xs text-slate-500">
            {t.login.desc}
            <br />
            {t.login.descLine2}
          </p>

          <button
            type="button"
            disabled={loading}
            onClick={() => void handleLogin()}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-800 py-3.5 text-sm font-bold text-white disabled:opacity-60"
          >
            {loading ? t.login.loggingIn : t.login.continue}
          </button>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
          )}
        </div>

        <p className="mt-4 text-center text-[10px] text-slate-400">{t.login.devNote}</p>
      </div>

      <p className="text-center text-[10px] text-slate-400">{t.app.anonymousFooter}</p>
    </div>
  );
}
