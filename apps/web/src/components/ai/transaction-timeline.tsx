interface TimelineItem {
  title: string;
  subtitle?: string;
  state: 'completed' | 'current' | 'upcoming';
  alert?: string;
}

export function TransactionTimeline({ items }: { items: TimelineItem[] }) {
  return (
    <div className="relative space-y-8">
      <div className="absolute start-6 top-6 bottom-6 w-0.5 bg-outline-variant" />
      {items.map((item) => (
        <div key={item.title} className="relative flex gap-4">
          <div
            className={`z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
              item.state === 'completed'
                ? 'bg-primary text-on-primary'
                : item.state === 'current'
                  ? 'border-2 border-secondary-fixed-dim bg-surface shadow-[0_0_15px_rgba(0,218,243,0.3)]'
                  : 'border border-outline-variant bg-surface-container text-on-surface-variant opacity-50'
            }`}
          >
            {item.state === 'completed' ? (
              <span className="material-symbols-outlined">check</span>
            ) : item.state === 'current' ? (
              <span className="h-4 w-4 animate-pulse rounded-full bg-secondary-fixed-dim" />
            ) : (
              <span className="material-symbols-outlined text-sm">schedule</span>
            )}
          </div>
          <div className={`pt-2 ${item.state === 'upcoming' ? 'opacity-50' : ''}`}>
            <div className="font-label text-sm font-semibold text-primary">{item.title}</div>
            {item.subtitle ? (
              <div className="mt-1 text-sm text-on-surface-variant">{item.subtitle}</div>
            ) : null}
            {item.alert ? (
              <div className="mt-3 flex gap-3 rounded-lg border border-[#ffb4ab] bg-error-container p-4 text-on-error-container">
                <span className="material-symbols-outlined text-error">warning</span>
                <p className="text-sm">{item.alert}</p>
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
