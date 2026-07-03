import type { HintShield } from '@/types';
import type { DotoriGift, ProfileThemeId } from '@/types/dotori';
import { DOTORI_GIFT_AMOUNTS, DOTORI_PRICES } from '@/types/dotori';
import { db } from '@/lib/db';
import {
  ALL_SHIELDS,
  getTargetHintShields,
  getUnlockedShieldsForTarget,
  purchaseKey,
} from '@/lib/target-hints';
import { todayDateStr } from '@/lib/vote-service';

export type SpendResult =
  | { ok: true; balance: number }
  | { ok: false; reason: 'insufficient' | 'already_owned' | 'no_profile' | 'limit' };

function spend(amount: number): SpendResult {
  const balance = db.spendDotori(amount);
  if (balance === null) {
    if (!db.getProfile()) return { ok: false, reason: 'no_profile' };
    return { ok: false, reason: 'insufficient' };
  }
  return { ok: true, balance };
}

export function getBalance(): number {
  return db.getProfile()?.dotoriBalance ?? 0;
}

export function hasSurnameLetterUnlock(targetId: string): boolean {
  return db.hasDotoriPurchase(purchaseKey('surname_letter', targetId));
}

export function buySurnameLetter(targetId: string, surname: string): SpendResult & { letter?: string } {
  if (hasSurnameLetterUnlock(targetId)) {
    return { ok: false, reason: 'already_owned' };
  }
  const result = spend(DOTORI_PRICES.surname_letter);
  if (!result.ok) return result;
  db.markDotoriPurchase(purchaseKey('surname_letter', targetId));
  const letter = surname.trim().charAt(0).toUpperCase() || '?';
  return { ...result, letter };
}

export function getNextLockedShield(targetId: string): HintShield | null {
  const unlocked = getUnlockedShieldsForTarget(targetId);
  return ALL_SHIELDS.find((shield) => !unlocked.includes(shield)) ?? null;
}

export function buyHintUnlock(
  targetId: string,
  surname: string,
): SpendResult & { shield?: HintShield; text?: string } {
  const unlocked = getUnlockedShieldsForTarget(targetId);
  if (unlocked.length >= 2) {
    return { ok: false, reason: 'limit' };
  }
  const shield = getNextLockedShield(targetId);
  if (!shield) {
    return { ok: false, reason: 'already_owned' };
  }
  const key = purchaseKey('hint_unlock', targetId, shield);
  if (db.hasDotoriPurchase(key)) {
    return { ok: false, reason: 'already_owned' };
  }
  const result = spend(DOTORI_PRICES.hint_unlock);
  if (!result.ok) return result;
  db.markDotoriPurchase(key);
  const shields = getTargetHintShields(targetId, surname);
  return { ...result, shield, text: shields[shield] };
}

export function buyTheme(themeId: ProfileThemeId): SpendResult {
  const profile = db.getProfile();
  if (!profile) return { ok: false, reason: 'no_profile' };
  if (profile.themeId === themeId || (themeId === 'default' && !profile.themeId)) {
    return { ok: false, reason: 'already_owned' };
  }
  if (themeId !== 'default') {
    const result = spend(DOTORI_PRICES.theme_buy);
    if (!result.ok) return result;
    db.updateProfile({ themeId });
    return result;
  }
  db.updateProfile({ themeId: 'default' });
  return { ok: true, balance: profile.dotoriBalance };
}

export function buyProfileDeco(emoji: string): SpendResult {
  const profile = db.getProfile();
  if (!profile) return { ok: false, reason: 'no_profile' };
  if (profile.badgeEmoji === emoji) {
    return { ok: false, reason: 'already_owned' };
  }
  const result = spend(DOTORI_PRICES.profile_deco);
  if (!result.ok) return result;
  db.updateProfile({ badgeEmoji: emoji });
  return result;
}

export function sendDotoriGift(
  targetId: string,
  amount: (typeof DOTORI_GIFT_AMOUNTS)[number],
  message: string,
  anonymous = true,
): SpendResult {
  if (db.isBlocked(targetId)) return { ok: false, reason: 'limit' };
  const sentToday = db.countDotoriGiftsSentToday();
  if (sentToday >= 5) return { ok: false, reason: 'limit' };

  const result = spend(amount);
  if (!result.ok) return result;

  db.recordGiftSent(amount);
  void db.pushGiftToRemote(targetId, 'dotori', amount, null, message, anonymous);
  return result;
}

export function sendDecoGift(
  targetId: string,
  emoji: string,
  message: string,
  anonymous = true,
): SpendResult {
  if (db.isBlocked(targetId)) return { ok: false, reason: 'limit' };
  const sentToday = db.countDotoriGiftsSentToday();
  if (sentToday >= 5) return { ok: false, reason: 'limit' };

  const result = spend(DOTORI_PRICES.gift_deco);
  if (!result.ok) return result;

  db.recordGiftSent(0);
  void db.pushGiftToRemote(targetId, 'deco', 0, emoji, message, anonymous);
  return result;
}

export function sendThemeGift(
  targetId: string,
  themeId: ProfileThemeId,
  message: string,
  anonymous = true,
): SpendResult {
  const result = spend(DOTORI_PRICES.gift_theme);
  if (!result.ok) return result;
  db.recordGiftSent(0);
  void db.pushGiftToRemote(targetId, 'theme', 0, themeId, message, anonymous);
  return result;
}

export function sendMysteryGift(
  targetId: string,
  message: string,
  anonymous = true,
): SpendResult & { prize?: string } {
  const result = spend(DOTORI_PRICES.mystery_box);
  if (!result.ok) return result;
  db.recordGiftSent(0);
  const prizes = ['👑', '💫', '🌸', '1🌰'];
  const prize = prizes[Math.floor(Math.random() * prizes.length)] ?? '1🌰';
  void db.pushGiftToRemote(targetId, 'mystery', prize.includes('🌰') ? 1 : 0, prize, message, anonymous);
  return { ...result, prize };
}

export function buyFakeHintDefense(): SpendResult {
  if (db.hasFakeHintActive()) return { ok: false, reason: 'already_owned' };
  const result = spend(DOTORI_PRICES.fake_hint);
  if (!result.ok) return result;
  db.activateFakeHint();
  return result;
}

export function buySurnameBlurDefense(): SpendResult {
  if (db.hasSurnameBlurActive()) return { ok: false, reason: 'already_owned' };
  const result = spend(DOTORI_PRICES.surname_blur);
  if (!result.ok) return result;
  db.activateSurnameBlur();
  return result;
}

export function buyNominationErase(voterId: string): SpendResult {
  const profile = db.getProfile();
  if (!profile) return { ok: false, reason: 'no_profile' };
  if (!db.canEraseNominationToday()) return { ok: false, reason: 'limit' };

  const today = todayDateStr();
  const nominations = db.getNominations(profile.id, today);
  if (!nominations.some((n) => n.voterId === voterId)) {
    return { ok: false, reason: 'already_owned' };
  }

  const result = spend(DOTORI_PRICES.nomination_erase);
  if (!result.ok) return result;

  db.eraseNomination(profile.id, voterId, today);
  db.recordNominationErase();
  return result;
}

export function getMyGifts(): DotoriGift[] {
  return db.getGiftInbox();
}

export function getUnopenedGiftCount(): number {
  return db.getGiftInbox().filter((gift) => !gift.opened).length;
}

export function openGift(giftId: string): DotoriGift | null {
  const gift = db.openGift(giftId);
  if (!gift) return null;
  if (gift.giftType === 'dotori' && gift.amount) {
    db.addDotori(gift.amount);
  }
  if (gift.giftType === 'deco' && gift.decoEmoji) {
    db.updateProfile({ badgeEmoji: gift.decoEmoji });
  }
  return gift;
}

export function getRevealedHints(targetId: string, surname: string): string[] {
  if (hasSurnameLetterUnlock(targetId)) {
    const letter = surname.trim().charAt(0).toUpperCase();
    return [`${letter}…`];
  }
  return [];
}

export function getPurchasedHintTexts(targetId: string, surname: string): string[] {
  const shields = getTargetHintShields(targetId, surname);
  return getUnlockedShieldsForTarget(targetId).map((shield) => shields[shield]);
}

export { getTargetHintShields, getUnlockedShieldsForTarget, todayDateStr };
