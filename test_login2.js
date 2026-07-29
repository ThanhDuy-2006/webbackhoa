const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testLogin() {
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error('List users failed via admin API (anon key cannot do this). We will try login instead.');
  } else {
    console.log(users.map(u => u.email));
  }
}

testLogin();
