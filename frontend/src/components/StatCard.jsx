export function StatCard({ label, value, hint, icon: IconEl }) {
  return (
    <div className="card flex items-start justify-between">
      <div>
        <p className="text-xs font-medium text-ink-muted">{label}</p>
        <p className="mt-1.5 font-mono text-2xl font-semibold text-ink">{value}</p>
        {hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
      </div>
      {IconEl && (
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent">
          <IconEl size={18} />
        </div>
      )}
    </div>
  );
}
