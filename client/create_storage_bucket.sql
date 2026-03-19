-- Script để tạo Storage Bucket cho chứng chỉ hành nghề
-- Chạy script này trong Supabase SQL Editor

-- Lưu ý: Supabase Storage buckets không thể tạo bằng SQL
-- Bạn cần tạo bucket thủ công trong Supabase Dashboard:
-- 1. Vào Storage trong Supabase Dashboard
-- 2. Click "New bucket"
-- 3. Tên bucket: "certificates"
-- 4. Chọn "Public bucket" (để có thể truy cập file qua URL)
-- 5. Click "Create bucket"

-- Sau khi tạo bucket, bạn có thể tạo policies bằng SQL sau:

-- Xóa các policy cũ nếu tồn tại (để tránh conflict)
DROP POLICY IF EXISTS "Allow authenticated uploads to certificates" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read from certificates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates to certificates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete from certificates" ON storage.objects;

-- Policy để cho phép upload file (authenticated users)
CREATE POLICY "Allow authenticated uploads to certificates"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'certificates');

-- Policy để cho phép đọc file (public)
CREATE POLICY "Allow public read from certificates"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'certificates');

-- Policy để cho phép update file (authenticated users)
CREATE POLICY "Allow authenticated updates to certificates"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'certificates')
WITH CHECK (bucket_id = 'certificates');

-- Policy để cho phép xóa file (authenticated users)
CREATE POLICY "Allow authenticated delete from certificates"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'certificates');
