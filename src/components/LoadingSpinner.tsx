export function LoadingSpinner() {
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-background"
      role="status"
      aria-label="Caricamento in corso"
      aria-live="polite"
    >
      <div className="motion-safe:animate-spin h-12 w-12 rounded-full border-4 border-primary border-t-transparent" />
    </div>
  )
}