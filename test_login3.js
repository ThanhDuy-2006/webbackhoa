const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// We need the service role key to bypass RLS and read all profiles
// Wait, I can just use a local JS script that signs in as admin@example.com to check?
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function test() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'admin@example.com',
    password: '123456',
  });
  if (error) {
    console.error('Login admin failed:', error.message);
  } else {
    const { data: profiles } = await supabase.from('profiles').select('*');
    console.log('Profiles visible to admin:', profiles.length);
  }
}

test();
