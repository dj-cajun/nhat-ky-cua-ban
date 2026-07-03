import { atom } from 'jotai';

export type StickerSlotKey = 'slotA' | 'slotB' | 'slotC' | 'slotD';

export interface StickerSlots {
  slotA: string;
  slotB: string;
  slotC: string;
  slotD: string;
}

export const DOODLE_STICKERS = ['🍓', '🐻', '🌈', '🌸', '⭐', '💖', '☁️', '🎀'] as const;

const STORAGE_KEY = 'diary_sticker_slots';

const defaultSlots: StickerSlots = {
  slotA: '',
  slotB: '',
  slotC: '',
  slotD: '',
};

function readSlots(): StickerSlots {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultSlots };
    return { ...defaultSlots, ...(JSON.parse(raw) as Partial<StickerSlots>) };
  } catch {
    return { ...defaultSlots };
  }
}

function writeSlots(slots: StickerSlots): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(slots));
}

const baseAtom = atom<StickerSlots>(readSlots());

export const stickerSlotAtom = atom(
  (get) => get(baseAtom),
  (get, set, update: StickerSlots | ((prev: StickerSlots) => StickerSlots)) => {
    const next = typeof update === 'function' ? update(get(baseAtom)) : update;
    writeSlots(next);
    set(baseAtom, next);
  },
);
