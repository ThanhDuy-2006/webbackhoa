# Bách Hóa E-Commerce

Dự án Bách Hóa - Website thương mại điện tử Full-stack với Next.js 15, Supabase, Tailwind CSS và shadcn/ui.

## Hướng dẫn cài đặt và chạy Local

### Bước 1: Thiết lập Database Supabase
Vui lòng đọc file `supabase_setup_instructions.md` để biết cách cấu hình Supabase, chạy SQL tạo bảng, RLS, và dữ liệu mẫu.

### Bước 2: Cài đặt biến môi trường
Mở file `.env.local` và đảm bảo bạn đã điền đúng `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_ANON_KEY` từ dự án Supabase của bạn.

### Bước 3: Cài đặt thư viện
Chạy lệnh sau để cài đặt các dependency:
```bash
npm install
```

### Bước 4: Chạy dự án
```bash
npm run dev
```
Mở trình duyệt truy cập `http://localhost:3000`.

## Hướng dẫn Deploy lên Vercel
1. Đẩy code lên GitHub.
2. Đăng nhập vào [Vercel](https://vercel.com).
3. Bấm **Add New...** -> **Project**.
4. Import repository GitHub của bạn.
5. Trong phần **Environment Variables**, thêm 2 biến:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. Bấm **Deploy**.
