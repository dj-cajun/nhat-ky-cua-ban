import { useState } from 'react';
import { useSetAtom } from 'jotai';
import { db } from '@/lib/db';
import { showRewardedVideoAd } from '@/lib/zalo-ads';
import { logoutZalo } from '@/lib/zalo-auth';
import { clearAppData } from '@/lib/session';
import {
  buyFakeHintDefense,
  buyFont,
  buyProfileDeco,
  buySurnameBlurDefense,
  buyTheme,
  ownsFont,
} from '@/lib/dotori-economy';
import { HintForm } from '@/components/onboarding/HintForm';
import { DEFAULT_HINT_FORM } from '@/config/hint-options';
import { OFFERWALL_URLS, AFFILIATE_ITEMS } from '@/config/app-content';
import {
  DOTORI_PRICES,
  FONT_FAMILY_STACK,
  PROFILE_DECO_OPTIONS,
  PROFILE_FONTS,
  PROFILE_THEMES,
} from '@/types/dotori';
import { useMessages, type Messages } from '@/i18n';
import { currentUserAtom } from '@/stores/atoms';
import type { HintData } from '@/types';
import type { ProfileFontId, ProfileThemeId } from '@/types/dotori';

interface DotoriPageProps {
  onBack: () => void;
  onLogout?: () => void;
}

function getMissions(t: Messages) {
  return [
    { id: 'video' as const, icon: '🎬', ...t.dotori.missions.video, reward: 2, repeatable: true },
    { id: 'shopee' as const, icon: '🛒', ...t.dotori.missions.shopee, reward: 2, repeatable: false },
    { id: 'tiktok' as const, icon: '🎵', ...t.dotori.missions.tiktok, reward: 3, repeatable: false },
  ];
}

const THEME_PASTEL: Record<ProfileThemeId, string> = {
  default: 'cy-box-rose',
  'retro-pink': 'cy-box-blush',
  neon: 'cy-box-lavender',
  chalkboard: 'cy-box-mint',
};

const FONT_PASTEL: Record<ProfileFontId, string> = {
  playpen: 'cy-box-sky',
  playwrite: 'cy-box-blush',
  phudu: 'cy-box-lavender',
};

export function DotoriPage({ onBack, onLogout }: DotoriPageProps) {
  const t = useMessages();
  const missionList = getMissions(t);
  const setUser = useSetAtom(currentUserAtom);
  const [missions, setMissions] = useState(db.getDotoriMissions());
  const [loading, setLoading] = useState<string | null>(null);
  const [shopToast, setShopToast] = useState('');
  const [hint, setHint] = useState<HintData>({ ...DEFAULT_HINT_FORM });
  const [hintSaved, setHintSaved] = useState('');
  const profile = db.getProfile();

  const showShopFail = (reason: string) => {
    setShopToast(
      reason === 'insufficient' ? t.dotori.spendFail.insufficient : t.dotori.spendFail.already_owned,
    );
    window.setTimeout(() => setShopToast(''), 2000);
  };

  const handleFont = (fontId: ProfileFontId) => {
    const result = buyFont(fontId);
    if (!result.ok) {
      showShopFail(result.reason);
      return;
    }
    const updated = db.getProfile();
    if (updated) setUser(updated);
  };

  const handleTheme = (themeId: ProfileThemeId) => {
    const result = buyTheme(themeId);
    if (!result.ok) {
      showShopFail(result.reason);
      return;
    }
    const updated = db.getProfile();
    if (updated) setUser(updated);
  };

  const handleDeco = (emoji: string) => {
    const result = buyProfileDeco(emoji);
    if (!result.ok) {
      showShopFail(result.reason);
      return;
    }
    const updated = db.getProfile();
    if (updated) setUser(updated);
  };

  const handleMission = async (id: 'video' | 'shopee' | 'tiktok') => {
    if (id !== 'video' && missions[id]) return;

    setLoading(id);

    if (id === 'video') {
      const result = await showRewardedVideoAd();
      if (result.completed) {
        const balance = db.completeMission('video');
        setUser((u) => ({ ...u, dotoriBalance: balance }));
        setMissions(db.getDotoriMissions());
      }
    } else if (id === 'shopee') {
      window.open(OFFERWALL_URLS.shopee, '_blank');
      const balance = db.completeMission('shopee');
      setUser((u) => ({ ...u, dotoriBalance: balance }));
      setMissions(db.getDotoriMissions());
    } else {
      window.open(OFFERWALL_URLS.tiktok, '_blank');
      const balance = db.completeMission('tiktok');
      setUser((u) => ({ ...u, dotoriBalance: balance }));
      setMissions(db.getDotoriMissions());
    }

    setLoading(null);
  };

  const handleDefense = (kind: 'fake' | 'blur') => {
    const result = kind === 'fake' ? buyFakeHintDefense() : buySurnameBlurDefense();
    if (!result.ok) {
      showShopFail(result.reason);
      return;
    }
    const updated = db.getProfile();
    if (updated) setUser(updated);
  };

  const saveHint = async () => {
    const updated = await db.updateHint(hint);
    if (updated) {
      setUser(updated);
      setHintSaved(t.settings.saved);
      window.setTimeout(() => setHintSaved(''), 2000);
    }
  };

  return (
    <div className="page-shell p-4 font-doodle">
      <header className="mb-4 flex shrink-0 items-center justify-between">
        <button type="button" onClick={onBack} className="text-sm font-bold">
          {t.dotori.back}
        </button>
        <h1 className="text-sm font-bold">{t.dotori.title}</h1>
        <span className="text-sm font-bold">{profile?.dotoriBalance ?? 0}</span>
      </header>

      <main className="scrollbar-hide min-h-0 flex-1 overflow-y-auto overscroll-y-contain pb-2">
        <section className="mb-4">
        <h2 className="mb-2 text-xs font-bold text-slate-600">{t.dotori.missionBoard}</h2>
        <div className="space-y-2">
          {missionList.map((m) => {
            const done = m.id !== 'video' && missions[m.id];
            return (
              <button
                key={m.id}
                type="button"
                disabled={done || loading === m.id}
                onClick={() => void handleMission(m.id)}
                className="diary-panel flex w-full items-center gap-3 p-3 text-left disabled:opacity-50"
              >
                <span className="text-2xl">{m.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-bold">{m.title}</p>
                  <p className="text-xs text-slate-500">{m.desc}</p>
                </div>
                <span className="text-xs font-bold text-amber-700">
                  {done ? t.dotori.done : `+${m.reward} 🌰`}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mb-4">
        <h2 className="mb-2 text-xs font-bold text-slate-600">{t.dotori.shopTitle}</h2>
        <div className="mb-3 flex flex-wrap gap-2">
          {PROFILE_THEMES.map((theme) => (
            <button
              key={theme.id}
              type="button"
              onClick={() => handleTheme(theme.id)}
              className={`diary-panel px-3 py-2 text-xs font-bold ${THEME_PASTEL[theme.id]}`}
            >
              {t.dotori.themes[theme.labelKey as 'default' | 'retroPink' | 'neon' | 'chalkboard']}
            </button>
          ))}
        </div>
        <p className="mb-2 text-[10px] text-zinc-500">{t.dotori.fontsTitle}</p>
        <div className="mb-3 flex flex-wrap gap-2">
          {PROFILE_FONTS.map((font) => {
            const equipped = (profile?.fontId ?? 'playpen') === font.id;
            const owned = ownsFont(font.id);
            const priceLabel =
              font.id === 'playpen'
                ? t.dotori.fontFree
                : owned
                  ? t.dotori.fontOwned
                  : `${DOTORI_PRICES.font_buy} 🌰`;

            return (
              <button
                key={font.id}
                type="button"
                onClick={() => handleFont(font.id)}
                className={`diary-panel flex min-w-[5.5rem] flex-col items-center px-3 py-2 text-center ${FONT_PASTEL[font.id]} ${
                  equipped ? 'pencil-chip--selected' : ''
                }`}
                style={{ fontFamily: FONT_FAMILY_STACK[font.id] }}
              >
                <span className="text-lg leading-none">{font.preview}</span>
                <span className="mt-1 text-[10px] font-bold">
                  {t.dotori.fonts[font.labelKey as 'playpen' | 'playwrite' | 'phudu']}
                </span>
                <span className="mt-0.5 text-[9px] text-zinc-500">{priceLabel}</span>
              </button>
            );
          })}
        </div>
        <p className="mb-2 text-[10px] text-zinc-500">{t.dotori.decos}</p>
        <div className="flex flex-wrap gap-2">
          {PROFILE_DECO_OPTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleDeco(emoji)}
              className="diary-panel px-3 py-2 text-lg"
            >
              {emoji}
            </button>
          ))}
        </div>
        {shopToast && <p className="mt-2 text-xs text-red-600">{shopToast}</p>}
      </section>

      <section className="mb-4">
        <h2 className="mb-2 text-xs font-bold text-slate-600">{t.settings.hintSection}</h2>
        <div className="diary-panel p-3">
          <HintForm value={hint} onChange={setHint} />
          <button
            type="button"
            onClick={() => void saveHint()}
            className="pencil-btn-primary mt-3 py-2 text-xs"
          >
            {t.settings.saveHint}
          </button>
          {hintSaved && <p className="mt-2 text-xs text-emerald-700">{hintSaved}</p>}
        </div>
      </section>

      <section className="mb-4">
        <h2 className="mb-2 text-xs font-bold text-slate-600">{t.defense.title}</h2>
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => handleDefense('fake')}
            className="diary-panel w-full p-3 text-left text-xs font-bold"
          >
            {t.defense.fakeHint(DOTORI_PRICES.fake_hint)}
            {db.hasFakeHintActive() && ` · ${t.defense.active}`}
          </button>
          <button
            type="button"
            onClick={() => handleDefense('blur')}
            className="diary-panel w-full p-3 text-left text-xs font-bold"
          >
            {t.defense.surnameBlur(DOTORI_PRICES.surname_blur)}
            {db.hasSurnameBlurActive() && ` · ${t.defense.active}`}
          </button>
        </div>
      </section>

      <section className="mb-4">
        <h2 className="mb-2 text-xs font-bold text-slate-600">{t.dotori.affiliate}</h2>
        <div className="grid grid-cols-2 gap-2">
          {AFFILIATE_ITEMS.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="diary-panel flex flex-col items-center gap-1 p-3 text-center"
            >
              <span className="text-2xl">{link.emoji}</span>
              <span className="text-xs font-bold">{link.name}</span>
            </a>
          ))}
        </div>
      </section>
      </main>

      <footer className="page-footer shrink-0 space-y-2">
        <p className="text-center text-[10px] text-slate-400">{t.dotori.footer}</p>

        <button
          type="button"
          onClick={() => {
            if (window.confirm(t.dotori.logoutConfirm)) {
              logoutZalo();
              clearAppData();
              onLogout?.();
            }
          }}
          className="w-full text-center text-[10px] text-slate-400 underline"
        >
          {t.dotori.logout}
        </button>
      </footer>
    </div>
  );
}
