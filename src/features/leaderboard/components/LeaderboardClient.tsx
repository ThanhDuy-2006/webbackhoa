'use client'

import { useState, useEffect } from 'react'
import { Trophy, Medal, Crown, Calendar, TrendingUp, CreditCard, ChevronDown } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { LeaderboardEntry } from '@/types/leaderboard.type'
import { getTopupLeaderboardAction, getConsumptionLeaderboardAction } from '@/actions/leaderboard.actions'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/card'
import Image from 'next/image'

export function LeaderboardClient() {
  const currentDate = new Date()
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear())
  const [activeTab, setActiveTab] = useState<'topup' | 'consumption'>('topup')
  
  const [loading, setLoading] = useState(true)
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([])
  const [myRank, setMyRank] = useState<LeaderboardEntry | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Generate valid months (don't allow future months of current year)
  const availableMonths = Array.from({ length: 12 }, (_, i) => i + 1).filter(m => {
    if (selectedYear < currentDate.getFullYear()) return true
    return m <= currentDate.getMonth() + 1
  })

  // Generate valid years (e.g. from 2024 to current)
  const availableYears = Array.from(
    { length: currentDate.getFullYear() - 2024 + 1 }, 
    (_, i) => 2024 + i
  )

  useEffect(() => {
    // If year changes to current year and selected month is in future, reset month
    if (selectedYear === currentDate.getFullYear() && selectedMonth > currentDate.getMonth() + 1) {
      setSelectedMonth(currentDate.getMonth() + 1)
    }
    loadData()
  }, [selectedMonth, selectedYear, activeTab])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const action = activeTab === 'topup' 
        ? getTopupLeaderboardAction 
        : getConsumptionLeaderboardAction
        
      const res = await action(selectedMonth, selectedYear)
      
      if (res.success) {
        setLeaderboardData(res.data || [])
        setMyRank(res.myRank || null)
      } else {
        setError(res.error || 'Có lỗi xảy ra khi tải dữ liệu')
      }
    } catch (err) {
      setError('Lỗi kết nối')
    } finally {
      setLoading(false)
    }
  }

  const renderRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-500 drop-shadow-md" />
      case 2:
        return <Medal className="w-6 h-6 text-slate-400 drop-shadow-md" />
      case 3:
        return <Medal className="w-6 h-6 text-amber-700 drop-shadow-md" />
      default:
        return <span className="text-lg font-bold text-slate-500">#{rank}</span>
    }
  }

  const renderAvatar = (url: string | null, name: string | null, rank: number) => {
    const size = rank <= 3 ? 56 : 40
    let ringColor = 'ring-slate-100'
    if (rank === 1) ringColor = 'ring-yellow-400 ring-offset-2'
    if (rank === 2) ringColor = 'ring-slate-300 ring-offset-2'
    if (rank === 3) ringColor = 'ring-amber-600 ring-offset-2'

    return (
      <div className={`relative rounded-full ring-2 ${ringColor} flex items-center justify-center bg-slate-100 overflow-hidden shrink-0`} style={{ width: size, height: size }}>
        {url ? (
          <Image src={url} alt={name || 'User'} fill className="object-cover" />
        ) : (
          <span className="text-slate-500 font-bold uppercase text-lg">
            {(name || 'U').charAt(0)}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Bảng Xếp Hạng</h1>
            <p className="text-xs text-slate-500">Vinh danh những thành viên nổi bật nhất</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
          <Calendar className="w-4 h-4 text-slate-500 ml-2" />
          <select 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="bg-transparent border-none text-sm font-semibold text-slate-700 focus:ring-0 cursor-pointer"
          >
            {availableMonths.map(m => (
              <option key={m} value={m}>Tháng {m}</option>
            ))}
          </select>
          <span className="text-slate-300">/</span>
          <select 
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-transparent border-none text-sm font-semibold text-slate-700 focus:ring-0 cursor-pointer pl-0"
          >
            {availableYears.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-xl w-full max-w-md mx-auto">
        <button
          onClick={() => setActiveTab('topup')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${activeTab === 'topup' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <CreditCard className="w-4 h-4" /> Nạp nhiều nhất
        </button>
        <button
          onClick={() => setActiveTab('consumption')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${activeTab === 'consumption' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <TrendingUp className="w-4 h-4" /> Tiêu dùng nhiều nhất
        </button>
      </div>

      {/* Leaderboard List */}
      <div className="relative min-h-[400px]">
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-indigo-600 space-y-4">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="text-sm font-medium animate-pulse">Đang tải bảng xếp hạng...</p>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-2 text-rose-500 bg-rose-50 p-6 rounded-2xl border border-rose-100">
              <p className="font-semibold">{error}</p>
              <button onClick={loadData} className="text-sm underline">Thử lại</button>
            </div>
          </div>
        ) : leaderboardData.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-2 text-slate-500">
              <Trophy className="w-12 h-12 mx-auto text-slate-200" />
              <p className="font-medium">Chưa có dữ liệu cho tháng này</p>
            </div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div 
              key={activeTab + selectedMonth + selectedYear}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-3"
            >
              {/* Top 3 display logic */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 pt-6">
                {/* 2nd Place */}
                {leaderboardData[1] && (
                  <Card className="order-2 md:order-1 relative p-4 flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100/50 border-slate-200 shadow-sm md:translate-y-4">
                    <div className="absolute -top-5">{renderRankIcon(2)}</div>
                    {renderAvatar(leaderboardData[1].avatar_url, leaderboardData[1].full_name, 2)}
                    <p className="font-bold text-slate-700 mt-3 truncate w-full text-center">{leaderboardData[1].full_name || 'Người dùng ẩn danh'}</p>
                    <p className="text-sm font-bold text-slate-500 mt-1">{formatCurrency(leaderboardData[1].total_amount)} đ</p>
                  </Card>
                )}
                {/* 1st Place */}
                {leaderboardData[0] && (
                  <Card className="order-1 md:order-2 relative p-6 flex flex-col items-center justify-center bg-gradient-to-b from-yellow-50 to-yellow-100/30 border-yellow-200 shadow-md transform md:-translate-y-2">
                    <div className="absolute -top-7">{renderRankIcon(1)}</div>
                    {renderAvatar(leaderboardData[0].avatar_url, leaderboardData[0].full_name, 1)}
                    <p className="font-black text-slate-800 mt-4 text-lg truncate w-full text-center">{leaderboardData[0].full_name || 'Người dùng ẩn danh'}</p>
                    <p className="text-base font-black text-yellow-600 mt-1">{formatCurrency(leaderboardData[0].total_amount)} đ</p>
                  </Card>
                )}
                {/* 3rd Place */}
                {leaderboardData[2] && (
                  <Card className="order-3 relative p-4 flex flex-col items-center justify-center bg-gradient-to-b from-amber-50/50 to-amber-100/30 border-amber-200/60 shadow-sm md:translate-y-6">
                    <div className="absolute -top-5">{renderRankIcon(3)}</div>
                    {renderAvatar(leaderboardData[2].avatar_url, leaderboardData[2].full_name, 3)}
                    <p className="font-bold text-slate-700 mt-3 truncate w-full text-center">{leaderboardData[2].full_name || 'Người dùng ẩn danh'}</p>
                    <p className="text-sm font-bold text-amber-700/70 mt-1">{formatCurrency(leaderboardData[2].total_amount)} đ</p>
                  </Card>
                )}
              </div>

              {/* 4th to 20th */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                {leaderboardData.slice(3).map((entry) => (
                  <div key={entry.user_id} className="flex items-center gap-4 p-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                    <div className="w-8 text-center font-bold text-slate-400">{entry.rank}</div>
                    {renderAvatar(entry.avatar_url, entry.full_name, entry.rank)}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-700 truncate">{entry.full_name || 'Người dùng ẩn danh'}</p>
                    </div>
                    <div className="font-bold text-slate-600">
                      {formatCurrency(entry.total_amount)} <span className="text-[10px] text-slate-400">VND</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Current User Rank (if not in top 20 or if loading finished) */}
      {!loading && !error && myRank && (
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-0 left-0 right-0 p-4 z-50 md:sticky md:bottom-4 pointer-events-none"
        >
          <div className="max-w-2xl mx-auto pointer-events-auto">
            <Card className="p-4 bg-slate-900/95 backdrop-blur-md text-white border-slate-800 shadow-2xl flex items-center gap-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 font-bold">
                {myRank.rank <= 20 ? (
                  <Trophy className="w-5 h-5 text-yellow-400" />
                ) : (
                  `#${myRank.rank}`
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-400">Thứ hạng của bạn</p>
                <p className="font-bold truncate">{myRank.full_name || 'Bạn'}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">{activeTab === 'topup' ? 'Đã nạp' : 'Đã tiêu'}</p>
                <p className="font-bold text-emerald-400">{formatCurrency(myRank.total_amount)} đ</p>
              </div>
            </Card>
          </div>
        </motion.div>
      )}
    </div>
  )
}
