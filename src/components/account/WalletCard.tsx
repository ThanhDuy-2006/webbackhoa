import { Wallet, Plus, History } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface WalletCardProps {
  balance: number
}

export function WalletCard({ balance }: WalletCardProps) {
  return (
    <div className="bg-white rounded-[16px] shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col h-full">
      <div className="p-6 md:p-8 flex-1">
        <div className="flex items-center gap-3 text-slate-600 mb-6">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <Wallet className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900">Ví của tôi</h2>
        </div>
        
        <div>
          <p className="text-sm font-medium text-slate-500 mb-2">Số dư hiện tại</p>
          <p className="text-4xl font-bold text-emerald-600 tracking-tight">
            {balance.toLocaleString('vi-VN')} VND
          </p>
        </div>
      </div>
      
      <div className="bg-slate-50 p-6 md:p-8 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
        <Button className="flex-1 rounded-xl h-11 bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4 mr-2" />
          Nạp tiền
        </Button>
        <Button variant="outline" className="flex-1 rounded-xl h-11">
          <History className="w-4 h-4 mr-2" />
          Lịch sử giao dịch
        </Button>
      </div>
    </div>
  )
}
