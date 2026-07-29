'use client'

import { useEffect } from 'react'
import { isServerActionVersionError } from '@/lib/server-action-error-handler'

export default function GlobalError({
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
    <html lang="vi">
      <body className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 text-center">
        <h2 className="text-2xl font-bold mb-2 text-slate-900">Ứng dụng đã gặp sự cố</h2>
        <p className="text-slate-600 max-w-md mb-6 text-sm">
          {isServerActionVersionError(error)
            ? 'Ứng dụng vừa được cập nhật phiên bản mới. Đang tự động làm mới trang...'
            : error?.message || 'Đã có lỗi hệ thống xảy ra.'}
        </p>
        <button
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.location.reload()
            }
          }}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition cursor-pointer"
        >
          Tải lại ứng dụng
        </button>
      </body>
    </html>
  )
}
