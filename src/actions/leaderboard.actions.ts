'use server'

import { LeaderboardRepository } from '@/repositories/leaderboard.repository'
import { LeaderboardEntry } from '@/types/leaderboard.type'
import { createClient } from '@/lib/supabase/server'

export type LeaderboardResult = {
  success: boolean
  data?: LeaderboardEntry[]
  myRank?: LeaderboardEntry | null
  error?: string
}

export async function getTopupLeaderboardAction(month: number, year: number): Promise<LeaderboardResult> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    // Fetch both in parallel
    const [leaderboard, myRank] = await Promise.all([
      LeaderboardRepository.getTopupLeaderboard(month, year, 20),
      user ? LeaderboardRepository.getMyTopupRank(month, year) : Promise.resolve(null)
    ])

    return {
      success: true,
      data: leaderboard,
      myRank: myRank
    }
  } catch (error: any) {
    console.error('Error in getTopupLeaderboardAction:', error)
    return {
      success: false,
      error: error.message || 'Lỗi khi tải bảng xếp hạng'
    }
  }
}

export async function getConsumptionLeaderboardAction(month: number, year: number): Promise<LeaderboardResult> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    // Fetch both in parallel
    const [leaderboard, myRank] = await Promise.all([
      LeaderboardRepository.getConsumptionLeaderboard(month, year, 20),
      user ? LeaderboardRepository.getMyConsumptionRank(month, year) : Promise.resolve(null)
    ])

    return {
      success: true,
      data: leaderboard,
      myRank: myRank
    }
  } catch (error: any) {
    console.error('Error in getConsumptionLeaderboardAction:', error)
    return {
      success: false,
      error: error.message || 'Lỗi khi tải bảng xếp hạng'
    }
  }
}
