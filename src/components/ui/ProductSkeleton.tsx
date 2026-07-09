import { cn } from "@/lib/utils"

interface ProductSkeletonProps {
  className?: string
  count?: number
}

export function ProductSkeleton({ className, count = 1 }: ProductSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className={cn(
            "animate-pulse rounded-2xl border border-slate-100 bg-white p-4 space-y-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)]",
            className
          )}
        >
          {/* Image Skeleton */}
          <div className="aspect-square w-full rounded-xl bg-slate-100" />
          
          {/* Text Skeletons */}
          <div className="space-y-2">
            <div className="h-4 bg-slate-100 rounded w-2/3" />
            <div className="h-3 bg-slate-100 rounded w-1/2" />
          </div>

          {/* Price & Buy Button Skeleton */}
          <div className="flex items-center justify-between pt-2">
            <div className="h-5 bg-slate-100 rounded w-1/3" />
            <div className="h-8 w-8 bg-slate-100 rounded-full" />
          </div>
        </div>
      ))}
    </>
  )
}
