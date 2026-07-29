const fs = require('fs');

const products = JSON.parse(fs.readFileSync('supabase/db_export_marketplace_products.json', 'utf8'));

let sql = `-- Nhập danh sách sản phẩm từ db_export_marketplace_products.json\n\n`;

// Prepare array of values to insert in batches
products.forEach((p, index) => {
  // We use deterministic UUIDs or random UUIDs. For safety and avoiding conflicts, 
  // we'll just use gen_random_uuid() for id, or deterministic if we want to update later.
  // We'll use deterministic: '00000000-0000-0000-0001-' + String(index + 1).padStart(12, '0')
  const uuid = '00000000-0000-0000-0001-' + String(index + 1).padStart(12, '0');
  
  // Safe escape strings
  const name = (p.title || '').replace(/'/g, "''");
  // Basic slug from name
  const slug = 'sp-' + uuid.substring(24) + '-' + name.substring(0, 20).replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  
  const description = (p.description || '').replace(/'/g, "''");
  const price = p.price || 0;
  const stock = p.inventory_stock || 1;
  const imageUrl = (p.image_url || '').replace(/'/g, "''");

  sql += `INSERT INTO public.products (
    id, name, slug, description, price, stock, image_url, seller_id, product_source, is_active
  ) VALUES (
    '${uuid}', 
    '${name}', 
    '${slug}', 
    '${description}', 
    ${price}, 
    ${stock}, 
    '${imageUrl}', 
    (SELECT id FROM auth.users WHERE email = 'ttd6002@gmail.com' LIMIT 1), 
    'seller', 
    true
  ) ON CONFLICT (id) DO NOTHING;\n`;
});

fs.writeFileSync('import_products.sql', sql);
console.log('Successfully generated import_products.sql');
