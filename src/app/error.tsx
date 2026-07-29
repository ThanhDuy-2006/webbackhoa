'use client'

import { useEffect } from 'react'
import { isServerActionVersionError } from '@/lib/server-action-error-handler'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    if (isServerActionVersionError(error)) {
      if (typeof window !== 'undefined') {
        window.location.reload()
      }
    }
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center">
      <h2 className="text-xl font-bold mb-2 text-slate-900 dark:text-slate-100">Đã xảy ra sự cố!</h2>
      <p className="text-slate-500 max-w-md mb-6 text-sm">
        {isServerActionVersionError(error)
          ? 'Hệ thống vừa được nâng cấp phiên bản mới. Đang tự động tải lại trang...'
          : error?.message || 'Không thể thực hiện thao tác này. Vui lòng thử lại.'}
      </p>
      <button
        onClick={() => {
          if (isServerActionVersionError(error)) {
            window.location.reload()
          } else {
            reset()
          }
        }}
        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition cursor-pointer"
      >
        Tải lại trang
      </button>
    </div>
  )
}
