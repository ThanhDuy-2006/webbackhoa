const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const crypto = require('crypto');
dotenv.config({ path: '.env.local' });

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function runTest() {
  console.log('--- BẮT ĐẦU STRESS TEST ---');
  const numUsers = 20;
  const numTransactions = 20; 
  const users = [];

  try {
    console.log(`1. Tạo ${numUsers} tài khoản giả lập...`);
    for (let i = 0; i < numUsers; i++) {
      const email = `bot_${Date.now()}_${i}@test.com`;
      const { data, error } = await adminClient.auth.admin.createUser({
        email,
        password: 'password123',
        email_confirm: true
      });
      if (error) {
        console.error('Lỗi tạo user:', error.message);
        continue;
      }
      const uid = data.user.id;
      await sleep(200);
      
      const { data: profile } = await adminClient.from('profiles').select('*').eq('id', uid).maybeSingle();
      if (!profile) {
        await adminClient.from('profiles').insert({ id: uid, full_name: `Bot ${i}`, phone: '0123456789', role: 'user', balance: 1000000000 });
      } else {
        await adminClient.from('profiles').update({ balance: 1000000000 }).eq('id', uid);
      }
      
      users.push({ id: uid, email });
    }
    console.log(`✅ Đã tạo ${users.length} tài khoản và nạp tiền.`);

    console.log(`3. Đăng nhập, đăng sản phẩm và Bắt đầu giao dịch...`);
    let successCount = 0;
    let failCount = 0;
    let allProducts = [];

    const worker = async (userObj) => {
      const userClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        { auth: { persistSession: false, autoRefreshToken: false } }
      );
      
      const { data: signInData, error: signInError } = await userClient.auth.signInWithPassword({
        email: userObj.email, password: 'password123'
      });
      if (signInError) {
         console.error("Lỗi đăng nhập cho", userObj.email, signInError.message);
         failCount += numTransactions;
         return;
      }

      const myProducts = [];
      for (let j = 0; j < 2; j++) {
        const { data, error } = await userClient.from('products').insert({
          seller_id: userObj.id,
          name: `Sản phẩm Bot ${userObj.id.slice(0,4)} - ${j}`,
          slug: `san-pham-bot-${Date.now()}-${userObj.id.slice(0,4)}-${j}`,
          price: Math.floor(Math.random() * 100000) + 10000,
          stock: 10000,
          product_source: 'seller',
          category_id: '10000000-0000-0000-0000-000000000001',
          is_active: true
        }).select('id').single();
        if (data) {
          myProducts.push(data.id);
          allProducts.push(data.id);
        } else if (error) {
          console.error("Lỗi tạo sản phẩm bởi User:", error.message);
        }
      }
      
      // Wait for all products to be generated across all threads before buying
      await sleep(2000); 

      for (let i = 0; i < numTransactions; i++) {
        const pList = allProducts.length > 0 ? allProducts : myProducts;
        const productId = pList[Math.floor(Math.random() * pList.length)];
        const qty = Math.floor(Math.random() * 3) + 1;
        
        try {
          const idempotency = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
          const hash = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
          
          const { data, error } = await userClient.rpc('atomic_c2c_checkout', {
            p_idempotency_key: idempotency,
            p_request_hash: hash,
            p_items: [{ product_id: productId, quantity: qty, variant_id: null }],
            p_receiver_name: 'Bot ' + userObj.id.slice(0,4),
            p_receiver_phone: '0123456789',
            p_receiver_address: 'Dia chi bot'
          });
          if (error) {
             if (failCount === 0) console.error("Lỗi giao dịch đầu tiên (rpc):", error.message, error.details || error);
             failCount++;
          } else {
             successCount++;
          }
        } catch (e) {
          if (failCount === 0) console.error("Lỗi giao dịch đầu tiên (exception):", e);
          failCount++;
        }
        await sleep(50);
      }
    };

    const startTime = Date.now();
    await Promise.all(users.map(u => worker(u)));
    const endTime = Date.now();

    console.log(`✅ Hoàn tất ${(successCount + failCount)} giao dịch trong ${((endTime - startTime)/1000).toFixed(2)}s`);
    console.log(`Thành công: ${successCount}`);
    console.log(`Thất bại: ${failCount}`);
    console.log(`TPS: ${((successCount + failCount) / ((endTime - startTime)/1000)).toFixed(2)} giao dịch / giây`);

  } catch (err) {
    console.error('Lỗi trong quá trình chạy:', err.message);
  } finally {
    console.log('4. Đang dọn dẹp (Xóa tài khoản và dữ liệu rác)...');
    for (const userObj of users) {
      await adminClient.auth.admin.deleteUser(userObj.id);
    }
    console.log('✅ Đã dọn dẹp sạch sẽ!');
  }
}

runTest();
