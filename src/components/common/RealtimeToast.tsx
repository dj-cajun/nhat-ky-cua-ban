import { useRealtimeToasts } from '@/hooks/useRealtime';

export function RealtimeToast() {
  const toasts = useRealtimeToasts();

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed left-0 right-0 top-2 z-40 flex flex-col items-center gap-2 px-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`diary-border pointer-events-auto w-full max-w-md rounded-lg px-4 py-3 text-center text-sm font-medium shadow-md ${
            toast.type === 'vote' ? 'bg-amber-100' : 'bg-white'
          }`}
        >
          {toast.text}
          {toast.hint && (
            <p className="mt-1 text-xs text-slate-600">힌트: {toast.hint}</p>
          )}
        </div>
      ))}
    </div>
  );
}
