export type ReportTargetType =
  | 'profile'
  | 'diary_entry'
  | 'photo'
  | 'guestbook_entry'
  | 'circle_post'
  | 'message'
  | 'anonymous_post';

export type ReportReason =
  | 'harassment'
  | 'threat'
  | 'hate'
  | 'sexual_content'
  | 'privacy'
  | 'spam'
  | 'impersonation'
  | 'self_harm'
  | 'other';

export type ReportStatusInternal =
  | 'submitted'
  | 'reviewing'
  | 'resolved'
  | 'dismissed';

/** User-facing status (never exposes “dismissed” wording) */
export type ReportStatusPublic = 'received' | 'reviewing' | 'closed';

export type AccountStatus = 'active' | 'restricted' | 'suspended';

export type ModerationReport = {
  id: string;
  reporterId: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  details?: string;
  status: ReportStatusInternal;
  createdAt: string;
};

export type SubmitReportInput = {
  reporterId: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  details?: string;
  hideForMe?: boolean;
};
