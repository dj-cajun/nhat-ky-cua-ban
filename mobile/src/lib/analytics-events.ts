/**
 * Beta analytics — event names only. Never attach content bodies.
 */
export const AnalyticsEvents = {
  onboarding_completed: 'onboarding_completed',
  circle_creation_completed: 'circle_creation_completed',
  circle_join_approved: 'circle_join_approved',
  circle_opened: 'circle_opened',
  diary_saved: 'diary_saved',
  diary_viewed: 'diary_viewed',
  notice_responded: 'notice_responded',
  anonymous_post_created: 'anonymous_post_created',
  private_note_sent: 'private_note_sent',
  spotify_track_saved: 'spotify_track_saved',
  report_submitted: 'report_submitted',
  block_created: 'block_created',
} as const;

export type AnalyticsEventName = (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents];

export type SafeAnalyticsAttrs = {
  market?: 'US';
  circle_id?: string;
  platform?: string;
  app_version?: string;
  has_music?: boolean;
  has_photo?: boolean;
  has_email?: boolean;
  sender_mode?: 'named' | 'alias';
  reason_code?: string;
};
