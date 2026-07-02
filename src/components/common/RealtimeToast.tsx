import { useEffect, useState } from 'react';

interface ToastMessage {
  id: number;
  text: string;
}

let toastId = 0;

export function RealtimeToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    // 데모: 3초 후 가입 알림, 6초 후 새 글 알림
    timers.push(
      setTimeout(() => {
        const id = ++toastId;
        setToasts((prev) => [...prev, { id, text: '같은반 친구가 들어왔습니다.' }]);
        timers.push(
          setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
          }, 4000),
        );
      }, 3000),
    );

    timers.push(
      setTimeout(() => {
        const id = ++toastId;
        setToasts((prev) => [
          ...prev,
          { id, text: '학교게시판에 새로운 글이 올라왔습니다.' },
        ]);
        timers.push(
          setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
          }, 4000),
        );
      }, 6000),
    );

    return () => timers.forEach(clearTimeout);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed left-0 right-0 top-2 z-40 flex flex-col items-center gap-2 px-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="diary-border pointer-events-auto w-full max-w-md rounded-lg bg-white px-4 py-3 text-center text-sm font-medium shadow-md"
        >
          {toast.text}
        </div>
      ))}
    </div>
  );
}
