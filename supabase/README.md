# Supabase SQL Setup Guide

Để đảm bảo hệ thống có đủ tất cả các bảng và logic nghiệp vụ chặt chẽ, vui lòng chạy các file SQL trong SQL Editor của Supabase **theo đúng thứ tự sau**:

1. **`schema.sql`**: Chạy đầu tiên để khởi tạo các bảng cơ sở (profiles, categories, products, carts, orders,...).
2. **`rls_and_rpc.sql`**: Thiết lập bảo mật RLS và tạo các RPC cơ bản.
3. **`schema_v2.sql`**: (Bắt buộc) Nâng cấp cấu trúc database lên chuẩn V2. Thêm Soft Delete, Bảng Variants, Reviews, Wishlist, Inventory Logs.
4. **`rpc_v2.sql`**: (Bắt buộc) Nâng cấp các RPC lên chuẩn bảo mật cao nhất, xử lý coupon, hoàn tiền tự động, và kiểm tra tồn kho chính xác.
5. **`seed.sql`**: (Tùy chọn) Khởi tạo dữ liệu mẫu để test web.

Sau khi chạy xong, hãy đăng ký 1 tài khoản trên web và chạy lệnh sau để set quyền admin:
```sql
UPDATE public.profiles SET role = 'admin' WHERE email = 'your-email@example.com';
```
