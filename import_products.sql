-- Nhập danh sách sản phẩm từ db_export_marketplace_products.json

INSERT INTO public.products (
    id, name, slug, description, price, stock, image_url, seller_id, product_source, is_active
  ) VALUES (
    '00000000-0000-0000-0001-000000000001', 
    'Mì kokomi', 
    'sp-000000000001-m--kokomi', 
    'Ăn uống', 
    5000.000000, 
    2, 
    'https://down-vn.img.susercontent.com/file/vn-11134207-7r98o-lmim5z6vttjza6', 
    (SELECT id FROM auth.users WHERE email = 'ttd6002@gmail.com' LIMIT 1), 
    'seller', 
    true
  ) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.products (
    id, name, slug, description, price, stock, image_url, seller_id, product_source, is_active
  ) VALUES (
    '00000000-0000-0000-0001-000000000002', 
    'Mì Xào Hảo Hảo Vị Hải Sản gói 71g', 
    'sp-000000000002-m--x-o-h-o-h-o-v--h-', 
    'Ăn uống', 
    4400.000000, 
    3, 
    'https://thf.bing.com/th/id/OIP.ubhjvXVCuabE6jy33cG-MwHaFw?w=205&h=180&c=7&r=0&o=7&cb=thfc1falcon&dpr=1.3&pid=1.7&rm=3', 
    (SELECT id FROM auth.users WHERE email = 'ttd6002@gmail.com' LIMIT 1), 
    'seller', 
    true
  ) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.products (
    id, name, slug, description, price, stock, image_url, seller_id, product_source, is_active
  ) VALUES (
    '00000000-0000-0000-0001-000000000003', 
    'Mì Ký Miliket Có Gia Vị Vắt Túi 16 Vắt/kg', 
    'sp-000000000003-m--k--miliket-c--gia', 
    'Ăn uống', 
    2312.500000, 
    1, 
    'https://thf.bing.com/th/id/OIP.URxLo-vvsFGWIB9SlvEYKgHaHa?w=199&h=199&c=7&r=0&o=7&cb=thfc1falcon&dpr=1.3&pid=1.7&rm=3', 
    (SELECT id FROM auth.users WHERE email = 'ttd6002@gmail.com' LIMIT 1), 
    'seller', 
    true
  ) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.products (
    id, name, slug, description, price, stock, image_url, seller_id, product_source, is_active
  ) VALUES (
    '00000000-0000-0000-0001-000000000004', 
    'Cá Basa Fillet Đông Lạnh Không Da CP Khay 220g', 
    'sp-000000000004-c--basa-fillet---ng-', 
    'Ăn uống', 
    26000.000000, 
    1, 
    'https://tse1.mm.bing.net/th/id/OIP.DjXQ67yr4z6tzyOCbsrK-QHaHa?r=0&cb=thfvnextfalcon3&rs=1&pid=ImgDetMain&o=7&rm=3', 
    (SELECT id FROM auth.users WHERE email = 'ttd6002@gmail.com' LIMIT 1), 
    'seller', 
    true
  ) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.products (
    id, name, slug, description, price, stock, image_url, seller_id, product_source, is_active
  ) VALUES (
    '00000000-0000-0000-0001-000000000005', 
    'Lốc 10 gói Mì Koreno Jumbo Cay 7 Cấp', 
    'sp-000000000005-l-c-10-g-i-m--koreno', 
    'Ăn uống', 
    7590.000000, 
    7, 
    'https://thf.bing.com/th/id/OIP.K7iEKcaD4lJWGIchcr6LuQHaHa?w=213&h=213&c=7&r=0&o=7&cb=thfc1falcon&dpr=1.3&pid=1.7&rm=3', 
    (SELECT id FROM auth.users WHERE email = 'ttd6002@gmail.com' LIMIT 1), 
    'seller', 
    true
  ) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.products (
    id, name, slug, description, price, stock, image_url, seller_id, product_source, is_active
  ) VALUES (
    '00000000-0000-0000-0001-000000000006', 
    'Pate Thịt Heo 3 Bông Mai hộp 150g', 
    'sp-000000000006-pate-th-t-heo-3-b-ng', 
    'Ăn uống', 
    17900.000000, 
    1, 
    'https://down-vn.img.susercontent.com/file/26ce8a867a59bb3d9d7c4f58043a2f5b', 
    (SELECT id FROM auth.users WHERE email = 'ttd6002@gmail.com' LIMIT 1), 
    'seller', 
    true
  ) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.products (
    id, name, slug, description, price, stock, image_url, seller_id, product_source, is_active
  ) VALUES (
    '00000000-0000-0000-0001-000000000007', 
    'Gia Vị Nấu Sẵn Aji Quick Thịt Kho 31g', 
    'sp-000000000007-gia-v--n-u-s-n-aji-q', 
    'Ăn uống', 
    5500.000000, 
    4, 
    'https://thfvnext.bing.com/th/id/OIP.HKH2sXp2mj3yAU1XxWwOXAHaHa?w=199&h=199&c=7&r=0&o=7&cb=thfvnextfalcon3&dpr=1.3&pid=1.7&rm=3', 
    (SELECT id FROM auth.users WHERE email = 'ttd6002@gmail.com' LIMIT 1), 
    'seller', 
    true
  ) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.products (
    id, name, slug, description, price, stock, image_url, seller_id, product_source, is_active
  ) VALUES (
    '00000000-0000-0000-0001-000000000008', 
    'Nước tăng lực Monster lon 355ml', 
    'sp-000000000008-n--c-t-ng-l-c-monste', 
    'Trái cây + Nước', 
    28000.000000, 
    1, 
    'https://down-vn.img.susercontent.com/file/vn-11134207-7ra0g-m8q1v7jyppac36', 
    (SELECT id FROM auth.users WHERE email = 'ttd6002@gmail.com' LIMIT 1), 
    'seller', 
    true
  ) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.products (
    id, name, slug, description, price, stock, image_url, seller_id, product_source, is_active
  ) VALUES (
    '00000000-0000-0000-0001-000000000009', 
    'Bia Tiger lon cao 330ml', 
    'sp-000000000009-bia-tiger-lon-cao-33', 
    'Trái cây + Nước', 
    13600.000000, 
    4, 
    'https://cdnv2.tgdd.vn/bhx-static/bhx/Products/Images/2282/316846/bhx/httpscdnv2tgddvnbhx-staticbhxproductsimages2282316846bhxlon-330ml-1202412031318226970_202412040935166288.jpg', 
    (SELECT id FROM auth.users WHERE email = 'ttd6002@gmail.com' LIMIT 1), 
    'seller', 
    true
  ) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.products (
    id, name, slug, description, price, stock, image_url, seller_id, product_source, is_active
  ) VALUES (
    '00000000-0000-0000-0001-000000000010', 
    'Mì Gấu Đỏ Tôm Gà 63g', 
    'sp-000000000010-m--g-u----t-m-g--63g', 
    'Ăn uống', 
    3196.670000, 
    22, 
    'https://cdn.tgdd.vn/Products/Images/2565/80187/bhx/mi-gau-do-tom-va-ga-goi-63g-202209150833324481.jpg', 
    (SELECT id FROM auth.users WHERE email = 'ttd6002@gmail.com' LIMIT 1), 
    'seller', 
    true
  ) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.products (
    id, name, slug, description, price, stock, image_url, seller_id, product_source, is_active
  ) VALUES (
    '00000000-0000-0000-0001-000000000011', 
    'Đậu phộng PMT 250G', 
    'sp-000000000011---u-ph-ng-pmt-250g', 
    'Ăn uống', 
    24500.000000, 
    4, 
    'https://cdn.tgdd.vn/Products/Images/3235/146568/bhx/dau-phong-pmt-goi-250g-201912121605333036.JPG', 
    (SELECT id FROM auth.users WHERE email = 'ttd6002@gmail.com' LIMIT 1), 
    'seller', 
    true
  ) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.products (
    id, name, slug, description, price, stock, image_url, seller_id, product_source, is_active
  ) VALUES (
    '00000000-0000-0000-0001-000000000012', 
    'Trà olong xanh hương chanh Tea plus', 
    'sp-000000000012-tr--olong-xanh-h--ng', 
    'Trái cây + Nước', 
    10666.670000, 
    5, 
    'https://product.hstatic.net/1000246697/product/tra-o-long-tea-plus-320ml-clone-202405151646009978_e718f70b0de947bfb67d55c54596a680_master.jpg', 
    (SELECT id FROM auth.users WHERE email = 'ttd6002@gmail.com' LIMIT 1), 
    'seller', 
    true
  ) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.products (
    id, name, slug, description, price, stock, image_url, seller_id, product_source, is_active
  ) VALUES (
    '00000000-0000-0000-0001-000000000013', 
    'Bột Giặt Aba Sạch Tinh Tươm 770g', 
    'sp-000000000013-b-t-gi-t-aba-s-ch-ti', 
    'Mua sắm', 
    28500.000000, 
    1, 
    'https://down-vn.img.susercontent.com/file/68fe861ea49a15410b70461701ab084c', 
    (SELECT id FROM auth.users WHERE email = 'ttd6002@gmail.com' LIMIT 1), 
    'seller', 
    true
  ) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.products (
    id, name, slug, description, price, stock, image_url, seller_id, product_source, is_active
  ) VALUES (
    '00000000-0000-0000-0001-000000000014', 
    'Nước tăng lực Sting Sleek hương việt quất lon 320ml', 
    'sp-000000000014-n--c-t-ng-l-c-sting-', 
    'Trái cây + Nước', 
    11700.000000, 
    3, 
    'https://cdnv2.tgdd.vn/bhx-static/bhx/Products/Images/3226/336284/bhx/loc-6-lon-nuoc-tang-luc-sting-sleek-huong-viet-quat-320ml_202505211558572615.jpg', 
    (SELECT id FROM auth.users WHERE email = 'ttd6002@gmail.com' LIMIT 1), 
    'seller', 
    true
  ) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.products (
    id, name, slug, description, price, stock, image_url, seller_id, product_source, is_active
  ) VALUES (
    '00000000-0000-0000-0001-000000000015', 
    'Nước tăng lực Monster lon 355ml', 
    'sp-000000000015-n--c-t-ng-l-c-monste', 
    'Trái cây + Nước', 
    28000.000000, 
    1, 
    'https://down-vn.img.susercontent.com/file/vn-11134207-7ra0g-m8q1v7jyppac36', 
    (SELECT id FROM auth.users WHERE email = 'ttd6002@gmail.com' LIMIT 1), 
    'seller', 
    true
  ) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.products (
    id, name, slug, description, price, stock, image_url, seller_id, product_source, is_active
  ) VALUES (
    '00000000-0000-0000-0001-000000000016', 
    'Mì 3 Miền Gold Tôm Chua Cay Đặc Biệt 75g', 
    'sp-000000000016-m--3-mi-n-gold-t-m-c', 
    'Trái cây + Nước', 
    5300.000000, 
    14, 
    'https://cdn.tgdd.vn/Products/Images/2565/96215/bhx/mi-3-mien-gold-tom-chua-cay-dac-biet-goi-75g-202004171750052898.jpg', 
    (SELECT id FROM auth.users WHERE email = 'ttd6002@gmail.com' LIMIT 1), 
    'seller', 
    true
  ) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.products (
    id, name, slug, description, price, stock, image_url, seller_id, product_source, is_active
  ) VALUES (
    '00000000-0000-0000-0001-000000000017', 
    'Strongbow Berries lon 320ml', 
    'sp-000000000017-strongbow-berries-lo', 
    'Trái cây + Nước', 
    18500.000000, 
    2, 
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSrZv_Ix2ZG24Kcrq1l9yFYJ-Pqt_JjEWd6ycWoErI__kJerMZkj1qTgjM&s=10', 
    (SELECT id FROM auth.users WHERE email = 'ttd6002@gmail.com' LIMIT 1), 
    'seller', 
    true
  ) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.products (
    id, name, slug, description, price, stock, image_url, seller_id, product_source, is_active
  ) VALUES (
    '00000000-0000-0000-0001-000000000018', 
    'Cider Somersby chanh muối lon 320ml', 
    'sp-000000000018-cider-somersby-chanh', 
    'Trái cây + Nước', 
    13500.000000, 
    1, 
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRihVBA-rWeifl5gzXjx-7VFrENdFbbCykBMb1ikQC0HA&s', 
    (SELECT id FROM auth.users WHERE email = 'ttd6002@gmail.com' LIMIT 1), 
    'seller', 
    true
  ) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.products (
    id, name, slug, description, price, stock, image_url, seller_id, product_source, is_active
  ) VALUES (
    '00000000-0000-0000-0001-000000000019', 
    'Mì kokomi', 
    'sp-000000000019-m--kokomi', 
    'Ăn uống', 
    4300.000000, 
    5, 
    'https://down-vn.img.susercontent.com/file/vn-11134207-7r98o-lmim5z6vttjza6', 
    (SELECT id FROM auth.users WHERE email = 'ttd6002@gmail.com' LIMIT 1), 
    'seller', 
    true
  ) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.products (
    id, name, slug, description, price, stock, image_url, seller_id, product_source, is_active
  ) VALUES (
    '00000000-0000-0000-0001-000000000020', 
    'Mì indomine', 
    'sp-000000000020-m--indomine', 
    'Ăn uống', 
    3993.880000, 
    42, 
    'https://filebroker-cdn.lazada.vn/kf/S325d9d25f7134fe88eb211f1e38c7a12p.jpg', 
    (SELECT id FROM auth.users WHERE email = 'ttd6002@gmail.com' LIMIT 1), 
    'seller', 
    true
  ) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.products (
    id, name, slug, description, price, stock, image_url, seller_id, product_source, is_active
  ) VALUES (
    '00000000-0000-0000-0001-000000000021', 
    'Sữa tươi tiệt trùng', 
    'sp-000000000021-s-a-t--i-ti-t-tr-ng', 
    'Trái cây + Nước', 
    28580.000000, 
    1, 
    'https://thfvnext.bing.com/th/id/OIP.r66bZv6muxddaq1PjPrL6wHaHa?w=177&h=180&c=7&r=0&o=7&cb=thfvnextfalcon2&dpr=1.3&pid=1.7&rm=3', 
    (SELECT id FROM auth.users WHERE email = 'ttd6002@gmail.com' LIMIT 1), 
    'seller', 
    true
  ) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.products (
    id, name, slug, description, price, stock, image_url, seller_id, product_source, is_active
  ) VALUES (
    '00000000-0000-0000-0001-000000000022', 
    'Cánh tỏi gà', 
    'sp-000000000022-c-nh-t-i-g-', 
    'Ăn uống', 
    29275.000000, 
    1, 
    'https://cdnv2.tgdd.vn/bhx-static/bhx/production/2026/1/image/production/2026/1/image/Products/8790/233798/canh-toi-ga-1kg_202601081057018747.jpg', 
    (SELECT id FROM auth.users WHERE email = 'ttd6002@gmail.com' LIMIT 1), 
    'seller', 
    true
  ) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.products (
    id, name, slug, description, price, stock, image_url, seller_id, product_source, is_active
  ) VALUES (
    '00000000-0000-0000-0001-000000000023', 
    'Mì Ký Miliket Có Gia Vị Vắt Túi 16 Vắt/kg', 
    'sp-000000000023-m--k--miliket-c--gia', 
    'Ăn uống', 
    2312.500000, 
    25, 
    'https://thf.bing.com/th/id/OIP.URxLo-vvsFGWIB9SlvEYKgHaHa?w=199&h=199&c=7&r=0&o=7&cb=thfc1falcon&dpr=1.3&pid=1.7&rm=3', 
    (SELECT id FROM auth.users WHERE email = 'ttd6002@gmail.com' LIMIT 1), 
    'seller', 
    true
  ) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.products (
    id, name, slug, description, price, stock, image_url, seller_id, product_source, is_active
  ) VALUES (
    '00000000-0000-0000-0001-000000000024', 
    'Mì tươi Bò Xốt Vang Vifon', 
    'sp-000000000024-m--t--i-b--x-t-vang-', 
    'Ăn uống', 
    4000.000000, 
    23, 
    'https://tse2.mm.bing.net/th/id/OIP.AU2PgTgSbRdszMnUEdDpdQHaFj?r=0&pid=Api&P=0&h=180', 
    (SELECT id FROM auth.users WHERE email = 'ttd6002@gmail.com' LIMIT 1), 
    'seller', 
    true
  ) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.products (
    id, name, slug, description, price, stock, image_url, seller_id, product_source, is_active
  ) VALUES (
    '00000000-0000-0000-0001-000000000025', 
    'Trứng', 
    'sp-000000000025-tr-ng', 
    'Ăn uống', 
    2500.000000, 
    5, 
    'https://vfarm.vn/vnt_upload/product/03_2021/TRUNG_GA_TUOI.jpg', 
    (SELECT id FROM auth.users WHERE email = 'ttd6002@gmail.com' LIMIT 1), 
    'seller', 
    true
  ) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.products (
    id, name, slug, description, price, stock, image_url, seller_id, product_source, is_active
  ) VALUES (
    '00000000-0000-0000-0001-000000000026', 
    'Xúc xích xông khói WYN HOTTT ', 
    'sp-000000000026-x-c-x-ch-x-ng-kh-i-w', 
    'Ăn uống', 
    3825.000000, 
    15, 
    'https://cdnv2.tgdd.vn/bhx-static/bhx/Products/Images/7618/359526/bhx/xuc-xich-xong-khoi-hottt-g-kitchen-goi-450g_202511211321386161.jpg', 
    (SELECT id FROM auth.users WHERE email = 'ttd6002@gmail.com' LIMIT 1), 
    'seller', 
    true
  ) ON CONFLICT (id) DO NOTHING;
