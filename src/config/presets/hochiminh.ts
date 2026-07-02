/**
 * Preset Hồ Chí Minh — trường THPT demo
 */
import type { LoggedInUserConfig, AffiliateItemConfig } from '@/config/app-content.types';

export const REGION_ID = 'hochiminh';
export const REGION_LABEL = 'Hồ Chí Minh';

export const REGION = {
  city: 'Ho Chi Minh',
  cityVi: 'Hồ Chí Minh',
  timezone: 'Asia/Ho_Chi_Minh',
  defaultSchool: 'THPT Marie Curie',
  defaultClass: 'Lớp 11A',
  district: 'Quận 3',
};

export const LOGGED_IN_ZALO_USER: LoggedInUserConfig = {
  id: 'zalo-hcm-marie-11a-001',
  name: 'Nguyễn Minh Anh',
  avatar: undefined,
};

export const SCHOOLS = [
  'THPT Marie Curie',
  'THPT Lê Hồng Phong',
  'THPT Nguyễn Thị Minh Khai',
  'THPT Trần Phú',
  'THPT Phổ Thông Năng Khiếu',
  'THPT Bùi Thị Xuân',
  'THPT Gia Định',
  'THPT Lương Thế Vinh',
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

export const DEFAULT_STATUS_MESSAGE = 'Hôm nay có ai nhìn mình rồi cười...';
export const DEFAULT_DOTORI_BALANCE = 5;
export const DEFAULT_VISIT_TODAY = 24;
export const DEFAULT_VISIT_TOTAL = 1204;

export const DEFAULT_HINT = {
  gender: 'female' as const,
  heightRange: '160-165',
  mbtiPrefix: 'E',
  commute: 'motorbike' as const,
};

export const VOTE_QUESTIONS = [
  'Ai là người nổi bật nhất lớp?',
  'Ai là người trầm nhất?',
  'Ai hợp làm người yêu nhất?',
  'Ai là người hài hước nhất?',
  'Ai học giỏi nhất?',
  'Ai chơi thể thao giỏi nhất?',
  'Ai hát hay nhất?',
  'Ai mặc đẹp nhất?',
  'Ai tốt bụng nhất?',
  'Ai giữ bí mật tốt nhất?',
  'Ai hay gặp nhất ở căng tin?',
  'Ai sẽ thành công nhất sau này?',
];

export const CLASSMATES_SEED = [
  { id: 'cm-01', realName: 'Trần Văn Bình', surname: 'Trần', statusMessage: 'Tan học chạy xe về', hint: { gender: 'male' as const, heightRange: '168-172', mbtiPrefix: 'I', commute: 'motorbike' as const } },
  { id: 'cm-02', realName: 'Lê Thị Hương', surname: 'Lê', statusMessage: 'Làm bài toán chưa?', hint: { gender: 'female' as const, heightRange: '160-165', mbtiPrefix: 'E', commute: 'motorbike' as const } },
  { id: 'cm-03', realName: 'Phạm Quốc Huy', surname: 'Phạm', statusMessage: 'Hội thể thao vô địch', hint: { gender: 'male' as const, heightRange: '170-175', mbtiPrefix: 'E', commute: 'walk' as const } },
  { id: 'cm-04', realName: 'Hoàng Minh Tú', surname: 'Hoàng', statusMessage: 'Mua trà sữa đi', hint: { gender: 'male' as const, heightRange: '165-170', mbtiPrefix: 'E', commute: 'bicycle' as const } },
  { id: 'cm-05', realName: 'Đặng Thu Hà', surname: 'Đặng', statusMessage: 'K-pop số 1', hint: { gender: 'female' as const, heightRange: '158-162', mbtiPrefix: 'I', commute: 'bus' as const } },
  { id: 'cm-06', realName: 'Võ Thanh Như', surname: 'Võ', statusMessage: 'Thi trượt rồi huhu', hint: { gender: 'female' as const, heightRange: '163-167', mbtiPrefix: 'I', commute: 'walk' as const } },
  { id: 'cm-07', realName: 'Nguyễn Đức Anh', surname: 'Nguyễn', statusMessage: 'Đi Bến Thành ăn', hint: { gender: 'male' as const, heightRange: '172-176', mbtiPrefix: 'E', commute: 'bicycle' as const } },
  { id: 'cm-08', realName: 'Phan Thị Mai', surname: 'Phan', statusMessage: 'Ai đi cafe hôm nay', hint: { gender: 'female' as const, heightRange: '161-165', mbtiPrefix: 'E', commute: 'motorbike' as const } },
  { id: 'cm-09', realName: 'Đỗ Minh Khang', surname: 'Đỗ', statusMessage: 'Tập bóng đá', hint: { gender: 'male' as const, heightRange: '175-180', mbtiPrefix: 'E', commute: 'motorbike' as const } },
  { id: 'cm-10', realName: 'Bùi Thảo Vy', surname: 'Bùi', statusMessage: 'Đang quay TikTok', hint: { gender: 'female' as const, heightRange: '159-163', mbtiPrefix: 'E', commute: 'bus' as const } },
  { id: 'cm-11', realName: 'Huỳnh Quốc Bảo', surname: 'Huỳnh', statusMessage: 'Bị cấm chơi game', hint: { gender: 'male' as const, heightRange: '169-173', mbtiPrefix: 'I', commute: 'walk' as const } },
  { id: 'cm-12', realName: 'Lý Ngọc Hân', surname: 'Lý', statusMessage: 'Đi thư viện', hint: { gender: 'female' as const, heightRange: '164-168', mbtiPrefix: 'I', commute: 'bicycle' as const } },
];

export const SEED_VISITORS = [
  { id: 'cm-02', surname: 'Lê' },
  { id: 'cm-03', surname: 'Phạm' },
  { id: 'cm-07', surname: 'Nguyễn' },
];

export const SEED_DIARY_POSTS = [
  { authorId: 'zalo-hcm-marie-11a-001', content: 'Thitrượt', hasPhoto: false, hasVideo: false, hasLink: false },
  { authorId: 'zalo-hcm-marie-11a-001', content: 'Nhìnnhaukk', hasPhoto: false, hasVideo: false, hasLink: false },
];

export const SEED_SCHOOL_POSTS = [
  {
    authorId: 'cm-03',
    content: 'Hôm nay ai hút thuốc sau căng tin tầng 2 gặp thầy hiệu trưởng vậy =)))',
    hasPhoto: true,
    hasVideo: false,
    hasLink: true,
  },
  {
    authorId: 'cm-02',
    content: 'Ngày mai Marie Curie hội thao sẵn sàng chưa? Sân Quận 3 7h!',
    hasPhoto: false,
    hasVideo: true,
    hasLink: false,
  },
  {
    authorId: 'cm-10',
    content: 'Ai la to trước Landmark 81 vậy, nghe hết cả lớp',
    hasPhoto: true,
    hasVideo: false,
    hasLink: false,
  },
  {
    authorId: 'cm-06',
    content: 'Tocotoco mới bên căng tin ngon lắm nha',
    hasPhoto: false,
    hasVideo: false,
    hasLink: true,
  },
  {
    authorId: 'cm-11',
    content: 'Lớp Lê Hồng Phong đừng vào bảng tin trường mình nữa =))',
    hasPhoto: false,
    hasVideo: false,
    hasLink: false,
  },
];

export const SEED_GUESTBOOK_POSTS = [
  { authorId: 'cm-04', content: 'Nhật ký đẹp quá kk', targetUserId: 'zalo-hcm-marie-11a-001' },
  { authorId: 'cm-08', content: 'Đicafekhông?', targetUserId: 'zalo-hcm-marie-11a-001' },
];

export const SEED_VOTE_POSTS = [
  { authorId: 'cm-01', content: 'Bỏ phiếu hôm nay: Ai nổi bật nhất?' },
  { authorId: 'cm-05', content: 'Kết quả bỏ phiếu hôm qua cười chết =))' },
];

export const SEED_CALENDAR = [
  { date: '2026-07-01', content: 'Nhìn nhau cười' },
  { date: '2026-07-02', content: 'Bực mình quá' },
  { date: '2026-07-03', content: 'Hội thao vui' },
];

export const SEED_PHOTO_CAPTION = 'BFF cùng lớp';
export const SEED_PHOTO_URL = '/photo-album-default.svg';

export const SEED_PHOTO_GALLERY = [
  { id: 'photo-1', imageUrl: SEED_PHOTO_URL, caption: 'BFF cùng lớp' },
  { id: 'photo-2', imageUrl: SEED_PHOTO_URL, caption: 'Hội thao vui' },
  { id: 'photo-3', imageUrl: SEED_PHOTO_URL, caption: 'Căng tin trưa' },
  { id: 'photo-4', imageUrl: SEED_PHOTO_URL, caption: 'Sau giờ học' },
] as const;

export const AFFILIATE_ITEMS: AffiliateItemConfig[] = [
  {
    id: 'hcm-1',
    name: 'Trà sữa Tocotoco',
    emoji: '🧋',
    price: '25k',
    url: 'https://shopee.vn/search?keyword=tocotoco',
    platform: 'shopee',
  },
  {
    id: 'hcm-2',
    name: 'Mũ bảo hiểm',
    emoji: '🪖',
    price: '150k',
    url: 'https://shopee.vn/search?keyword=mũ+bảo+hiểm',
    platform: 'shopee',
  },
  {
    id: 'hcm-3',
    name: 'Album K-pop',
    emoji: '💿',
    price: '320k',
    url: 'https://shopee.vn/search?keyword=kpop+album',
    platform: 'shopee',
  },
  {
    id: 'hcm-4',
    name: 'Hostel Bến Thành',
    emoji: '🏨',
    price: '200k/đêm',
    url: 'https://www.agoda.com/search?city=13170',
    platform: 'agoda',
  },
  {
    id: 'hcm-5',
    name: 'Hot TikTok',
    emoji: '🎵',
    price: '49k',
    url: 'https://shop.tiktok.com',
    platform: 'tiktok',
  },
  {
    id: 'hcm-6',
    name: 'Balo học sinh',
    emoji: '🎒',
    price: '89k',
    url: 'https://shopee.vn/search?keyword=balo+học+sinh',
    platform: 'shopee',
  },
];

export const OFFERWALL_URLS = {
  shopee: 'https://shopee.vn',
  tiktok: 'https://www.tiktok.com',
  lazada: 'https://www.lazada.vn',
};

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

export const REALTIME_MESSAGES = {
  memberJoined: 'Bạn cùng lớp vừa vào.',
  newSchoolPost: 'Có bài mới trên bảng tin trường.',
  voteNomination: 'Ai đó đã chọn bạn.',
};

export const APP_META = {
  name: 'Nhật ký của bạn',
  nameKo: 'Nhật ký của bạn',
  slogan: '100% ẩn danh — điều tra lớp học bằng Họ và nhật ký',
};
