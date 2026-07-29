import { AFFILIATE_ITEMS } from '@/lib/affiliate-data';
import { vi } from '@/i18n/vi';

export function AffiliateCurator() {
  return (
    <section className="diary-border shrink-0 overflow-hidden rounded-lg px-2 py-1.5">
      <p className="mb-1 text-[10px] font-bold text-slate-600">{vi.home.affiliateTitle}</p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {AFFILIATE_ITEMS.map((item) => (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="diary-border flex shrink-0 flex-col items-center gap-0.5 rounded bg-white px-2 py-1"
          >
            <span className="text-lg">{item.emoji}</span>
            <span className="max-w-[64px] truncate text-[9px] font-medium">{item.name}</span>
            <span className="text-[8px] text-amber-700">{item.price}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
