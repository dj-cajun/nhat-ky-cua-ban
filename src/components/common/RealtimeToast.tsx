import { useRealtimeToasts } from '@/hooks/useRealtime';
import { useMessages } from '@/i18n';

export function RealtimeToast() {
  const t = useMessages();
  const toasts = useRealtimeToasts();

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed left-0 right-0 top-2 z-40 flex flex-col items-center gap-2 px-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`cy-card pointer-events-auto w-full max-w-md px-4 py-3 text-center text-sm font-medium ${
            toast.type === 'vote' ? 'bg-y2k-pink-light' : 'bg-white'
          }`}
        >
          {toast.text}
          {toast.hint && (
            <p className="mt-1 text-xs text-zinc-600">
              {t.realtime.hintLabel} {toast.hint}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
