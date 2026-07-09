import { ProductSkeleton } from '@/components/ui/ProductSkeleton'

export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 animate-pulse space-y-3">
        <div className="h-8 bg-slate-100 rounded w-1/4" />
        <div className="h-4 bg-slate-100 rounded w-1/2" />
      </div>
      
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Skeleton */}
        <aside className="w-full md:w-64 shrink-0 space-y-6 animate-pulse">
          <div className="h-6 bg-slate-100 rounded w-1/3 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 bg-slate-100 rounded-xl w-full" />
            ))}
          </div>
        </aside>

        {/* Main Content Grid Skeleton */}
        <main className="flex-1 space-y-6">
          <div className="h-16 bg-slate-100 rounded-xl w-full animate-pulse" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
            <ProductSkeleton count={8} />
          </div>
        </main>
      </div>
    </div>
  )
}
