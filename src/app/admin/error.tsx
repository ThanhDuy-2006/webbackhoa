'use client'

import { useEffect } from 'react'
import { isServerActionVersionError } from '@/lib/server-action-error-handler'

export default function AdminError({
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
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <h2 className="text-xl font-bold mb-2 text-slate-900 dark:text-slate-100">Lỗi thao tác Admin</h2>
      <p className="text-slate-500 max-w-md mb-6 text-sm">
        {isServerActionVersionError(error)
          ? 'Hệ thống vừa cập nhật phiên bản mới trên Vercel. Đang tự động làm mới trang...'
          : error?.message || 'Có lỗi xảy ra khi thực hiện thao tác quản trị.'}
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
