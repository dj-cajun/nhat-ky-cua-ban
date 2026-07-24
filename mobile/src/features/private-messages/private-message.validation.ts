import { AppError } from '@/types/domain';

export const NOTE_BODY_MAX = 300;

export function validatePrivateMessageBody(body: string): void {
  const trim = body.trim();
  if (trim.length < 1 || trim.length > NOTE_BODY_MAX) {
    throw new AppError('VALIDATION', 'Write 1–300 characters.');
  }
  if (/https?:\/\//i.test(trim) || /www\./i.test(trim)) {
    throw new AppError('VALIDATION', 'Links aren’t allowed.');
  }
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(trim)) {
    throw new AppError('VALIDATION', 'Email addresses aren’t allowed.');
  }
  if (trim.replace(/\D/g, '').length >= 7) {
    throw new AppError('VALIDATION', 'Phone numbers aren’t allowed.');
  }
  if (/(.)\1{9,}/.test(trim)) {
    throw new AppError('VALIDATION', 'That text looks spammy.');
  }
  if (/@\w{2,}/.test(trim)) {
    throw new AppError('VALIDATION', 'Mentions aren’t allowed.');
  }
}

/** Coarse relative time — no second-level precision. */
export function formatNoteRelativeTime(iso: string, now = Date.now()): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '';
  const diff = Math.max(0, now - t);
  const mins = Math.floor(diff / 60_000);
  if (mins < 5) return 'Just now';
  if (mins < 60) return `${Math.floor(mins / 5) * 5} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
