import { useState } from 'react';
import { blockUser, reportUser } from '@/lib/moderation';
import { vi } from '@/i18n/vi';

interface ReportSheetProps {
  targetUserId: string;
  onClose: () => void;
  onDone?: () => void;
}

export function ReportSheet({ targetUserId, onClose, onDone }: ReportSheetProps) {
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');

  const handleReport = () => {
    reportUser(targetUserId, reason);
    setMessage(vi.moderation.submitted);
    window.setTimeout(() => {
      onDone?.();
      onClose();
    }, 1200);
  };

  const handleBlock = () => {
    blockUser(targetUserId);
    setMessage(vi.moderation.blocked);
    window.setTimeout(() => {
      onDone?.();
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4">
      <div className="diary-panel w-full max-w-md p-4">
        <h2 className="mb-3 text-sm font-bold">{vi.moderation.reportTitle}</h2>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value.slice(0, 100))}
          placeholder={vi.moderation.reportReason}
          className="diary-border mb-3 w-full px-3 py-2 text-sm"
          rows={3}
        />
        {message && <p className="mb-2 text-xs text-emerald-700">{message}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleReport}
            className="pencil-btn-secondary"
          >
            {vi.moderation.submit}
          </button>
          <button
            type="button"
            onClick={handleBlock}
            className="pencil-btn-danger"
          >
            {vi.moderation.block}
          </button>
          <button type="button" onClick={onClose} className="px-3 text-xs text-slate-500">
            {vi.home.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}
