export type DotoriSpendReason =
  | 'surname_letter'
  | 'hint_unlock'
  | 'theme_buy'
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

export const DOTORI_PRICES: Record<DotoriSpendReason, number> = {
  surname_letter: 2,
  hint_unlock: 3,
  theme_buy: 5,
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
