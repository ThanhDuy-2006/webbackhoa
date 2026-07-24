'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { MoreHorizontal } from 'lucide-react'
import { useState, useEffect } from 'react'

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

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444']

export function AdminDashboardCharts({ revenueData, statusData }: ChartProps) {
  const [isMounted, setIsMounted] = useState(false)
  
  useEffect(() => {
    setIsMounted(true)
  }, [])

  const pieData = [
    { name: 'Đã giao', value: statusData.completed },
    { name: 'Đang giao', value: statusData.shipping },
    { name: 'Chờ xử lý', value: statusData.pending },
    { name: 'Đã hủy', value: statusData.cancelled },
  ].filter(item => item.value > 0) // only show if > 0

  const totalOrders = Object.values(statusData).reduce((a, b) => a + b, 0)
  
  // To avoid empty chart errors
  if (pieData.length === 0) {
    pieData.push({ name: 'Chưa có đơn', value: 1 })
  }

  // Format Y Axis for large numbers
  const formatYAxis = (tickItem: number) => {
    if (tickItem === 0) return '0'
    if (tickItem >= 1000000) return `${(tickItem / 1000000).toFixed(0)}M`
    if (tickItem >= 1000) return `${(tickItem / 1000).toFixed(0)}K`
    return tickItem.toString()
  }

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-xl shadow-lg border border-slate-100">
          <p className="font-medium text-slate-800 mb-1">{label}</p>
          <p className="text-blue-600 font-bold">
            {Number(payload[0].value).toLocaleString('vi-VN')} VND
          </p>
        </div>
      )
    }
    return null
  }

  if (!isMounted) {
    return <div className="h-[350px] w-full bg-slate-100/50 animate-pulse rounded-[24px]" />
  }

  return (
    <div className="grid gap-6 md:grid-cols-3 mb-6">
      <Card className="col-span-2 rounded-[24px] border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/80 backdrop-blur-xl">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-base font-bold text-slate-800">Doanh thu</CardTitle>
          </div>
          <button className="flex items-center gap-1 text-sm text-slate-500 bg-slate-50 px-3 py-1.5 rounded-full hover:bg-slate-100 transition-colors">
            7 ngày qua <MoreHorizontal className="w-4 h-4 ml-1" />
          </button>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold mb-6 text-slate-800">
            {revenueData.reduce((acc, curr) => acc + curr.revenue, 0).toLocaleString('vi-VN')} VND
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="display" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#94a3b8' }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  tickFormatter={formatYAxis}
                  dx={-10}
                />
                <Tooltip content={customTooltip} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#3B82F6" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                  activeDot={{ r: 6, fill: "#3B82F6", stroke: "#fff", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[24px] border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/80 backdrop-blur-xl flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold text-slate-800">Tỉ lệ đơn hàng</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col justify-center pb-8">
          <div className="h-[200px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                  itemStyle={{ color: '#1e293b', fontWeight: 500 }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-slate-800">{totalOrders}</span>
              <span className="text-xs text-slate-500 font-medium">Tổng đơn</span>
            </div>
          </div>
          
          <div className="mt-6 space-y-3 px-2">
            {pieData.map((entry, index) => (
              <div key={entry.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                  <span className="text-sm text-slate-600">{entry.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-800">{entry.value}</span>
                  <span className="text-xs text-slate-400">({((entry.value / Math.max(totalOrders, 1)) * 100).toFixed(1)}%)</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
