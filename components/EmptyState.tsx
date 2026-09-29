// A small, inline empty-state used inside admin tab panels — the same
// dashed-border-plus-icon language as the homepage's "Success stories —
// coming soon" placeholder, just compact enough to sit inside a list
// where a plain "None right now." used to be.
export default function EmptyState({
  message,
  icon,
}: {
  message: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="mt-2 flex items-center gap-3 rounded-lg border border-dashed border-gray-300 bg-gray-50/60 px-4 py-3 text-sm text-gray-500">
      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100">
        {icon ?? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12h-6l-2 3h-4l-2-3H2" />
            <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
          </svg>
        )}
      </span>
      <span>{message}</span>
    </div>
  );
}
