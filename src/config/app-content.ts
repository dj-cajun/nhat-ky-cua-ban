/**
 * ============================================================
 *  넣을 내용 설정 파일 (운영자가 여기만 수정)
 *  Zalo 로그인은 앱 진입 시 이미 완료된 것으로 처리합니다.
 * ============================================================
 */

export interface LoggedInUserConfig {
  id: string;
  name: string;
  avatar?: string;
}

export interface AffiliateItemConfig {
  id: string;
  name: string;
  emoji: string;
  price: string;
  url: string;
  platform: 'shopee' | 'lazada' | 'tiktok' | 'agoda';
}

// ─── 1. Zalo 로그인 유저 (이미 로그인된 상태로 가정) ───
export const LOGGED_IN_ZALO_USER: LoggedInUserConfig = {
  id: 'zalo-user-001', // Zalo UID (나중에 실제 값으로 교체)
  name: 'Nguyễn Minh Anh', // 실명
  avatar: undefined, // 프로필 사진 URL (선택)
};

// ─── 2. 학교 · 학급 목록 (온보딩 선택지) ───
export const SCHOOLS = [
  'Marie Curie',
  'Lê Hồng Phong',
  'Nguyễn Thị Minh Khai',
  'Trần Phú',
  'Phổ Thông Năng Khiếu',
];

export const CLASSES = [
  'Lớp 10A',
  'Lớp 10B',
  'Lớp 11A',
  'Lớp 11B',
  'Lớp 12A',
  'Lớp 12B',
];

// ─── 3. 기본 프로필 문구 ───
export const DEFAULT_STATUS_MESSAGE = '오늘 나랑 눈 마주치고 웃은 애...';
export const DEFAULT_DOTORI_BALANCE = 5;

// ─── 4. 5시 투표 문항 (12개) ───
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

// ─── 5. 반 친구 목록 (투표 4지선다 실명 후보) ───
// 실제 서비스 시 같은 반 가입 유저로 대체됩니다.
export const CLASSMATES_SEED = [
  { id: 'cm-1', realName: 'Trần Văn Bình', surname: 'Trần', statusMessage: '방과후 스쿠터 타고 감' },
  { id: 'cm-2', realName: 'Lê Thị Hương', surname: 'Lê', statusMessage: '수학 숙제 다 했나' },
  { id: 'cm-3', realName: 'Phạm Quốc Huy', surname: 'Phạm', statusMessage: '체육대회 우승각' },
  { id: 'cm-4', realName: 'Hoàng Minh Tú', surname: 'Hoàng', statusMessage: '밀크티 사줘' },
  { id: 'cm-5', realName: 'Đặng Thu Hà', surname: 'Đặng', statusMessage: 'K-pop 최고' },
  { id: 'cm-6', realName: 'Võ Thanh Như', surname: 'Võ', statusMessage: '시험 망함' },
];

// ─── 6. 초기 게시글 (데모/시드) ───
export const SEED_SCHOOL_POSTS = [
  {
    authorId: 'cm-3',
    content: '오늘 2층 매점 뒤에서 담배 피우다 교장 선생님이랑 마주친 새끼 누구냐 진짜 개웃기네',
    hasPhoto: true,
    hasVideo: false,
    hasLink: true,
  },
  {
    authorId: 'cm-2',
    content: '내일 체육대회 준비 다 했나?',
    hasPhoto: false,
    hasVideo: true,
    hasLink: false,
  },
];

// ─── 7. 제휴 커머스 큐레이션 (딥링크·어필리에이트 URL) ───
export const AFFILIATE_ITEMS: AffiliateItemConfig[] = [
  {
    id: '1',
    name: '밀크티 쿠폰',
    emoji: '🧋',
    price: '25k',
    url: 'https://shopee.vn/search?keyword=milk%20tea', // ← AccessTrade 추적 URL로 교체
    platform: 'shopee',
  },
  {
    id: '2',
    name: '스쿠터 헬멧',
    emoji: '🪖',
    price: '150k',
    url: 'https://shopee.vn/search?keyword=helmet',
    platform: 'shopee',
  },
  {
    id: '3',
    name: 'K-pop 앨범',
    emoji: '💿',
    price: '320k',
    url: 'https://shopee.vn/search?keyword=kpop%20album',
    platform: 'shopee',
  },
  {
    id: '4',
    name: '호치민 호스텔',
    emoji: '🏨',
    price: '200k/박',
    url: 'https://www.agoda.com/search?city=13170', // ← Agoda 어필리에이트 URL
    platform: 'agoda',
  },
  {
    id: '5',
    name: '틱톡 인기템',
    emoji: '🎵',
    price: '49k',
    url: 'https://shop.tiktok.com',
    platform: 'tiktok',
  },
];

// ─── 8. 도토리 오퍼월 미션 URL ───
export const OFFERWALL_URLS = {
  shopee: 'https://shopee.vn', // ← AccessTrade/AdFlex 미션 URL
  tiktok: 'https://tiktok.com', // ← AdFlex 미션 URL
};

// ─── 9. 비속어 블랙리스트 (추가 금지어) ───
export const EXTRA_PROFANITY_WORDS: string[] = [
  // 베트남어·한국어 추가 금지어 입력
];

// ─── 10. Realtime 알림 문구 ───
export const REALTIME_MESSAGES = {
  memberJoined: '같은반 친구가 들어왔습니다.',
  newSchoolPost: '학교게시판에 새로운 글이 올라왔습니다.',
  voteNomination: '누군가 당신을 지목했습니다.',
};
