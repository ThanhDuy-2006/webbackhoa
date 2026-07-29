import { toast } from 'sonner'

export function isServerActionVersionError(err: any): boolean {
  if (!err) return false
  const msg = typeof err === 'string' ? err : (err.message || String(err))
  return (
    msg.includes('Failed to find Server Action') ||
    msg.includes('older or newer deployment') ||
    msg.includes('server_action_not_found')
  )
}

export function handleServerActionError(err: any, fallbackMessage: string = 'Có lỗi xảy ra'): string {
  if (isServerActionVersionError(err)) {
    toast.error('Hệ thống vừa cập nhật phiên bản mới. Đang làm mới trang...')
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.location.reload()
      }
    }, 1200)
    return 'Phiên làm việc đã hết hạn do hệ thống vừa được nâng cấp.'
  }

  const message = err?.message || fallbackMessage
  toast.error(message)
  return message
}
