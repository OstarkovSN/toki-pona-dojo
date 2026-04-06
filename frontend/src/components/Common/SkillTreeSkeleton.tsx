import { Skeleton } from "@/components/ui/skeleton"

export function SkillTreeSkeleton() {
  return (
    <div
      className="flex flex-col gap-4 md:grid md:grid-cols-3 md:gap-6"
      data-testid="skill-tree-skeleton"
      role="status"
      aria-label="Loading skill tree"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-lg border p-4 space-y-3">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="flex gap-2 mt-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
      ))}
    </div>
  )
}
