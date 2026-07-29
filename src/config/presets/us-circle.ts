/**
 * Preset — Your Diary US demo circle (EN seed; UI chrome EN/KO via i18n)
 */
import type { LoggedInUserConfig, AffiliateItemConfig } from '@/config/app-content.types';

export const REGION_ID = 'us-circle';
export const REGION_LABEL = 'United States';

export const REGION = {
  city: 'New York',
  cityVi: 'New York',
  timezone: 'America/New_York',
  /** Display: circle group (legacy field schoolName) */
  defaultSchool: 'Close circle',
  /** Display: working name (legacy field className) */
  defaultClass: 'Weekend crew',
  district: 'Brooklyn',
};

export const LOGGED_IN_ZALO_USER: LoggedInUserConfig = {
  id: 'demo-user-maya',
  name: 'Maya',
  avatar: undefined,
};

/** Circle group presets (legacy SCHOOLS picker) */
export const SCHOOLS = [
  'Close circle',
  'College friends',
  'Work friends',
  'Roommates',
  'Study group',
  'Weekend crew',
];

/** Working names (legacy CLASSES picker) */
export const CLASSES = [
  'Weekend crew',
  'Friday study',
  'Apartment 4B',
  'Coffee club',
  'Night writers',
  'Studio friends',
];

export const DEFAULT_STATUS_MESSAGE = 'Someone smiled at me today…';
export const DEFAULT_DOTORI_BALANCE = 5;
export const DEFAULT_VISIT_TODAY = 3;
export const DEFAULT_VISIT_TOTAL = 42;

export const DEFAULT_HINT = {
  gender: 'female' as const,
  heightRange: '160-165',
  mbtiPrefix: 'E',
  commute: 'walk' as const,
};

export const VOTE_QUESTIONS = [
  'Who’s the most noticeable in the circle?',
  'Who’s the quietest?',
  'Who would make the best partner?',
  'Who’s the funniest?',
  'Who’s the best listener?',
  'Who’s the most athletic?',
  'Who sings best?',
  'Who has the best style?',
  'Who’s the kindest?',
  'Who keeps secrets best?',
  'Who do you run into most often?',
  'Who will thrive the most later?',
];

export const CLASSMATES_SEED = [
  {
    id: 'cm-01',
    realName: 'Sam',
    surname: 'Sam',
    statusMessage: 'Heading home after work',
    hint: {
      gender: 'male' as const,
      heightRange: '168-172',
      mbtiPrefix: 'I',
      commute: 'bus' as const,
    },
  },
  {
    id: 'cm-02',
    realName: 'Minseo',
    surname: 'Min',
    statusMessage: 'Finished that problem set?',
    hint: {
      gender: 'female' as const,
      heightRange: '160-165',
      mbtiPrefix: 'E',
      commute: 'walk' as const,
    },
  },
  {
    id: 'cm-03',
    realName: 'Junho',
    surname: 'Jun',
    statusMessage: 'Pickup game later',
    hint: {
      gender: 'male' as const,
      heightRange: '170-175',
      mbtiPrefix: 'E',
      commute: 'walk' as const,
    },
  },
  {
    id: 'cm-04',
    realName: 'Casey',
    surname: 'Casey',
    statusMessage: 'Coffee run?',
    hint: {
      gender: 'female' as const,
      heightRange: '165-170',
      mbtiPrefix: 'E',
      commute: 'bicycle' as const,
    },
  },
  {
    id: 'cm-05',
    realName: 'Seoyeon',
    surname: 'Seo',
    statusMessage: 'New playlist drop',
    hint: {
      gender: 'female' as const,
      heightRange: '158-162',
      mbtiPrefix: 'I',
      commute: 'bus' as const,
    },
  },
  {
    id: 'cm-06',
    realName: 'Alex',
    surname: 'Alex',
    statusMessage: 'That quiz wrecked me',
    hint: {
      gender: 'male' as const,
      heightRange: '163-167',
      mbtiPrefix: 'I',
      commute: 'walk' as const,
    },
  },
  {
    id: 'cm-07',
    realName: 'Jordan',
    surname: 'Jordan',
    statusMessage: 'Brunch downtown?',
    hint: {
      gender: 'male' as const,
      heightRange: '172-176',
      mbtiPrefix: 'E',
      commute: 'bicycle' as const,
    },
  },
  {
    id: 'cm-08',
    realName: 'Riley',
    surname: 'Riley',
    statusMessage: 'Anyone free tonight',
    hint: {
      gender: 'female' as const,
      heightRange: '161-165',
      mbtiPrefix: 'E',
      commute: 'walk' as const,
    },
  },
  {
    id: 'cm-09',
    realName: 'Taylor',
    surname: 'Taylor',
    statusMessage: 'At the park',
    hint: {
      gender: 'male' as const,
      heightRange: '175-180',
      mbtiPrefix: 'E',
      commute: 'bus' as const,
    },
  },
  {
    id: 'cm-10',
    realName: 'Quinn',
    surname: 'Quinn',
    statusMessage: 'Editing a reel',
    hint: {
      gender: 'female' as const,
      heightRange: '159-163',
      mbtiPrefix: 'E',
      commute: 'bus' as const,
    },
  },
  {
    id: 'cm-11',
    realName: 'Drew',
    surname: 'Drew',
    statusMessage: 'Phone on silent',
    hint: {
      gender: 'male' as const,
      heightRange: '169-173',
      mbtiPrefix: 'I',
      commute: 'walk' as const,
    },
  },
  {
    id: 'cm-12',
    realName: 'Yujin',
    surname: 'Yu',
    statusMessage: 'At the library',
    hint: {
      gender: 'female' as const,
      heightRange: '164-168',
      mbtiPrefix: 'I',
      commute: 'bicycle' as const,
    },
  },
];

export const SEED_VISITORS = [
  { id: 'cm-02', surname: 'Min' },
  { id: 'cm-03', surname: 'Jun' },
  { id: 'cm-04', surname: 'Casey' },
];

export const SEED_DIARY_POSTS = [
  {
    authorId: 'demo-user-maya',
    content: 'bombed that quiz lol',
    hasPhoto: false,
    hasVideo: false,
    hasLink: false,
  },
  {
    authorId: 'demo-user-maya',
    content: 'caught each other smiling =))',
    hasPhoto: false,
    hasVideo: false,
    hasLink: false,
  },
];

export const SEED_SCHOOL_POSTS = [
  {
    authorId: 'cm-03',
    content: 'Who’s joining the park meetup after work? Bring a speaker.',
    hasPhoto: true,
    hasVideo: false,
    hasLink: true,
  },
  {
    authorId: 'cm-02',
    content: 'Spotify circle playlist is live — drop one song tonight.',
    hasPhoto: false,
    hasVideo: true,
    hasLink: false,
  },
  {
    authorId: 'cm-10',
    content: 'Someone laughed so loud outside the cafe I heard it inside',
    hasPhoto: true,
    hasVideo: false,
    hasLink: false,
  },
  {
    authorId: 'cm-06',
    content: 'New coffee place by the station is actually good',
    hasPhoto: false,
    hasVideo: false,
    hasLink: true,
  },
  {
    authorId: 'cm-11',
    content: 'Quiet night in — who’s writing today?',
    hasPhoto: false,
    hasVideo: false,
    hasLink: false,
  },
];

export const SEED_GUESTBOOK_POSTS = [
  {
    authorId: 'cm-04',
    content: 'Your diary looks cozy',
    targetUserId: 'demo-user-maya',
  },
  {
    authorId: 'cm-08',
    content: 'Coffee this week?',
    targetUserId: 'demo-user-maya',
  },
];

export const SEED_VOTE_POSTS = [
  { authorId: 'cm-01', content: 'Today’s vote: who’s most noticeable?' },
  { authorId: 'cm-05', content: 'Yesterday’s results were wild =))' },
];

export const SEED_CALENDAR = [
  { date: '2026-07-01', content: 'smiled a lot' },
  { date: '2026-07-02', content: 'rough day' },
  { date: '2026-07-03', content: 'park meetup' },
];

export const SEED_PHOTO_CAPTION = 'weekend crew';
export const SEED_PHOTO_URL = '/photo-album-default.svg';

export const SEED_PHOTO_GALLERY = [
  { id: 'photo-1', imageUrl: SEED_PHOTO_URL, caption: 'weekend crew' },
  { id: 'photo-2', imageUrl: SEED_PHOTO_URL, caption: 'park meetup' },
  { id: 'photo-3', imageUrl: SEED_PHOTO_URL, caption: 'coffee stop' },
  { id: 'photo-4', imageUrl: SEED_PHOTO_URL, caption: 'late night write' },
] as const;

/** Soft demo stubs — no Vietnam commerce */
export const AFFILIATE_ITEMS: AffiliateItemConfig[] = [
  {
    id: 'us-1',
    name: 'Iced latte',
    emoji: '☕',
    price: '$5',
    url: 'https://www.starbucks.com',
    platform: 'other',
  },
  {
    id: 'us-2',
    name: 'Spotify Premium',
    emoji: '🎵',
    price: '$11',
    url: 'https://www.spotify.com',
    platform: 'other',
  },
  {
    id: 'us-3',
    name: 'Notebook set',
    emoji: '📔',
    price: '$18',
    url: 'https://www.amazon.com',
    platform: 'other',
  },
];

export const OFFERWALL_URLS = {
  shopee: 'https://example.com/offers',
  tiktok: 'https://www.tiktok.com',
  lazada: 'https://example.com/offers',
};

export const EXTRA_PROFANITY_WORDS = [
  'fuck',
  'shit',
  'asshole',
  '시발',
  '씨발',
  '병신',
  '좆',
];

/** Fallback only — runtime prefers i18n getMessages().realtime */
export const REALTIME_MESSAGES = {
  memberJoined: 'A friend just joined.',
  newSchoolPost: 'New post on the circle board.',
  voteNomination: 'Someone named you.',
};

export const APP_META = {
  name: 'Your Diary',
  slogan: 'A small circle opened by three people you trust',
};
