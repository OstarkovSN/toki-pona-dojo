import { Skeleton } from "@/components/ui/skeleton"

export function DictionarySkeleton() {
  return (
    <div
      className="space-y-4"
      data-testid="dictionary-skeleton"
      role="status"
      aria-label="Loading dictionary"
    >
      <Skeleton className="h-10 w-full rounded-md" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4 space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  )
}
