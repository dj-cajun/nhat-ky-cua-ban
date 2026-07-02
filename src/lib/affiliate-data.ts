export interface AffiliateItem {
  id: string;
  name: string;
  emoji: string;
  price: string;
  url: string;
  platform: 'shopee' | 'lazada' | 'tiktok' | 'agoda';
}

export const AFFILIATE_ITEMS: AffiliateItem[] = [
  {
    id: '1',
    name: '밀크티 쿠폰',
    emoji: '🧋',
    price: '25k',
    url: 'https://shopee.vn/search?keyword=milk%20tea',
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
    url: 'https://www.agoda.com/search?city=13170',
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
