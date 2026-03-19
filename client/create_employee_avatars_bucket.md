# Tạo Storage Bucket cho Ảnh Nhân Sự

## Hướng dẫn

1. Mở **Supabase Dashboard** → **Storage**
2. Click **New bucket**
3. Đặt tên bucket: `employee-avatars`
4. Chọn **Public bucket** (để có thể truy cập ảnh qua URL)
5. Click **Create bucket**

## Sau khi tạo bucket, chạy script SQL sau để thêm policies:

```sql
-- Xóa các policy cũ nếu tồn tại
DROP POLICY IF EXISTS "Allow anon uploads to employee-avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon read from employee-avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon delete from employee-avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon update employee-avatars" ON storage.objects;

-- Policy cho phép anon users upload ảnh nhân sự
CREATE POLICY "Allow anon uploads to employee-avatars"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'employee-avatars');

-- Policy cho phép anon users đọc ảnh nhân sự
CREATE POLICY "Allow anon read from employee-avatars"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'employee-avatars');

-- Policy cho phép anon users cập nhật ảnh nhân sự
CREATE POLICY "Allow anon update employee-avatars"
ON storage.objects FOR UPDATE
TO anon
USING (bucket_id = 'employee-avatars')
WITH CHECK (bucket_id = 'employee-avatars');

-- Policy cho phép anon users xóa ảnh nhân sự
CREATE POLICY "Allow anon delete from employee-avatars"
ON storage.objects FOR DELETE
TO anon
USING (bucket_id = 'employee-avatars');
```

## Lưu ý

- Bucket `employee-avatars` sẽ lưu trữ tất cả ảnh nhân sự
- Đường dẫn file sẽ có dạng: `employees/{timestamp}_{filename}`
- URL công khai sẽ được tự động tạo sau khi upload thành công
- Nếu cần bảo mật hơn, có thể thêm điều kiện `auth.uid() = user_id` trong policies
