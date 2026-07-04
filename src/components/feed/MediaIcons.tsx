import type { FeedPost } from '@/types';

export function MediaIcons({ post }: { post: FeedPost }) {
  return (
    <span className="ml-1 inline-flex gap-0.5">
      {post.hasPhoto && <span>📸</span>}
      {post.hasVideo && <span>🎥</span>}
      {post.hasLink && <span>🔗</span>}
    </span>
  );
}
