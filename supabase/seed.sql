-- SEED CATEGORIES
insert into categories (id, name, slug, description, image_url, is_active) values
('11111111-1111-1111-1111-111111111111', 'Điện Thoại', 'dien-thoai', 'Điện thoại di động chính hãng', 'https://placehold.co/400?text=Phone', true),
('22222222-2222-2222-2222-222222222222', 'Laptop', 'laptop', 'Máy tính xách tay cấu hình cao', 'https://placehold.co/400?text=Laptop', true),
('33333333-3333-3333-3333-333333333333', 'Phụ Kiện', 'phu-kien', 'Phụ kiện điện thoại, máy tính', 'https://placehold.co/400?text=Accessory', true),
('44444444-4444-4444-4444-444444444444', 'Máy Tính Bảng', 'may-tinh-bang', 'iPad và các dòng tablet khác', 'https://placehold.co/400?text=Tablet', true),
('55555555-5555-5555-5555-555555555555', 'Âm Thanh', 'am-thanh', 'Tai nghe, loa bluetooth', 'https://placehold.co/400?text=Audio', true)
on conflict (id) do nothing;

-- SEED PRODUCTS (20 products)
insert into products (category_id, name, slug, description, price, sale_price, stock, image_url, is_featured) values
('11111111-1111-1111-1111-111111111111', 'iPhone 15 Pro Max', 'iphone-15-pro-max', 'Apple iPhone 15 Pro Max 256GB', 29990000, 28590000, 50, 'https://placehold.co/600?text=iPhone+15+Pro+Max', true),
('11111111-1111-1111-1111-111111111111', 'Samsung Galaxy S24 Ultra', 'samsung-galaxy-s24-ultra', 'Điện thoại Samsung Galaxy S24 Ultra', 31990000, 29990000, 30, 'https://placehold.co/600?text=S24+Ultra', true),
('11111111-1111-1111-1111-111111111111', 'Xiaomi 14 Pro', 'xiaomi-14-pro', 'Điện thoại Xiaomi 14 Pro', 19990000, null, 100, 'https://placehold.co/600?text=Xiaomi+14', false),
('11111111-1111-1111-1111-111111111111', 'Oppo Find X7 Ultra', 'oppo-find-x7-ultra', 'Điện thoại Oppo Find X7 Ultra', 24990000, 23990000, 20, 'https://placehold.co/600?text=Oppo+Find+X7', false),
('22222222-2222-2222-2222-222222222222', 'MacBook Air M3', 'macbook-air-m3', 'Apple MacBook Air M3 13 inch 2024', 27990000, 26990000, 40, 'https://placehold.co/600?text=MacBook+Air+M3', true),
('22222222-2222-2222-2222-222222222222', 'MacBook Pro 14 M3', 'macbook-pro-14-m3', 'Apple MacBook Pro 14 inch M3 2023', 39990000, 38500000, 25, 'https://placehold.co/600?text=MacBook+Pro+M3', true),
('22222222-2222-2222-2222-222222222222', 'Dell XPS 13 Plus', 'dell-xps-13-plus', 'Dell XPS 13 Plus cao cấp', 45990000, 42990000, 15, 'https://placehold.co/600?text=Dell+XPS', false),
('22222222-2222-2222-2222-222222222222', 'Asus ROG Zephyrus G14', 'asus-rog-zephyrus-g14', 'Laptop Gaming Asus ROG', 42990000, null, 10, 'https://placehold.co/600?text=Asus+ROG', false),
('33333333-3333-3333-3333-333333333333', 'Cáp sạc Anker PowerLine', 'cap-sac-anker', 'Cáp sạc siêu bền Anker', 350000, 290000, 200, 'https://placehold.co/600?text=Anker+Cable', false),
('33333333-3333-3333-3333-333333333333', 'Sạc dự phòng Xiaomi 20000mAh', 'sac-du-phong-xiaomi', 'Sạc dự phòng Xiaomi dung lượng lớn', 550000, null, 150, 'https://placehold.co/600?text=Xiaomi+Powerbank', false),
('33333333-3333-3333-3333-333333333333', 'Ốp lưng iPhone 15 Pro Max', 'op-lung-iphone-15', 'Ốp lưng chính hãng Apple', 1200000, 990000, 80, 'https://placehold.co/600?text=iPhone+Case', false),
('33333333-3333-3333-3333-333333333333', 'Chuột Logitech MX Master 3S', 'chuot-logitech-mx-master-3s', 'Chuột không dây cao cấp Logitech', 2500000, 2290000, 50, 'https://placehold.co/600?text=MX+Master+3S', true),
('44444444-4444-4444-4444-444444444444', 'iPad Pro 11 inch M4', 'ipad-pro-11-m4', 'Apple iPad Pro 11 inch M4 2024', 28990000, 27500000, 35, 'https://placehold.co/600?text=iPad+Pro', true),
('44444444-4444-4444-4444-444444444444', 'iPad Air 6 M2', 'ipad-air-6-m2', 'Apple iPad Air 6 M2', 16990000, 16490000, 60, 'https://placehold.co/600?text=iPad+Air', false),
('44444444-4444-4444-4444-444444444444', 'Samsung Galaxy Tab S9', 'samsung-galaxy-tab-s9', 'Máy tính bảng Samsung cao cấp', 19990000, 18500000, 45, 'https://placehold.co/600?text=Tab+S9', false),
('44444444-4444-4444-4444-444444444444', 'Xiaomi Pad 6', 'xiaomi-pad-6', 'Máy tính bảng Xiaomi Pad 6', 8990000, 8490000, 100, 'https://placehold.co/600?text=Xiaomi+Pad', false),
('55555555-5555-5555-5555-555555555555', 'AirPods Pro 2', 'airpods-pro-2', 'Tai nghe không dây Apple AirPods Pro 2', 5990000, 5490000, 120, 'https://placehold.co/600?text=AirPods+Pro', true),
('55555555-5555-5555-5555-555555555555', 'Sony WH-1000XM5', 'sony-wh-1000xm5', 'Tai nghe chụp tai chống ồn Sony', 7990000, 7290000, 40, 'https://placehold.co/600?text=Sony+XM5', true),
('55555555-5555-5555-5555-555555555555', 'Marshall Stanmore III', 'marshall-stanmore-3', 'Loa Bluetooth Marshall', 10990000, 9990000, 25, 'https://placehold.co/600?text=Marshall', false),
('55555555-5555-5555-5555-555555555555', 'JBL Charge 5', 'jbl-charge-5', 'Loa di động chống nước JBL', 3990000, 3490000, 80, 'https://placehold.co/600?text=JBL+Charge', false)
on conflict (slug) do nothing;

-- SEED BANNERS (3 banners)
insert into banners (title, image_url, link_url, position, is_active) values
('Khuyến Mãi Hè', 'https://placehold.co/1200x400?text=Khuyen+Mai+He', '/sale', 1, true),
('iPhone 15 Series', 'https://placehold.co/1200x400?text=iPhone+15+Series', '/products?category=dien-thoai', 2, true),
('MacBook M3 Mới', 'https://placehold.co/1200x400?text=MacBook+M3', '/products?category=laptop', 3, true);

-- SEED COUPONS
insert into coupons (code, type, value, min_order_amount, usage_limit, start_date, end_date) values
('GIAM100K', 'fixed', 100000, 500000, 100, now(), now() + interval '30 days'),
('GIAM500K', 'fixed', 500000, 10000000, 50, now(), now() + interval '30 days'),
('SALE10', 'percent', 10, 2000000, 200, now(), now() + interval '30 days')
on conflict (code) do nothing;
