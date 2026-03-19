-- Script SQL để tạo policies cho bucket certificates
-- Chạy script này trong Supabase SQL Editor sau khi đã tạo bucket "certificates" trong Dashboard

-- Xóa các policy cũ nếu tồn tại
DROP POLICY IF EXISTS "Allow anon uploads to certificates" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon read from certificates" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon delete from certificates" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon update certificates" ON storage.objects;

-- Policy cho phép anon users upload files và ảnh chứng chỉ
CREATE POLICY "Allow anon uploads to certificates"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'certificates');

-- Policy cho phép anon users đọc files và ảnh chứng chỉ
CREATE POLICY "Allow anon read from certificates"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'certificates');

-- Policy cho phép anon users cập nhật files và ảnh chứng chỉ
CREATE POLICY "Allow anon update certificates"
ON storage.objects FOR UPDATE
TO anon
USING (bucket_id = 'certificates')
WITH CHECK (bucket_id = 'certificates');

-- Policy cho phép anon users xóa files và ảnh chứng chỉ
CREATE POLICY "Allow anon delete from certificates"
ON storage.objects FOR DELETE
TO anon
USING (bucket_id = 'certificates');
