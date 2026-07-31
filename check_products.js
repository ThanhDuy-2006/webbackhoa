const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkProducts() {
  try {
    const { data, error } = await supabase.from('products').select('*');
    if (error) {
      console.error('Error fetching products:', error);
    } else {
      console.log('Total products:', data.length);
      if (data.length > 0) {
        console.log('Sample product:', data[0]);
      }
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

checkProducts().catch(err => console.error('Unhandled promise rejection:', err));
