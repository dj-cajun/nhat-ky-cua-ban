import type { FeedPost } from '@/types';
import { useSetAtom } from 'jotai';
import { mockStrangerUser } from '@/lib/mock-data';
import { showInterstitialAd } from '@/lib/zalo-ads';
import { strangerUserAtom, viewModeAtom } from '@/stores/atoms';

interface FeedDetailModalProps {
  post: FeedPost;
  onClose: () => void;
}

export function FeedDetailModal({ post, onClose }: FeedDetailModalProps) {
  const setViewMode = useSetAtom(viewModeAtom);
  const setStrangerUser = useSetAtom(strangerUserAtom);

  const handleWarp = async () => {
    await showInterstitialAd();
    setStrangerUser({ ...mockStrangerUser, id: post.authorId });
    setViewMode('stranger');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#faf9f6]">
      <header className="diary-border flex items-center justify-between p-3">
        <button type="button" onClick={onClose} className="text-sm font-bold">
          ← 닫기
        </button>
        <span className="text-sm font-bold">상세</span>
        <span className="w-10" />
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        <button
          type="button"
          onClick={() => void handleWarp()}
          className="mb-3 text-sm font-bold underline"
        >
          🤫 익명 / Ẩn danh
        </button>

        <p className="mb-4 whitespace-pre-line text-base leading-relaxed">{post.content}</p>

        {(post.hasPhoto || post.hasVideo) && (
          <div className="diary-border mb-4 flex aspect-video items-center justify-center rounded-lg bg-slate-100">
            {post.hasPhoto && <span className="text-4xl">📸 미디어</span>}
            {post.hasVideo && <span className="text-4xl">🎥 영상</span>}
          </div>
        )}

        <section className="diary-panel p-3">
          <h4 className="mb-2 text-sm font-bold">댓글</h4>
          <div className="mb-3 space-y-2">
            <div className="text-xs">
              <button type="button" className="font-bold underline">
                🤫 익명
              </button>
              <span className="ml-2">ㅋㅋㅋ 진짜냐</span>
            </div>
          </div>
          <input
            type="text"
            placeholder="익명 댓글..."
            className="diary-border w-full rounded px-3 py-2 text-sm"
          />
        </section>
      </div>
    </div>
  );
}
