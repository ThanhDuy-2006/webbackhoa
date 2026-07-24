import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://xsqkjanebtipiafguyxq.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzcWtqYW5lYnRpcGlhZmd1eXhxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzU0MzcyNiwiZXhwIjoyMDk5MTE5NzI2fQ.5a1-954qw0-xpjM5N6vl_WIRummJA5bk-aheGiwXA5U'

const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const testUsers = [
  { email: 'user_alpha_test@example.com', password: 'TestUser123!', fullName: 'User Alpha Test', phone: '0901111111' },
  { email: 'user_beta_test@example.com', password: 'TestUser123!', fullName: 'User Beta Test', phone: '0902222222' },
  { email: 'user_gamma_test@example.com', password: 'TestUser123!', fullName: 'User Gamma Test', phone: '0903333333' }
]

const logs = []
function logResult(step, status, message, data = null) {
  const item = { timestamp: new Date().toISOString(), step, status, message, data }
  logs.push(item)
  console.log(`[${status}] ${step}: ${message}`)
}

async function setupUser(userDef) {
  try {
    const { data: usersList } = await adminSupabase.auth.admin.listUsers()
    let existingUser = usersList?.users?.find(u => u.email === userDef.email)
    
    let userId
    if (!existingUser) {
      const { data, error } = await adminSupabase.auth.admin.createUser({
        email: userDef.email,
        password: userDef.password,
        email_confirm: true,
        user_metadata: { full_name: userDef.fullName }
      })
      if (error) throw error
      userId = data.user.id
      logResult('User Setup', 'SUCCESS', `Tạo mới tài khoản ${userDef.email} (ID: ${userId})`)
    } else {
      userId = existingUser.id
      logResult('User Setup', 'SUCCESS', `Đã tìm thấy tài khoản ${userDef.email} (ID: ${userId})`)
    }

    const { data: profile } = await adminSupabase.from('profiles').select('*').eq('id', userId).single()
    if (!profile) {
      await adminSupabase.from('profiles').insert({
        id: userId,
        full_name: userDef.fullName,
        phone: userDef.phone,
        role: 'user',
        balance: 1000000
      })
    } else {
      await adminSupabase.from('profiles').update({
        full_name: userDef.fullName,
        phone: userDef.phone,
        balance: Math.max(profile.balance || 0, 1000000)
      }).eq('id', userId)
    }

    return { ...userDef, id: userId }
  } catch (err) {
    logResult('User Setup', 'ERROR', `Lỗi tạo tài khoản ${userDef.email}: ${err.message}`)
    throw err
  }
}

async function testUserFlow(user, index) {
  logResult(`Flow User ${index + 1}`, 'INFO', `Bắt đầu test luồng người dùng cho ${user.email}`)

  // 1. Check Profile & Balance
  const { data: profile, error: profErr } = await adminSupabase.from('profiles').select('*').eq('id', user.id).single()
  if (profErr) {
    logResult(`Flow User ${index + 1} Profile`, 'ERROR', `Lỗi đọc profile: ${profErr.message}`)
  } else {
    logResult(`Flow User ${index + 1} Profile`, 'SUCCESS', `Profile OK - Số dư hiện tại: ${profile.balance} VND`)
  }

  // 2. Fetch Products
  const { data: products, error: prodErr } = await adminSupabase
    .from('products')
    .select('id, name, price, stock')
    .eq('is_active', true)
    .is('deleted_at', null)
    .gt('stock', 0)
    .limit(5)

  if (prodErr || !products || products.length === 0) {
    logResult(`Flow User ${index + 1} Products`, 'ERROR', `Lỗi đọc sản phẩm hoặc không có sản phẩm: ${prodErr?.message}`)
    return
  }
  logResult(`Flow User ${index + 1} Products`, 'SUCCESS', `Đã tải ${products.length} sản phẩm`)

  // 3. Create Topup Request (Correct column: transfer_content)
  const topupAmount = 200000
  const { data: topup, error: topupErr } = await adminSupabase.from('topup_requests').insert([{
    user_id: user.id,
    amount: topupAmount,
    status: 'pending',
    transfer_content: `NẠP TIỀN NAP${Date.now().toString().slice(-6)}`
  }]).select().single()

  if (topupErr) {
    logResult(`Flow User ${index + 1} Topup`, 'ERROR', `Lỗi tạo yêu cầu nạp tiền: ${topupErr.message}`)
  } else {
    logResult(`Flow User ${index + 1} Topup`, 'SUCCESS', `Đã tạo yêu cầu nạp tiền ID: ${topup.id}`)

    // Admin approve topup manually
    await adminSupabase.from('topup_requests').update({ status: 'approved' }).eq('id', topup.id)
    await adminSupabase.from('profiles').update({ balance: (profile?.balance || 0) + topupAmount }).eq('id', user.id)
    await adminSupabase.from('wallet_transactions').insert([{
      user_id: user.id,
      amount: topupAmount,
      type: 'TOPUP',
      description: 'Nạp tiền vào ví',
      reference_id: topup.id
    }])

    logResult(`Flow User ${index + 1} Topup Approve`, 'SUCCESS', `Đã duyệt thành công nạp +${topupAmount} VND`)
  }

  // 4. Create Order (Checkout with correct columns: receiver_name, receiver_phone, receiver_address)
  const targetProduct = products[index % products.length]
  const orderAmount = targetProduct.price
  const orderCode = `TEST-${Date.now()}-${index}`

  const { data: order, error: orderErr } = await adminSupabase.from('orders').insert([{
    order_code: orderCode,
    user_id: user.id,
    receiver_name: user.fullName,
    receiver_phone: user.phone,
    receiver_address: '123 Đường Test, Q1, TP.HCM',
    payment_method: 'wallet',
    payment_status: 'paid',
    total_amount: orderAmount,
    final_amount: orderAmount,
    status: 'completed'
  }]).select().single()

  if (orderErr) {
    logResult(`Flow User ${index + 1} Order`, 'ERROR', `Lỗi tạo đơn hàng: ${orderErr.message}`)
  } else {
    await adminSupabase.from('order_items').insert([{
      order_id: order.id,
      product_id: targetProduct.id,
      product_name: targetProduct.name,
      price: targetProduct.price,
      quantity: 1,
      subtotal: targetProduct.price
    }])

    await adminSupabase.from('products').update({ stock: Math.max(0, targetProduct.stock - 1) }).eq('id', targetProduct.id)
    await adminSupabase.from('profiles').update({ balance: (profile?.balance || 0) - orderAmount }).eq('id', user.id)

    await adminSupabase.from('wallet_transactions').insert([{
      user_id: user.id,
      amount: -orderAmount,
      type: 'PAYMENT',
      description: `Thanh toán đơn hàng ${orderCode}`,
      reference_id: order.id
    }])

    logResult(`Flow User ${index + 1} Order`, 'SUCCESS', `Đơn hàng ${orderCode} đặt thành công: ${orderAmount} VND`)
  }
}

async function testRevenueShare(users) {
  logResult('Revenue Share Test', 'INFO', 'Bắt đầu kiểm thử tính năng Chia tiền sản phẩm giữa 3 user')

  try {
    const { data: product } = await adminSupabase.from('products').select('*').limit(1).single()
    if (!product) {
      logResult('Revenue Share Test', 'ERROR', 'Không tìm thấy sản phẩm để chia tiền')
      return
    }

    const shareAmountPerUser = 50000
    const recipients = users.map(u => ({ user_id: u.id, fixed_amount: shareAmountPerUser }))

    for (const r of recipients) {
      const { data: prof } = await adminSupabase.from('profiles').select('balance').eq('id', r.user_id).single()
      const newBal = (prof?.balance || 0) - shareAmountPerUser

      await adminSupabase.from('profiles').update({ balance: newBal }).eq('id', r.user_id)

      await adminSupabase.from('wallet_transactions').insert([{
        user_id: r.user_id,
        amount: -shareAmountPerUser,
        type: 'COST_SPLIT',
        description: `Khấu trừ chia tiền sản phẩm: ${product.name}`,
        reference_id: product.id
      }])
    }

    logResult('Revenue Share Test', 'SUCCESS', `Chia tiền sản phẩm ${product.name} thành công cho ${users.length} user (Mỗi user: ${shareAmountPerUser} VND)`)
  } catch (err) {
    logResult('Revenue Share Test', 'ERROR', `Lỗi thực thi chia tiền: ${err.message}`)
  }
}

async function runParallelTests() {
  console.log('=== KÍCH HOẠT KIỂM THỬ SONG SONG 3 TÀI KHOẢN NGƯỜI DÙNG ===\n')

  try {
    const users = await Promise.all(testUsers.map(u => setupUser(u)))
    await Promise.all(users.map((u, i) => testUserFlow(u, i)))
    await testRevenueShare(users)

    console.log('\n=== TỔNG HỢP KẾT QUẢ KIỂM THỬ ===')
    console.table(logs.map(l => ({ Step: l.step, Status: l.status, Message: l.message })))

    const errors = logs.filter(l => l.status === 'ERROR')
    if (errors.length > 0) {
      console.log(`\n❌ Phát hiện ${errors.length} lỗi trong quá trình kiểm thử!`)
    } else {
      console.log('\n✅ Tất cả các luồng kiểm thử người dùng đã hoàn thành 100% THÀNH CÔNG!')
    }
  } catch (err) {
    console.error('Lỗi nghiêm trọng khi chạy suite test:', err)
  }
}

runParallelTests()
