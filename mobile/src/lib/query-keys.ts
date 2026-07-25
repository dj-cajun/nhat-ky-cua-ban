/**
 * Unified React Query keys — invalidate by feature after block / leave / report / Spotify.
 */
export const queryKeys = {
  session: ['session'] as const,
  featureFlags: ['feature-flags'] as const,

  universe: (userId: string) => ['universe', userId] as const,

  circle: (circleId: string) => ['circle', circleId] as const,
  circleMembers: (circleId: string) => ['circle', circleId, 'members'] as const,
  circleHome: (circleId: string) => ['circle', circleId, 'home'] as const,
  circleNotice: (circleId: string) => ['circle', circleId, 'notice'] as const,
  anonymousBoard: (circleId: string) => ['circle', circleId, 'anonymous-board'] as const,
  anonymousPreview: (circleId: string) => ['circle', circleId, 'anonymous-preview'] as const,
  presence: (circleId: string) => ['circle', circleId, 'presence'] as const,

  profile: (userId: string) => ['profile', userId] as const,
  diary: (userId: string, entryDate?: string) =>
    entryDate ? (['diary', userId, entryDate] as const) : (['diary', userId] as const),
  diaryMusic: (entryId: string) => ['diary-music', entryId] as const,
  album: (userId: string) => ['album', userId] as const,
  guestbook: (userId: string) => ['guestbook', userId] as const,

  messagesInbox: (userId: string) => ['messages', 'inbox', userId] as const,
  messagesSent: (userId: string) => ['messages', 'sent', userId] as const,
  message: (messageId: string) => ['messages', 'detail', messageId] as const,
  messagePrefs: (userId: string) => ['messages', 'prefs', userId] as const,

  blocks: (userId: string) => ['blocks', userId] as const,
  reports: (userId: string) => ['reports', userId] as const,
  orangeStatus: (circleId: string, postId: string) =>
    ['verified-response', circleId, postId] as const,

  opsReports: ['ops', 'reports'] as const,
  opsAudit: ['ops', 'audit'] as const,
} as const;
