import { useLocale, type Locale } from '@/i18n';
import { useMessages } from '@/i18n';

interface LanguageSwitcherProps {
  className?: string;
  compact?: boolean;
}

export function LanguageSwitcher({ className = '', compact = false }: LanguageSwitcherProps) {
  const [locale, setLocale] = useLocale();
  const t = useMessages();

  const options: { id: Locale; label: string }[] = [
    { id: 'en', label: t.language.en },
    { id: 'ko', label: t.language.ko },
  ];

  return (
    <div
      className={`flex items-center gap-1 ${className}`}
      role="group"
      aria-label={t.language.label}
    >
      {!compact && (
        <span className="mr-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          {t.language.label}
        </span>
      )}
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => setLocale(opt.id)}
          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
            locale === opt.id
              ? 'border-slate-800 bg-slate-800 text-white'
              : 'border-slate-300 bg-white/80 text-slate-600'
          }`}
          aria-pressed={locale === opt.id}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
