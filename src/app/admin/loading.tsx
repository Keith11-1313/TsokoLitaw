export default function AdminLoading() {
  return (
    <main
      className="min-h-screen bg-background px-4 py-8 sm:px-8"
      aria-busy="true"
      aria-label="Loading Admin dashboard"
    >
      <div className="mx-auto max-w-7xl animate-pulse space-y-6 motion-reduce:animate-none">
        <div className="h-10 w-64 rounded-control bg-surface-muted" />
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-28 rounded-card bg-surface-muted" />
          ))}
        </div>
        <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
          <div className="h-96 rounded-card bg-surface-muted" />
          <div className="h-96 rounded-card bg-surface-muted" />
        </div>
      </div>
      <span className="sr-only">Loading Admin data…</span>
    </main>
  );
}
