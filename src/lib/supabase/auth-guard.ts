import { createClient } from '@/lib/supabase/server'
import { User, SupabaseClient } from '@supabase/supabase-js'

export interface AuthenticatedAdminContext {
  user: User
  supabase: SupabaseClient
}

/**
 * Ensures that the current user is authenticated and has the 'admin' role in profiles.
 * Throws an Error if unauthenticated or not an admin.
 */
export async function assertAdmin(): Promise<AuthenticatedAdminContext> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('Bạn cần đăng nhập để thực hiện thao tác quản trị')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || profile?.role !== 'admin') {
    throw new Error('Bạn không có quyền quản trị viên (Admin) để thực hiện thao tác này')
  }

  return { user, supabase: supabase as any }
}

/**
 * Ensures that the current user is authenticated.
 * Throws an Error if unauthenticated.
 */
export async function assertAuthenticatedUser(): Promise<AuthenticatedAdminContext> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('Bạn cần đăng nhập để thực hiện thao tác này')
  }

  return { user, supabase: supabase as any }
}
