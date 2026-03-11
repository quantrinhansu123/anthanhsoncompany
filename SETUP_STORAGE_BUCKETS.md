# Hướng dẫn tạo Storage Buckets

## Tổng quan

Ứng dụng cần các Storage buckets sau để lưu trữ files và images:

1. **employee-avatars** - Ảnh nhân sự
2. **thu-chi-files** - Files và ảnh chứng từ thu chi
3. **task-evidence** - Ảnh bằng chứng task
4. **certificates** - Files và ảnh chứng chỉ hành nghề
5. **logos** - Logo ứng dụng

## Cách tạo bucket

### Bước 1: Tạo bucket trong Supabase Dashboard

1. Đăng nhập vào [Supabase Dashboard](https://supabase.com/dashboard)
2. Chọn project của bạn
3. Vào **Storage** (menu bên trái)
4. Click **New bucket**
5. Đặt tên bucket (xem danh sách bên dưới)
6. **QUAN TRỌNG**: Chọn **Public bucket** (để có thể truy cập file qua URL)
7. Click **Create bucket**

### Bước 2: Chạy SQL Policies

Sau khi tạo bucket, chạy script SQL tương ứng trong **SQL Editor**:

- `create_employee_avatars_bucket.sql` - Cho bucket `employee-avatars`
- `create_logos_bucket.md` - Cho bucket `logos` (có script SQL trong file)

## Danh sách buckets cần tạo

### 1. employee-avatars
- **Mục đích**: Lưu trữ ảnh nhân sự
- **File hướng dẫn**: `create_employee_avatars_bucket.md`
- **SQL script**: `create_employee_avatars_bucket.sql`

### 2. thu-chi-files
- **Mục đích**: Lưu trữ files và ảnh chứng từ thu chi
- **Cách tạo**: Tương tự như `employee-avatars`
- **SQL policies**: Sử dụng script tương tự, thay `employee-avatars` bằng `thu-chi-files`

### 3. task-evidence
- **Mục đích**: Lưu trữ ảnh bằng chứng task
- **Cách tạo**: Tương tự như `employee-avatars`
- **SQL policies**: Sử dụng script tương tự, thay `employee-avatars` bằng `task-evidence`

### 4. certificates
- **Mục đích**: Lưu trữ files và ảnh chứng chỉ hành nghề
- **Cách tạo**: Tương tự như `employee-avatars`
- **SQL policies**: Sử dụng script tương tự, thay `employee-avatars` bằng `certificates`

### 5. logos
- **Mục đích**: Lưu trữ logo ứng dụng
- **File hướng dẫn**: `create_logos_bucket.md`

## Script SQL mẫu cho các bucket khác

Bạn có thể sử dụng script sau và thay `BUCKET_NAME` bằng tên bucket:

```sql
-- Xóa các policy cũ nếu tồn tại
DROP POLICY IF EXISTS "Allow anon uploads to BUCKET_NAME" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon read from BUCKET_NAME" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon delete from BUCKET_NAME" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon update BUCKET_NAME" ON storage.objects;

-- Policy cho phép anon users upload
CREATE POLICY "Allow anon uploads to BUCKET_NAME"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'BUCKET_NAME');

-- Policy cho phép anon users đọc
CREATE POLICY "Allow anon read from BUCKET_NAME"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'BUCKET_NAME');

-- Policy cho phép anon users cập nhật
CREATE POLICY "Allow anon update BUCKET_NAME"
ON storage.objects FOR UPDATE
TO anon
USING (bucket_id = 'BUCKET_NAME')
WITH CHECK (bucket_id = 'BUCKET_NAME');

-- Policy cho phép anon users xóa
CREATE POLICY "Allow anon delete from BUCKET_NAME"
ON storage.objects FOR DELETE
TO anon
USING (bucket_id = 'BUCKET_NAME');
```

## Kiểm tra bucket đã tạo

Sau khi tạo bucket và chạy SQL, bạn có thể kiểm tra bằng cách:

1. Vào **Storage** trong Supabase Dashboard
2. Xem danh sách buckets - phải có các bucket đã tạo
3. Thử upload một file test để đảm bảo policies hoạt động

## Lưu ý quan trọng

- **TẤT CẢ buckets phải là Public** để có thể truy cập file qua URL
- Nếu bucket không public, file sẽ không hiển thị được trong ứng dụng
- Policies phải được tạo cho role `anon` vì ứng dụng đang sử dụng anon key
