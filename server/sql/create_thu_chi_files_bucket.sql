-- Script SQL để tạo policies cho bucket thu-chi-files
-- Chạy script này trong Supabase SQL Editor sau khi đã tạo bucket "thu-chi-files" trong Dashboard

-- Xóa các policy cũ nếu tồn tại
DROP POLICY IF EXISTS "Allow anon uploads to thu-chi-files" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon read from thu-chi-files" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon delete from thu-chi-files" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon update thu-chi-files" ON storage.objects;

-- Policy cho phép anon users upload files và ảnh thu chi
CREATE POLICY "Allow anon uploads to thu-chi-files"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'thu-chi-files');

-- Policy cho phép anon users đọc files và ảnh thu chi
CREATE POLICY "Allow anon read from thu-chi-files"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'thu-chi-files');

-- Policy cho phép anon users cập nhật files và ảnh thu chi
CREATE POLICY "Allow anon update thu-chi-files"
ON storage.objects FOR UPDATE
TO anon
USING (bucket_id = 'thu-chi-files')
WITH CHECK (bucket_id = 'thu-chi-files');

-- Policy cho phép anon users xóa files và ảnh thu chi
CREATE POLICY "Allow anon delete from thu-chi-files"
ON storage.objects FOR DELETE
TO anon
USING (bucket_id = 'thu-chi-files');
