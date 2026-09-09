import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function QuetHoaDonPage() {
  redirect('/tai-khoan/san-pham-cua-toi/import?scan=true')
}
