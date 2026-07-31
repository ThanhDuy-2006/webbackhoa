const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
async function run() {
  const uid = '6996004d-7ff1-4494-b96e-34d25939f24c';
  const { error } = await adminClient.from('profiles').update({ balance: 10000000000 }).eq('id', uid);
  console.log('Update Error:', error);
  const { data } = await adminClient.from('profiles').select('balance').eq('id', uid).single();
  console.log('Balance after update:', data.balance);
}
run();
