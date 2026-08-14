export default function AppLoading() {
  return (
    <div className="space-y-6" aria-label="Memuat">
      <div className="h-8 w-64 animate-pulse rounded-md bg-secondary/60" />
      <div className="h-4 w-96 max-w-full animate-pulse rounded-md bg-secondary/40" />
      <div className="space-y-4">
        <div className="h-40 animate-pulse rounded-lg border border-border bg-card" />
        <div className="h-40 animate-pulse rounded-lg border border-border bg-card" />
        <div className="h-40 animate-pulse rounded-lg border border-border bg-card" />
      </div>
    </div>
  );
}
