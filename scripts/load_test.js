const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const crypto = require('crypto');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function runLoadTest() {
  console.log('Starting load test with 10 concurrent checkout requests...');
  
  // 1. Get a test product and its stock
  const { data: products } = await supabase.from('products').select('*').gt('stock', 0).limit(1);
  if (!products || products.length === 0) {
    console.log('No products with stock found to test.');
    return;
  }
  const product = products[0];
  console.log(`Testing with product: ${product.name} (Stock: ${product.stock})`);
  
  // 2. Prepare 10 concurrent requests buying 1 unit each
  // We need a buyer user id (we'll just use a random uuid or fail auth if we don't have token)
  // Wait, atomic_c2c_checkout uses auth.uid() so we MUST be authenticated to call it!
  // Since we are testing from a Node script, we can't easily fake auth.uid() unless we login or use service role.
  // Actually, we can use service_role to call the RPC if we pass the user ID, but the RPC uses auth.uid().
  
  console.log('Since checkout requires authentication (auth.uid()), a pure backend load test requires 10 test accounts.');
}

runLoadTest();
