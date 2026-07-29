export type DotoriSpendReason =
  | 'surname_letter'
  | 'hint_unlock'
  | 'theme_buy'
  | 'font_buy'
  | 'profile_deco'
  | 'gift_dotori'
  | 'gift_deco'
  | 'nomination_erase'
  | 'fake_hint'
  | 'surname_blur'
  | 'gift_theme'
  | 'gift_sticker'
  | 'mystery_box';

export type DotoriGiftType = 'dotori' | 'deco' | 'theme' | 'sticker' | 'mystery';

export interface DotoriGift {
  id: string;
  senderLabel: string;
  giftType: DotoriGiftType;
  amount?: number;
  decoEmoji?: string;
  message: string;
  opened: boolean;
  createdAt: string;
}

export type ProfileThemeId = 'default' | 'retro-pink' | 'neon' | 'chalkboard';

export type ProfileFontId = 'playpen' | 'playwrite' | 'phudu';

export const DOTORI_PRICES: Record<DotoriSpendReason, number> = {
  surname_letter: 2,
  hint_unlock: 3,
  theme_buy: 5,
  font_buy: 4,
  profile_deco: 3,
  gift_dotori: 0,
  gift_deco: 3,
  nomination_erase: 5,
  fake_hint: 3,
  surname_blur: 4,
  gift_theme: 5,
  gift_sticker: 2,
  mystery_box: 4,
};

export const DOTORI_GIFT_AMOUNTS = [3, 5, 10] as const;

export const PROFILE_DECO_OPTIONS = ['👑', '🔥', '💫', '🌸', '⚡'] as const;

export const PROFILE_THEMES: { id: ProfileThemeId; labelKey: string }[] = [
  { id: 'default', labelKey: 'default' },
  { id: 'retro-pink', labelKey: 'retroPink' },
  { id: 'neon', labelKey: 'neon' },
  { id: 'chalkboard', labelKey: 'chalkboard' },
];

export const PROFILE_FONTS: { id: ProfileFontId; labelKey: string; preview: string }[] = [
  { id: 'playpen', labelKey: 'playpen', preview: 'Aa' },
  { id: 'playwrite', labelKey: 'playwrite', preview: 'Aa' },
  { id: 'phudu', labelKey: 'phudu', preview: 'Aa' },
];

export const FONT_FAMILY_STACK: Record<ProfileFontId, string> = {
  playpen: '"Playpen Sans", system-ui, sans-serif',
  playwrite: '"Playwrite VN", cursive',
  phudu: '"Phudu", "Playpen Sans", sans-serif',
};
