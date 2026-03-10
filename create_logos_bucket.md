# Tạo Storage Bucket cho Logo Ứng Dụng

## Hướng dẫn

1. Mở **Supabase Dashboard** → **Storage**
2. Click **New bucket**
3. Đặt tên bucket: `logos`
4. Chọn **Public bucket** (để có thể truy cập logo qua URL)
5. Click **Create bucket**

## Sau khi tạo bucket, chạy script SQL sau để thêm policies:

```sql
-- Xóa các policy cũ nếu tồn tại
DROP POLICY IF EXISTS "Allow anon uploads to logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon read from logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon delete from logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon update logos" ON storage.objects;

-- Policy cho phép anon users upload logo
CREATE POLICY "Allow anon uploads to logos"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'logos');

-- Policy cho phép anon users đọc logo
CREATE POLICY "Allow anon read from logos"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'logos');

-- Policy cho phép anon users cập nhật logo
CREATE POLICY "Allow anon update logos"
ON storage.objects FOR UPDATE
TO anon
USING (bucket_id = 'logos')
WITH CHECK (bucket_id = 'logos');

-- Policy cho phép anon users xóa logo
CREATE POLICY "Allow anon delete from logos"
ON storage.objects FOR DELETE
TO anon
USING (bucket_id = 'logos');
```
