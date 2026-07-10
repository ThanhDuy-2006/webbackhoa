const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables from workspace root
const envPath = '.env.local';
const envContent = fs.readFileSync(envPath, 'utf8');

const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const value = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
    env[key] = value;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Connecting to:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('wallet_transactions')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error querying wallet_transactions:', error);
  } else {
    console.log('Wallet transaction columns:', Object.keys(data[0] || {}));
  }
}

run();
