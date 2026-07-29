
-- 1. Xóa toàn bộ dữ liệu giao dịch
TRUNCATE TABLE public.seller_ledger_transactions CASCADE;
TRUNCATE TABLE public.seller_withdrawals CASCADE;
TRUNCATE TABLE public.order_items CASCADE;
TRUNCATE TABLE public.seller_orders CASCADE;
TRUNCATE TABLE public.orders CASCADE;
TRUNCATE TABLE public.carts CASCADE;
TRUNCATE TABLE public.seller_wallets CASCADE;

-- 2. Xóa toàn bộ dữ liệu sản phẩm và báo cáo
TRUNCATE TABLE public.product_reports CASCADE;
TRUNCATE TABLE public.seller_reports CASCADE;
TRUNCATE TABLE public.audit_logs CASCADE;
TRUNCATE TABLE public.product_images CASCADE;
TRUNCATE TABLE public.product_variants CASCADE;
TRUNCATE TABLE public.products CASCADE;

-- 3. Xóa người dùng (Tất cả tài khoản TRỪ Admin)
-- Xóa Profiles trước (nếu không có cascade)
DELETE FROM public.profiles WHERE role IS DISTINCT FROM 'admin';

-- Xóa Auth Users (Dựa trên những profile admin còn lại)
DELETE FROM auth.users WHERE id NOT IN (
    SELECT id FROM public.profiles WHERE role = 'admin'
);

