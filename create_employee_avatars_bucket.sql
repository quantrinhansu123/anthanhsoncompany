-- Script SQL để tạo bucket và policies cho employee-avatars
-- Chạy script này trong Supabase SQL Editor sau khi đã tạo bucket "employee-avatars" trong Dashboard

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
