import { useState } from 'react';
import { APP_META } from '@/config/app-content';
import { vi } from '@/i18n/vi';
import { loginWithZalo } from '@/lib/zalo-auth';

interface LoginPageProps {
  onLoggedIn: () => void;
}

export function LoginPage({ onLoggedIn }: LoginPageProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await loginWithZalo();
      onLoggedIn();
    } catch {
      setError(vi.login.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell justify-between p-6">
      <div className="flex flex-1 flex-col justify-center">
        <p className="mb-2 text-xs font-medium text-emerald-700">{vi.app.tagline}</p>
        <h1 className="mb-2 text-2xl font-bold leading-tight">{APP_META.name}</h1>
        <p className="mb-8 text-sm text-slate-600">{APP_META.slogan}</p>

        <div className="diary-panel space-y-3 p-5">
          <p className="text-sm font-bold">{vi.login.title}</p>
          <p className="text-xs text-slate-500">
            {vi.login.desc}
            <br />
            {vi.login.descLine2}
          </p>

          <button
            type="button"
            disabled={loading}
            onClick={() => void handleLogin()}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0068ff] py-3.5 text-sm font-bold text-white disabled:opacity-60"
          >
            <span className="text-lg">Z</span>
            {loading ? vi.login.loggingIn : vi.login.continue}
          </button>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
          )}
        </div>

        <p className="mt-4 text-center text-[10px] text-slate-400">{vi.login.devNote}</p>
      </div>

      <p className="text-center text-[10px] text-slate-400">{vi.app.anonymousFooter}</p>
    </div>
  );
}
