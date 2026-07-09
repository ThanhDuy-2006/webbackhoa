import { HeadphonesIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function SupportCard() {
  return (
    <div className="bg-emerald-50 rounded-[16px] shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-6 md:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-emerald-600 shadow-sm shrink-0">
          <HeadphonesIcon className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Bạn cần hỗ trợ?</h2>
          <p className="text-slate-600 text-sm mt-1">
            Đội ngũ chăm sóc khách hàng của chúng tôi luôn sẵn sàng hỗ trợ bạn 24/7.
          </p>
        </div>
      </div>
      <Button className="shrink-0 bg-white text-emerald-700 hover:bg-slate-50 border border-emerald-100 shadow-sm rounded-xl px-6">
        <HeadphonesIcon className="w-4 h-4 mr-2" />
        Liên hệ hỗ trợ
      </Button>
    </div>
  )
}
