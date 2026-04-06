import { Skeleton } from "@/components/ui/skeleton"

export function LessonSkeleton() {
  return (
    <div
      className="space-y-6 max-w-2xl mx-auto"
      data-testid="lesson-skeleton"
      role="status"
      aria-label="Loading lesson"
    >
      <Skeleton className="h-2 w-full rounded-full" />
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-5 w-4/5" />
      <div className="rounded-lg border p-6 space-y-4">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-12 w-full rounded-md" />
        <div className="flex gap-2 flex-wrap">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-20 rounded-md" />
          ))}
        </div>
      </div>
      <div className="flex justify-end">
        <Skeleton className="h-10 w-32 rounded-md" />
      </div>
    </div>
  )
}
