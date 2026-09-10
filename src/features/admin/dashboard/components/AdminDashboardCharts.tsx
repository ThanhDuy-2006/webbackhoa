'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { TrendingUp, Activity, PieChart as PieIcon } from 'lucide-react'
import { useState, useEffect } from 'react'
import { formatCurrency } from '@/lib/utils'

interface ChartProps {
  revenueData: {
    date: string
    display: string
    revenue: number
  }[]
  statusData: {
    completed: number
    shipping: number
    pending: number
    cancelled: number
  }
}

const STATUS_COLORS: Record<string, string> = {
  'Đã giao': '#10B981', // emerald-500
  'Đang giao': '#3B82F6', // blue-500
  'Chờ xử lý': '#F59E0B', // amber-500
  'Đã hủy': '#EF4444', // red-500
  'Chưa có đơn': '#94A3B8'
}

export function AdminDashboardCharts({ revenueData = [], statusData = { completed: 0, shipping: 0, pending: 0, cancelled: 0 } }: ChartProps) {
  const [isMounted, setIsMounted] = useState(false)
  
  useEffect(() => {
    setIsMounted(true)
  }, [])

  const safeStatusData = {
    completed: statusData?.completed || 0,
    shipping: statusData?.shipping || 0,
    pending: statusData?.pending || 0,
    cancelled: statusData?.cancelled || 0,
  }

  const pieData = [
    { name: 'Đã giao', value: safeStatusData.completed, isFallback: false },
    { name: 'Đang giao', value: safeStatusData.shipping, isFallback: false },
    { name: 'Chờ xử lý', value: safeStatusData.pending, isFallback: false },
    { name: 'Đã hủy', value: safeStatusData.cancelled, isFallback: false },
  ].filter(item => item.value > 0)

  const totalOrders = Object.values(safeStatusData).reduce((a, b) => a + b, 0)
  
  if (pieData.length === 0) {
    pieData.push({ name: 'Chưa có đơn', value: 1, isFallback: true })
  }

  const formatYAxis = (tickItem: number) => {
    if (tickItem === 0) return '0'
    if (tickItem >= 1000000) return `${(tickItem / 1000000).toFixed(1)}M`
    if (tickItem >= 1000) return `${(tickItem / 1000).toFixed(0)}K`
    return tickItem.toString()
  }

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-800 text-xs space-y-1">
          <p className="text-slate-400 font-medium">Ngày {label}</p>
          <p className="text-emerald-400 font-bold text-sm font-mono">
            {formatCurrency(Number(payload[0].value))}
          </p>
        </div>
      )
    }
    return null
  }

  const safeRevenueData = Array.isArray(revenueData) ? revenueData : []
  const totalPeriodRevenue = safeRevenueData.reduce((acc, curr) => acc + (curr?.revenue || 0), 0)

  if (!isMounted) {
    return <div className="h-[320px] w-full bg-slate-100/60 animate-pulse rounded-2xl" />
  }

  return (
    <div className="grid gap-5 lg:grid-cols-12">
      {/* Revenue Area Chart: 8 cols */}
      <Card className="lg:col-span-8 rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden flex flex-col justify-between">
        <CardHeader className="p-5 pb-2 flex flex-row items-center justify-between border-b border-slate-50">
          <div>
            <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600" /> Xu hướng doanh thu
            </CardTitle>
            <p className="text-xs text-slate-400 mt-0.5">Biểu đồ doanh thu thực nhận 7 ngày gần nhất</p>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-slate-400 uppercase font-medium tracking-wider">Tổng 7 ngày</span>
            <p className="text-base font-black text-slate-900 font-mono">
              {formatCurrency(totalPeriodRevenue)}
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-5 pt-4">
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="display" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#94a3b8' }} 
                  dy={8}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickFormatter={formatYAxis}
                />
                <Tooltip content={customTooltip} cursor={{ stroke: '#10B981', strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#10B981" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                  activeDot={{ r: 5, fill: "#10B981", stroke: "#fff", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Order Status Pie Chart: 4 cols */}
      <Card className="lg:col-span-4 rounded-2xl border border-slate-100 bg-white shadow-sm flex flex-col justify-between">
        <CardHeader className="p-5 pb-2 border-b border-slate-50">
          <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <PieIcon className="w-4 h-4 text-blue-600" /> Tỉ lệ đơn hàng
          </CardTitle>
          <p className="text-xs text-slate-400 mt-0.5">Phân bổ trạng thái xử lý đơn hàng</p>
        </CardHeader>
        <CardContent className="p-5 flex-1 flex flex-col justify-between">
          <div className="h-[160px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry) => (
                    <Cell 
                      key={entry.name} 
                      fill={STATUS_COLORS[entry.name] || '#94A3B8'} 
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {/* Centered count */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-black text-slate-900 font-mono">{totalOrders}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tổng đơn</span>
            </div>
          </div>
          
          {/* Legend Items */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-50">
            {pieData.map((entry) => {
              const pct = entry.isFallback ? '0%' : `${((entry.value / Math.max(totalOrders, 1)) * 100).toFixed(0)}%`
              return (
                <div key={entry.name} className="flex items-center justify-between p-2 rounded-xl bg-slate-50/70">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span 
                      className="w-2 h-2 rounded-full shrink-0" 
                      style={{ backgroundColor: STATUS_COLORS[entry.name] || '#94A3B8' }}
                    />
                    <span className="text-[11px] font-medium text-slate-600 truncate">{entry.name}</span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-800 font-mono shrink-0 ml-1">
                    {entry.isFallback ? 0 : entry.value} ({pct})
                  </span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
