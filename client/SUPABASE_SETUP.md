# Hướng dẫn Setup Supabase Database

## Bước 1: Tạo các bảng trong Supabase

1. Đăng nhập vào [Supabase Dashboard](https://supabase.com/dashboard)
2. Chọn project của bạn
3. Vào **SQL Editor** (menu bên trái)
4. Click **New Query**
5. Copy toàn bộ nội dung file `supabase_schema.sql` và paste vào editor
6. Click **Run** để thực thi script

## Bước 2: Tạo Storage Bucket cho files

1. Vào **Storage** trong Supabase Dashboard
2. Click **New bucket**
3. Tạo bucket với tên: `certificates`
4. Chọn **Public bucket** (để có thể truy cập file qua URL)
5. Click **Create bucket**

## Bước 3: Cấu hình Storage Policies (nếu cần)

Nếu bucket không public, bạn cần tạo policy:

1. Vào **Storage** > **Policies** > chọn bucket `certificates`
2. Click **New Policy**
3. Chọn **For full customization**
4. Thêm policy sau:

```sql
-- Policy để cho phép upload file
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'certificates');

-- Policy để cho phép đọc file
CREATE POLICY "Allow public read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'certificates');

-- Policy để cho phép xóa file
CREATE POLICY "Allow authenticated delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'certificates');
```

## Bước 4: Kiểm tra

Sau khi setup xong, refresh lại ứng dụng và kiểm tra:
- Trang `/nhan-su` có load được danh sách nhân viên không
- Trang `/hanh-chinh/chung-chi-hanh-nghe` có load được danh sách chứng chỉ không
- Form thêm nhân viên có lưu được không

## Lưu ý

- Nếu bạn đã có dữ liệu trong database, script sẽ không ghi đè (sử dụng `CREATE TABLE IF NOT EXISTS`)
- Các bảng sẽ tự động có các cột `created_at` và `updated_at`
- Foreign keys đã được thiết lập để đảm bảo tính toàn vẹn dữ liệu
