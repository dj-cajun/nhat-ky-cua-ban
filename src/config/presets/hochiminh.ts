/**
 * 호치민(Hồ Chí Minh) 고등학교 데모 프리셋
 * 다른 지역으로 교체 시: app-content.ts에서 import 경로만 변경
 */
import type { LoggedInUserConfig, AffiliateItemConfig } from '@/config/app-content.types';

export const REGION_ID = 'hochiminh';
export const REGION_LABEL = '호치민 (Hồ Chí Minh)';

export const REGION = {
  city: 'Ho Chi Minh',
  cityVi: 'Hồ Chí Minh',
  timezone: 'Asia/Ho_Chi_Minh',
  defaultSchool: 'THPT Marie Curie',
  defaultClass: 'Lớp 11A',
  district: 'Quận 3',
};

// ─── 1. 로그인 유저 (Zalo 이미 로그인 가정) ───
export const LOGGED_IN_ZALO_USER: LoggedInUserConfig = {
  id: 'zalo-hcm-marie-11a-001',
  name: 'Nguyễn Minh Anh',
  avatar: undefined,
};

// ─── 2. 호치민 실제·유명 고등학교 ───
export const SCHOOLS = [
  'THPT Marie Curie',           // 마리 퀴리 (Quận 3)
  'THPT Lê Hồng Phong',         // 레홍퐁 (Quận 5)
  'THPT Nguyễn Thị Minh Khai',  // 응우옌 티 민 카이 (Quận 3)
  'THPT Trần Phú',              // 찬푸 (Quận 5)
  'THPT Phổ Thông Năng Khiếu',  // 능력우수고 (Quận 1)
  'THPT Bùi Thị Xuân',          // 부이 티 쑤안 (Quận 1)
  'THPT Gia Định',              // 자딘 (Bình Thạnh)
  'THPT Lương Thế Vinh',         // 루엉 테 빈 (Thủ Đức)
];

export const CLASSES = [
  'Lớp 10A',
  'Lớp 10B',
  'Lớp 10C',
  'Lớp 11A',
  'Lớp 11B',
  'Lớp 11C',
  'Lớp 12A',
  'Lớp 12B',
];

// ─── 3. 프로필 기본값 ───
export const DEFAULT_STATUS_MESSAGE = '오늘 나랑 눈 마주치고 웃은 애 있음...';
export const DEFAULT_DOTORI_BALANCE = 5;
export const DEFAULT_VISIT_TODAY = 24;
export const DEFAULT_VISIT_TOTAL = 1204;

export const DEFAULT_HINT = {
  gender: 'female' as const,
  heightRange: '160-165',
  mbtiPrefix: 'E',
  commute: 'motorbike' as const,
};

// ─── 4. 5시 투표 12문항 ───
export const VOTE_QUESTIONS = [
  '우리 반에서 가장 인싸인 사람은?',
  '가장 조용한 사람은?',
  '연애 상대로 가장 괜찮은 사람은?',
  '가장 웃긴 사람은?',
  '시험을 가장 잘 보는 사람은?',
  '운동을 가장 잘하는 사람은?',
  '노래를 가장 잘하는 사람은?',
  '패션 센스가 가장 좋은 사람은?',
  '가장 친절한 사람은?',
  '비밀을 가장 잘 지키는 사람은?',
  '매점에서 가장 자주 보이는 사람은?',
  '졸업 후 가장 성공할 사람은?',
];

// ─── 5. Marie Curie 11A 반 친구 12명 (투표 4지선다용) ───
export const CLASSMATES_SEED = [
  { id: 'cm-01', realName: 'Trần Văn Bình', surname: 'Trần', statusMessage: '방과후 스쿠터 타고 감' },
  { id: 'cm-02', realName: 'Lê Thị Hương', surname: 'Lê', statusMessage: '수학 숙제 다 했나' },
  { id: 'cm-03', realName: 'Phạm Quốc Huy', surname: 'Phạm', statusMessage: '체육대회 우승각' },
  { id: 'cm-04', realName: 'Hoàng Minh Tú', surname: 'Hoàng', statusMessage: '밀크티 사줘' },
  { id: 'cm-05', realName: 'Đặng Thu Hà', surname: 'Đặng', statusMessage: 'K-pop 최고' },
  { id: 'cm-06', realName: 'Võ Thanh Như', surname: 'Võ', statusMessage: '시험 망함 ㅠ' },
  { id: 'cm-07', realName: 'Nguyễn Đức Anh', surname: 'Nguyễn', statusMessage: 'Bến Thành 맛집 탐방중' },
  { id: 'cm-08', realName: 'Phan Thị Mai', surname: 'Phan', statusMessage: '오늘 카페 갈사람' },
  { id: 'cm-09', realName: 'Đỗ Minh Khang', surname: 'Đỗ', statusMessage: 'bóng đá 연습' },
  { id: 'cm-10', realName: 'Bùi Thảo Vy', surname: 'Bùi', statusMessage: 'TikTok 찍는중' },
  { id: 'cm-11', realName: 'Huỳnh Quốc Bảo', surname: 'Huỳnh', statusMessage: '게임 금지됐다' },
  { id: 'cm-12', realName: 'Lý Ngọc Hân', surname: 'Lý', statusMessage: '도서관 가는중' },
];

// ─── 6. 초기 방문자 (성씨만 노출) ───
export const SEED_VISITORS = [
  { id: 'cm-02', surname: 'Lê' },
  { id: 'cm-03', surname: 'Phạm' },
  { id: 'cm-07', surname: 'Nguyễn' },
];

// ─── 7. 초기 게시글 ───
export const SEED_DIARY_POSTS = [
  { authorId: 'zalo-hcm-marie-11a-001', content: '수학시험망함', hasPhoto: false, hasVideo: false, hasLink: false },
  { authorId: 'zalo-hcm-marie-11a-001', content: '걔랑눈맞춤ㅋ', hasPhoto: false, hasVideo: false, hasLink: false },
];

export const SEED_SCHOOL_POSTS = [
  {
    authorId: 'cm-03',
    content: '오늘 2층 매점 뒤에서 담배 피우다 교장 선생님이랑 마주친 새끼 누구냐 ㅋㅋㅋ',
    hasPhoto: true,
    hasVideo: false,
    hasLink: true,
  },
  {
    authorId: 'cm-02',
    content: '내일 Marie Curie 체육대회 준비 다 했나? Quận 3 운동장 7시!',
    hasPhoto: false,
    hasVideo: true,
    hasLink: false,
  },
  {
    authorId: 'cm-10',
    content: 'Landmark 81 앞에서 누가 소리지른거야 다 들림',
    hasPhoto: true,
    hasVideo: false,
    hasLink: false,
  },
  {
    authorId: 'cm-06',
    content: 'Tocotoco 2층 매점 옆 새로 생긴거 먹어봤는데 개맛있음',
    hasPhoto: false,
    hasVideo: false,
    hasLink: true,
  },
  {
    authorId: 'cm-11',
    content: 'Lê Hồng Phong 애들이 우리 학교 게시판에 글쓰지마라 ㅋㅋ',
    hasPhoto: false,
    hasVideo: false,
    hasLink: false,
  },
];

export const SEED_GUESTBOOK_POSTS = [
  { authorId: 'cm-04', content: '다이어리 잘 꾸몄네 ㅋㅋ', targetUserId: 'zalo-hcm-marie-11a-001' },
  { authorId: 'cm-08', content: '오늘카페갈래?', targetUserId: 'zalo-hcm-marie-11a-001' },
];

export const SEED_VOTE_POSTS = [
  { authorId: 'cm-01', content: '오늘 투표: 가장 인싸인 사람은?' },
  { authorId: 'cm-05', content: '어제 투표 결과 개웃겼음 ㅋㅋ' },
];

// ─── 8. 캘린더·사진첩 시드 ───
export const SEED_CALENDAR = [
  { date: '2026-07-01', content: '걔랑눈맞춤' },
  { date: '2026-07-02', content: '오늘개빡침' },
  { date: '2026-07-03', content: '체육대회' },
];

export const SEED_PHOTO_CAPTION = '우리단짝단짝';

// ─── 9. 제휴 커머스 (호치민·10대 타깃) ───
export const AFFILIATE_ITEMS: AffiliateItemConfig[] = [
  {
    id: 'hcm-1',
    name: 'Tocotoco 밀크티',
    emoji: '🧋',
    price: '25k',
    url: 'https://shopee.vn/search?keyword=tocotoco',
    platform: 'shopee',
  },
  {
    id: 'hcm-2',
    name: '오토바이 헬멧',
    emoji: '🪖',
    price: '150k',
    url: 'https://shopee.vn/search?keyword=mũ+bảo+hiểm',
    platform: 'shopee',
  },
  {
    id: 'hcm-3',
    name: 'K-pop 앨범',
    emoji: '💿',
    price: '320k',
    url: 'https://shopee.vn/search?keyword=kpop+album',
    platform: 'shopee',
  },
  {
    id: 'hcm-4',
    name: 'Bến Thành 근처 호스텔',
    emoji: '🏨',
    price: '200k/박',
    url: 'https://www.agoda.com/search?city=13170',
    platform: 'agoda',
  },
  {
    id: 'hcm-5',
    name: '틱톡 인기템',
    emoji: '🎵',
    price: '49k',
    url: 'https://shop.tiktok.com',
    platform: 'tiktok',
  },
  {
    id: 'hcm-6',
    name: '학교가방',
    emoji: '🎒',
    price: '89k',
    url: 'https://shopee.vn/search?keyword=balo+học+sinh',
    platform: 'shopee',
  },
];

// ─── 10. 오퍼월 ───
export const OFFERWALL_URLS = {
  shopee: 'https://shopee.vn',
  tiktok: 'https://www.tiktok.com',
  lazada: 'https://www.lazada.vn',
};

// ─── 11. 비속어 추가 (베트남어·한국어) ───
export const EXTRA_PROFANITY_WORDS = [
  'ditme',
  'dmm',
  'clmm',
  'vl',
  'đụ',
  'cặc',
  'lồn',
  '시발',
  '씨발',
  '병신',
  '좆',
];

// ─── 12. 알림 문구 (베트남어 병기) ───
export const REALTIME_MESSAGES = {
  memberJoined: '같은반 친구가 들어왔습니다. / Bạn cùng lớp vừa vào.',
  newSchoolPost: '학교게시판에 새로운 글이 올라왔습니다. / Có bài mới trên bảng tin.',
  voteNomination: '누군가 당신을 지목했습니다. / Ai đó đã chọn bạn.',
};

// ─── 13. 앱 메타 ───
export const APP_META = {
  name: 'Nhật ký của bạn',
  nameKo: '너의 다이어리',
  slogan: '100% 익명으로 쓰고, 성씨와 일기로 훔쳐보는 우리 반 수사극',
};
