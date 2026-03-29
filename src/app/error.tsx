'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-geo-bg text-geo-on-surface">
      <div className="text-center p-8 max-w-md">
        <h2 className="text-2xl font-headline font-extrabold mb-4">Something went wrong</h2>
        <p className="text-geo-on-surface-dim text-sm font-body mb-4">{error.message}</p>
        <button
          onClick={() => reset()}
          className="btn-primary px-6 py-3"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
