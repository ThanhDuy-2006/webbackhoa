const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
(async () => {
  const { data, error } = await supabase.from('product_revenue_shares').select('*').eq('status', 'completed').limit(1);
  if (error) console.error(error);
  if (data && data.length > 0) {
     console.log('Got share:', data[0].id);
     const { data: res, error: rpcErr } = await supabase.rpc('manual_rollback_revenue_share', { p_share_id: data[0].id });
     console.log('Rollback result:', res);
     console.log('RPC Error:', rpcErr);
  } else {
     console.log('No completed shares found');
  }
})();
