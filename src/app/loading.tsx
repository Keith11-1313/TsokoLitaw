export default function Loading() {
  return (
    <main id="main-content" className="grid min-h-screen place-items-center bg-background px-6" tabIndex={-1}>
      <div role="status" className="rounded-card border border-border bg-surface px-8 py-7 text-center shadow-sm">
        <p className="font-display text-2xl text-foreground">Preparing your TsokoLitaw view</p>
        <p className="mt-2 text-sm text-muted-foreground">Loading the latest page details…</p>
      </div>
    </main>
  );
}
