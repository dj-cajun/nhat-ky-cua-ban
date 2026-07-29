import { useState } from 'react';
import { useLocale, useMessages } from '@/i18n';
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';

interface IntroPageProps {
  onComplete: () => void;
}

export function IntroPage({ onComplete }: IntroPageProps) {
  const t = useMessages();
  const [locale] = useLocale();
  const [step, setStep] = useState(0);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const slides = t.intro.slides;
  const isLast = step >= slides.length - 1;
  const brand = locale === 'ko' ? '너의 다이어리' : 'Your Diary';

  const goNext = () => {
    if (isLast) {
      if (!termsAccepted) return;
      onComplete();
      return;
    }
    setStep((prev) => prev + 1);
  };

  const slide = slides[step];

  return (
    <div className="page-shell justify-between p-6">
      <header className="shrink-0 pt-2">
        <div className="mb-3 flex justify-end">
          <LanguageSwitcher compact />
        </div>
        <p className="text-xs font-medium text-emerald-700">{t.app.tagline}</p>
        <h1 className="mt-1 text-xl font-bold leading-tight">{brand}</h1>
      </header>

      <main className="flex min-h-0 flex-1 flex-col justify-center py-4">
        <article className="diary-panel p-5">
          <p className="mb-3 text-3xl leading-none" aria-hidden>
            {slide.emoji}
          </p>
          <h2 className="mb-2 text-base font-bold leading-snug">{slide.title}</h2>
          <p className="text-sm leading-relaxed text-slate-600">{slide.body}</p>
          {slide.note && (
            <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs leading-relaxed text-emerald-900">
              {slide.note}
            </p>
          )}
        </article>

        {isLast && (
          <label className="pencil-label-box mt-4">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              {t.terms.acceptLabel}{' '}
              <a href={t.terms.privacyUrl} target="_blank" rel="noopener noreferrer" className="underline">
                {t.terms.privacy}
              </a>
              {' · '}
              <a href={t.terms.serviceUrl} target="_blank" rel="noopener noreferrer" className="underline">
                {t.terms.service}
              </a>
            </span>
          </label>
        )}

        <div className="mt-5 flex justify-center gap-2" role="tablist" aria-label={t.intro.stepLabel}>
          {slides.map((_, index) => (
            <span
              key={index}
              role="tab"
              aria-selected={index === step}
              className={`h-2 rounded-full transition-all ${
                index === step ? 'w-6 bg-slate-800' : 'w-2 bg-slate-300'
              }`}
            />
          ))}
        </div>
      </main>

      <footer className="page-footer shrink-0 space-y-3">
        <button
          type="button"
          onClick={goNext}
          disabled={isLast && !termsAccepted}
          className="pencil-btn-primary py-3.5 disabled:opacity-40"
        >
          {isLast ? t.intro.start : t.intro.next}
        </button>
        {!isLast && (
          <button
            type="button"
            onClick={onComplete}
            className="w-full py-1 text-center text-xs text-slate-500 underline-offset-2 hover:underline"
          >
            {t.intro.skip}
          </button>
        )}
        <p className="text-center text-[10px] text-slate-400">{t.app.anonymousFooter}</p>
        <p className="text-center text-xs font-semibold text-amber-800">{t.app.demoNotice}</p>
      </footer>
    </div>
  );
}
