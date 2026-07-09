# Hướng dẫn thiết lập Supabase

Dự án Bách Hóa sử dụng Supabase làm Backend (Database, Auth, Storage). Bạn cần thực hiện các bước sau trong dự án Supabase của mình:

## 1. Chạy mã SQL Schema
1. Đăng nhập vào [Supabase Dashboard](https://supabase.com/dashboard).
2. Chọn dự án của bạn (chứa URL: `xsqkjanebtipiafguyxq.supabase.co`).
3. Chuyển đến mục **SQL Editor** ở sidebar bên trái.
4. Mở file `supabase/schema.sql` (nằm trong thư mục dự án này), copy toàn bộ nội dung và paste vào SQL Editor.
5. Nhấn **Run** để khởi tạo các bảng, trigger tự động (như `handle_new_user`).

## 2. Thiết lập Row Level Security (RLS) & RPCs
1. Tiếp tục ở **SQL Editor**.
2. Mở file `supabase/rls_and_rpc.sql`, copy và paste vào một cửa sổ truy vấn mới.
3. Nhấn **Run**. Thao tác này sẽ bật RLS cho tất cả các bảng, thiết lập phân quyền an toàn, và tạo các hàm bảo mật (RPC) cho việc thanh toán (checkout) và duyệt tiền (approve_topup).

## 3. Khởi tạo Dữ liệu mẫu (Seed Data)
1. Vẫn ở **SQL Editor**.
2. Mở file `supabase/seed.sql`, copy và paste vào một cửa sổ truy vấn mới.
3. Nhấn **Run**. Câu lệnh này sẽ tạo 5 danh mục, 20 sản phẩm, 3 banner và vài mã giảm giá mẫu để bạn có thể test giao diện.

## 4. Cấp quyền Admin cho tài khoản đầu tiên
1. Chạy ứng dụng Next.js ở máy cá nhân (`npm run dev`).
2. Mở trình duyệt, vào trang Đăng ký và tạo một tài khoản (ví dụ: `admin@example.com`).
3. Mặc định tài khoản mới sẽ có role là `user`.
4. Quay lại **Supabase SQL Editor**, chạy câu lệnh sau để nâng cấp tài khoản của bạn thành `admin`:
   ```sql
   UPDATE public.profiles
   SET role = 'admin'
   WHERE email = 'admin@example.com';
   ```
5. Đăng xuất và đăng nhập lại trên web, bạn sẽ truy cập được trang Quản trị (`/admin`).

## 5. Cấu hình Storage
1. Vào mục **Storage** ở sidebar bên trái trong Supabase.
2. Tạo 2 bucket (New bucket):
   - `products`: Public bucket (Bật "Public bucket" khi tạo). Dùng để lưu ảnh sản phẩm.
   - `topups`: Private bucket (Tắt "Public bucket" khi tạo). Dùng để lưu bằng chứng chuyển khoản nạp tiền.
3. (Tùy chọn) Bạn có thể cần vào phần Policies của Storage để cho phép Admin (hoặc User) được phép upload ảnh. Tuy nhiên, ở bản demo chúng ta có thể config policy cho Storage sau nếu bị lỗi upload (hoặc dùng policy có sẵn).
