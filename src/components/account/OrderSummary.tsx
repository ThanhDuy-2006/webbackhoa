import { ShoppingBag, Clock, Truck, CheckCircle2 } from 'lucide-react'

// Dummy/mockup stats format - in real app pass props
interface OrderSummaryProps {
  stats?: {
    total: number
    pending: number
    shipping: number
    completed: number
  }
}

export function OrderSummary({ stats = { total: 0, pending: 0, shipping: 0, completed: 0 } }: OrderSummaryProps) {
  const cards = [
    {
      label: 'Tổng đơn hàng',
      value: stats.total,
      icon: ShoppingBag,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Đang xử lý',
      value: stats.pending,
      icon: Clock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    {
      label: 'Đang giao',
      value: stats.shipping,
      icon: Truck,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
    {
      label: 'Hoàn thành',
      value: stats.completed,
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
  ]

  return (
    <div className="bg-white rounded-[16px] shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-6 md:p-8">
      <h2 className="text-xl font-semibold text-slate-900 mb-6">Tổng quan đơn hàng</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((card, idx) => {
          const Icon = card.icon
          return (
            <div key={idx} className="bg-slate-50 rounded-2xl p-5 transition-transform hover:-translate-y-1 hover:shadow-sm">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${card.bgColor} ${card.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-3xl font-bold text-slate-900 mb-1">{card.value}</p>
              <p className="text-sm font-medium text-slate-500">{card.label}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
