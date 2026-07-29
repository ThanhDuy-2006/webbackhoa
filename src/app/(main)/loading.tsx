export default function StorefrontLoading() {
  return (
    <div className="min-h-screen bg-slate-50/50 pb-16 animate-pulse">
      {/* Banner Skeleton */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6">
        <div className="w-full h-48 sm:h-72 md:h-96 bg-slate-200/80 rounded-2xl sm:rounded-3xl" />
      </div>

      {/* Categories Bar Skeleton */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-8">
        <div className="h-6 w-44 bg-slate-200 rounded-md mb-4" />
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-10 w-28 bg-slate-200 rounded-full shrink-0" />
          ))}
        </div>
      </div>

      {/* Featured Products Grid Skeleton */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-10">
        <div className="flex items-center justify-between mb-6">
          <div className="h-7 w-48 bg-slate-200 rounded-md" />
          <div className="h-5 w-24 bg-slate-200 rounded-md" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-5">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm flex flex-col space-y-3">
              <div className="w-full aspect-square bg-slate-200/80 rounded-xl" />
              <div className="h-4 w-3/4 bg-slate-200 rounded" />
              <div className="h-4 w-1/2 bg-slate-200 rounded" />
              <div className="h-8 w-full bg-slate-200 rounded-xl mt-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
