import { Skeleton } from "@/components/ui/skeleton"

export function GrammarSkeleton() {
  return (
    <div
      className="space-y-6"
      data-testid="grammar-skeleton"
      role="status"
      aria-label="Loading grammar"
    >
      <Skeleton className="h-8 w-1/2" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <div className="rounded-lg border p-6">
        <div className="flex items-center gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <Skeleton className="h-10 w-20 rounded-md" />
              <Skeleton className="h-3 w-14" />
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-lg border-l-4 border-primary/30 p-4 space-y-2">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  )
}
