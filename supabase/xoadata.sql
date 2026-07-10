-- Hủy kích hoạt kiểm tra khóa ngoại tạm thời để tránh lỗi ràng buộc (Foreign Key constraint) khi xóa
SET session_replication_role = 'replica';

-- Xóa toàn bộ dữ liệu trong các bảng giao dịch, sản phẩm, và cài đặt... TRỪ bảng `categories`
TRUNCATE TABLE 
  public.product_variants,
  public.products,
  public.product_revenue_rules,
  public.product_revenue_recipients,
  public.product_revenue_shares,
  public.revenue_share_activities,
  public.addresses,
  public.carts,
  public.order_items,
  public.orders,
  public.topup_requests,
  public.wallet_transactions,
  public.coupons,
  public.banners,
  public.notifications,
  public.admin_logs
CASCADE;

-- Xóa tất cả users trong bảng profiles (TRỪ các tài khoản admin / super_admin)
DELETE FROM public.profiles 
WHERE role NOT IN ('admin', 'super_admin');

-- (Tùy chọn) Xóa tài khoản đăng nhập trong auth.users 
-- Nếu muốn hệ thống sạch hoàn toàn, bỏ comment đoạn dưới đây:
-- DELETE FROM auth.users 
-- WHERE id NOT IN (
--   SELECT id FROM public.profiles WHERE role IN ('admin', 'super_admin')
-- );

-- Bật lại kiểm tra khóa ngoại sau khi xóa xong
SET session_replication_role = 'origin';