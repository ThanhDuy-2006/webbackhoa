const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testIdentities() {
  const { data, error } = await supabase.from('auth.identities').select('*').limit(1);
  console.log('Test identity select:', error ? error.message : 'Success');
}

testIdentities();
