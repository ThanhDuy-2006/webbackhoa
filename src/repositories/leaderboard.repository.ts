import { createClient } from '@/lib/supabase/server'
import { LeaderboardEntry } from '@/types/leaderboard.type'

export class LeaderboardRepository {
  static async getTopupLeaderboard(month: number, year: number, limit: number = 20): Promise<LeaderboardEntry[]> {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('get_topup_leaderboard', {
      p_month: month,
      p_year: year,
      p_limit: limit
    })

    if (error) {
      console.error('Error fetching topup leaderboard:', error)
      return []
    }

    return data as LeaderboardEntry[]
  }

  static async getMyTopupRank(month: number, year: number): Promise<LeaderboardEntry | null> {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('get_my_topup_rank', {
      p_month: month,
      p_year: year
    })

    if (error || !data || data.length === 0) {
      return null
    }

    return data[0] as LeaderboardEntry
  }

  static async getConsumptionLeaderboard(month: number, year: number, limit: number = 20): Promise<LeaderboardEntry[]> {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('get_consumption_leaderboard', {
      p_month: month,
      p_year: year,
      p_limit: limit
    })

    if (error) {
      console.error('Error fetching consumption leaderboard:', error)
      return []
    }

    return data as LeaderboardEntry[]
  }

  static async getMyConsumptionRank(month: number, year: number): Promise<LeaderboardEntry | null> {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('get_my_consumption_rank', {
      p_month: month,
      p_year: year
    })

    if (error || !data || data.length === 0) {
      return null
    }

    return data[0] as LeaderboardEntry
  }
}
