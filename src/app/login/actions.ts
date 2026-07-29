'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: (formData.get('email') as string || '').trim(),
    password: formData.get('password') as string || '',
  }

  if (!data.email || !data.password) {
    return { error: 'Vui lòng nhập đầy đủ email và mật khẩu' }
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    let msg = error.message
    if (msg.includes('Invalid login credentials')) {
      msg = 'Email hoặc mật khẩu không chính xác'
    } else if (msg.includes('Email not confirmed')) {
      msg = 'Email chưa được xác thực. Vui lòng kiểm tra hộp thư email của bạn.'
    }
    return { error: 'Đăng nhập thất bại: ' + msg }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email = (formData.get('email') as string || '').trim()
  const password = formData.get('password') as string || ''
  const fullName = (formData.get('full_name') as string || '').trim()

  if (!email || !password || !fullName) {
    return { error: 'Vui lòng nhập đầy đủ họ tên, email và mật khẩu' }
  }

  const data = {
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      }
    }
  }

  const { data: authRes, error } = await supabase.auth.signUp(data)

  if (error) {
    let msg = error.message
    if (msg.includes('User already registered') || msg.includes('already exists')) {
      msg = 'Email này đã được đăng ký tài khoản.'
    } else if (msg.includes('Password should be at least')) {
      msg = 'Mật khẩu phải có ít nhất 6 ký tự.'
    }
    return { error: 'Đăng ký thất bại: ' + msg }
  }

  if (!authRes.session) {
    return { 
      success: true, 
      needConfirmation: true, 
      message: 'Đăng ký thành công! Vui lòng kiểm tra hộp thư email để kích hoạt tài khoản trước khi đăng nhập.' 
    }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
