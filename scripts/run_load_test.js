const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const crypto = require('crypto');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runTest() {
  console.log('--- BẮT ĐẦU TEST 10 LUỒNG USER ---');
  
  const USERS_COUNT = 10;
  const testUsers = [];
  const testProducts = [];
  
  // 1. Tạo 10 User
  console.log(`\n1. Đang tạo ${USERS_COUNT} người dùng ảo...`);
  for (let i = 1; i <= USERS_COUNT; i++) {
    const email = `test_user_${i}_${Date.now()}@example.com`;
    const { data: { user }, error } = await supabase.auth.admin.createUser({
      email,
      password: 'Password123!',
      email_confirm: true,
      user_metadata: {
        full_name: `Test User ${i}`,
        role: 'user'
      }
    });
    if (error) {
      console.error(`Lỗi tạo user ${i}:`, error.message);
      continue;
    }
    
    // Cấp số dư 1,000,000 VND
    await supabase.from('profiles').update({ balance: 1000000 }).eq('id', user.id);
    
    testUsers.push({ id: user.id, email, password: 'Password123!' });
    console.log(`- Đã tạo user: ${email} (ID: ${user.id})`);
  }

  if (testUsers.length === 0) {
    console.log('Không có user nào được tạo, dừng test.');
    return;
  }

  // Lấy 1 category ngẫu nhiên
  const { data: categories } = await supabase.from('categories').select('id').limit(1);
  const categoryId = categories && categories.length > 0 ? categories[0].id : null;

  // 2. Mỗi user tạo 1 sản phẩm
  console.log(`\n2. Mỗi user đang đăng bán 1 sản phẩm...`);
  for (const user of testUsers) {
    const productName = `Sản phẩm test của ${user.email}`;
    const slug = `sp-test-${user.id}`;
    const { data: product, error } = await supabase.from('products').insert({
      category_id: categoryId,
      name: productName,
      slug: slug,
      description: 'Mô tả test',
      price: 50000,
      stock: 5, // Mỗi sản phẩm có 5 cái
      is_active: true,
      seller_id: user.id,
      product_source: 'seller',
      listing_status: 'active'
    }).select().single();
    
    if (error) {
      console.error(`- Lỗi tạo sản phẩm cho ${user.email}:`, error.message);
    } else {
      testProducts.push(product);
      console.log(`- Đã tạo sản phẩm: ${product.name} (Stock: 5)`);
    }
  }

  // 3. Test cập nhật sản phẩm (đổi giá)
  console.log(`\n3. Đang test cập nhật giá sản phẩm...`);
  for (const product of testProducts) {
    const { error } = await supabase.from('products')
      .update({ price: 45000, sale_price: 40000 })
      .eq('id', product.id);
    if (error) {
      console.error(`- Lỗi cập nhật SP ${product.id}:`, error.message);
    } else {
      console.log(`- Cập nhật thành công giá cho SP ${product.id} thành 40000`);
    }
  }

  // 4. Bắn đồng loạt 10 luồng thanh toán Checkout (Race Condition / Concurrency test)
  console.log(`\n4. Đang bắn 10 luồng mua hàng (Atomic Checkout) đồng thời...`);
  // Tất cả user cùng mua 1 sản phẩm của user 0 (stock chỉ có 5)
  // Kỳ vọng: Chỉ 5 luồng thành công, 5 luồng thất bại do hết hàng.
  const targetProduct = testProducts[0];
  const promises = [];
  
  if (targetProduct) {
    for (let i = 1; i < testUsers.length; i++) { // Bỏ qua user 0 vì ko đc mua hàng của chính mình
      const buyer = testUsers[i];
      promises.push((async () => {
        // SignIn để lấy Access Token
        const client = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );
        await client.auth.signInWithPassword({ email: buyer.email, password: buyer.password });
        
        // Gọi RPC checkout
        const payload = [{ product_id: targetProduct.id, quantity: 1 }];
        const idempotencyKey = crypto.randomUUID();
        const requestHash = 'testhash';
        
        const { data, error } = await client.rpc('atomic_c2c_checkout', {
          p_idempotency_key: idempotencyKey,
          p_request_hash: requestHash,
          p_items: payload,
          p_receiver_name: 'Test',
          p_receiver_phone: '0123456789',
          p_receiver_address: 'Test Address',
          p_note: '',
          p_coupon_code: null
        });

        if (error) {
          return { email: buyer.email, status: 'Lỗi', message: error.message };
        }
        return { email: buyer.email, status: 'Thành công', order_id: data };
      })());
    }
    
    const results = await Promise.all(promises);
    results.forEach(res => {
      console.log(`- Luồng mua hàng của ${res.email}: ${res.status} ${res.message ? '('+res.message+')' : 'Order ID: '+res.order_id}`);
    });
  }

  // 5. Kiểm tra stock và Balance
  console.log(`\n5. Kiểm tra trạng thái dữ liệu...`);
  if (targetProduct) {
    const { data: updatedProduct } = await supabase.from('products').select('stock').eq('id', targetProduct.id).single();
    console.log(`- Tồn kho còn lại của SP mục tiêu: ${updatedProduct.stock} (Kỳ vọng: 0)`);
    
    const { data: sellerWallet } = await supabase.from('seller_wallets').select('available_balance').eq('seller_id', targetProduct.seller_id).single();
    console.log(`- Thu nhập của Seller 0: ${sellerWallet ? sellerWallet.available_balance : 0}`);
  }

  // 6. Xóa dữ liệu rác (Sản phẩm & User)
  console.log(`\n6. Đang dọn dẹp dữ liệu rác...`);
  for (const product of testProducts) {
    await supabase.from('products').delete().eq('id', product.id);
  }
  console.log(`- Đã xóa ${testProducts.length} sản phẩm test.`);
  
  for (const user of testUsers) {
    await supabase.auth.admin.deleteUser(user.id);
  }
  console.log(`- Đã xóa ${testUsers.length} user ảo.`);

  console.log(`\n--- KẾT THÚC TEST ---`);
}

runTest();
