/** US product copy — Your Diary (English-first App Store / Play Store) */

export const APP_NAME = 'Your Diary';
export const APP_TAGLINE =
  'A small circle opened by three people you trust — then visit the days of people you know.';

export const DEFAULT_TIMEZONE = 'America/New_York';

export const en = {
  brand: APP_NAME,
  tagline: APP_TAGLINE,

  auth: {
    chooseSignIn: 'Choose how to continue',
    apple: 'Continue with Apple',
    google: 'Continue with Google',
    email: 'Continue with email',
    demo: 'Try the demo',
    comingSoon: 'Coming soon',
    appleNote: 'Apple Sign In will be enabled in a development build.',
    googleNote: 'Google Sign In will be available with the Android build.',
    noAccount: "Don't have an account? Sign up",
    signUpTitle: 'Sign up',
    signUpSub: 'Continue with email, Apple, or the demo.',
    backToSignIn: 'Back to sign in',
    invalidEmail: 'Enter a valid email address.',
  },

  onboarding: {
    title: 'Tell us who you are',
    sub: 'You can use your personal diary even before joining a circle.',
    displayName: 'Name or display name',
    placeholder: 'e.g. Maya',
    terms: 'I agree to the Terms of Service and Privacy Policy',
    termsRequired: 'Please agree to the terms to continue.',
    nameRequired: 'Please enter a name.',
    createDiary: 'Create my diary',
  },

  tabs: {
    universe: 'My Universe',
    notifications: 'Alerts',
    diary: 'Diary',
  },

  universe: {
    brand: 'My Universe',
    title: 'Map of your circles',
    createCircle: 'Create a circle (with 2 friends)',
    wroteToday: (n: number) => `${n} wrote today`,
    notice: 'Notice',
  },

  notifications: {
    title: 'Alerts',
    sub: 'Pioneer invites, recommendations, notices, and notes only. No visit or view-count alerts.',
    empty: 'No alerts yet.',
  },

  diary: {
    brand: APP_NAME,
    noMood: 'No mood set today',
    tenChar: '10-character note',
    shortText: 'Short entry',
    emptyToday: 'Nothing written for today yet.',
    editToday: 'Edit today',
    editOrView: 'Edit today / open full diary',
    mood: 'Mood',
    save: 'Save',
    back: '← Back',
    privateBlocked: "This entry isn't shared with you.",
    guestbook: 'Guestbook',
    past: 'Past entries',
    album: 'Photo album',
  },

  moods: {
    happy: 'Happy',
    calm: 'Calm',
    tired: 'Tired',
    excited: 'Excited',
    sad: 'Sad',
    anxious: 'Anxious',
    grateful: 'Grateful',
    neutral: 'Okay',
  },

  circle: {
    createTitle: 'Create a circle',
    createSub:
      'One person can’t open a circle alone. Both friends must accept before it opens.',
    tempName: 'Working name',
    namePlaceholder: 'e.g. Friday study',
    pickTwo: (n: number) => `Invite two pioneers (${n}/2)`,
    sendInvites: 'Send pioneer invites',
    demoHint: 'In demo mode, both friends accept immediately under the same server rules.',
    nameRequired: 'Enter a circle name.',
    pickRequired: 'Choose two people to pioneer with.',
    cancel: '← Cancel',
    backUniverse: '← Universe',
    members: 'Members',
    pioneer: 'Pioneer',
    settings: 'Circle settings',
    noticePoll: 'Notices & polls',
    anonymousBoard: 'Alias board',
    forbiddenTitle: "You can't open this",
    forbiddenSub: 'Only circle members can view this space.',
    toUniverse: '← Back to universe',
    memberCount: (n: number) => `${n} members`,
    draftTitle: 'Pioneer draft',
    draftSub:
      'A formal circle is created only after all three accept, via open_circle_from_draft.',
    settingsTitle: 'Circle settings',
    settingsSub: 'Name, color, symbol, leave, and notification prefs come next.',
    membersSub: 'In-circle member search comes in a later step.',
    noticeTitle: 'Notices & polls',
    noticeSub:
      'One active item per circle. Individual votes stay private; only totals are shown.',
    aliasTitle: 'Alias board',
    aliasSub:
      'Ship report/block/moderation tools before alias posting. Real author IDs stay off the client.',
  },

  messages: {
    title: 'Notes',
    sub: 'No chat rooms — named or alias one-off notes only, with server rate limits.',
    detail: 'Note',
  },

  reports: {
    title: 'Report',
    sub: 'We keep a content snapshot so reviews still work after edits or deletes. Required before alias features.',
  },

  guestbook: {
    title: 'Guestbook',
    sub: 'Preview the latest 3. No photos or links. Report and block paths come next.',
  },

  calendar: {
    title: 'Past entries',
    sub: 'Calendar loads when opened. Dates use entry_date + timezone.',
  },

  album: {
    title: 'Photo album',
    sub: 'Thumbnails in lists; full images only in detail. Strip EXIF; Storage path must match auth.uid().',
  },

  errors: {
    network: 'Check your network connection.',
    auth: 'Please sign in.',
    forbidden: "You don't have permission for this.",
    conflictDiary: 'You already have an entry for this date. Edit the existing one?',
    rateLimited: 'Please try again in a moment.',
    unknown: 'Something went wrong. Please try again.',
    alreadyHandled: 'This request was already handled.',
  },
} as const;
