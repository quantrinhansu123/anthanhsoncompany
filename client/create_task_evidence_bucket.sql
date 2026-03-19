-- Script SQL để tạo policies cho bucket task-evidence
-- Chạy script này trong Supabase SQL Editor sau khi đã tạo bucket "task-evidence" trong Dashboard

-- Xóa các policy cũ nếu tồn tại
DROP POLICY IF EXISTS "Allow anon uploads to task-evidence" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon read from task-evidence" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon delete from task-evidence" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon update task-evidence" ON storage.objects;

-- Policy cho phép anon users upload ảnh bằng chứng task
CREATE POLICY "Allow anon uploads to task-evidence"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'task-evidence');

-- Policy cho phép anon users đọc ảnh bằng chứng task
CREATE POLICY "Allow anon read from task-evidence"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'task-evidence');

-- Policy cho phép anon users cập nhật ảnh bằng chứng task
CREATE POLICY "Allow anon update task-evidence"
ON storage.objects FOR UPDATE
TO anon
USING (bucket_id = 'task-evidence')
WITH CHECK (bucket_id = 'task-evidence');

-- Policy cho phép anon users xóa ảnh bằng chứng task
CREATE POLICY "Allow anon delete from task-evidence"
ON storage.objects FOR DELETE
TO anon
USING (bucket_id = 'task-evidence');
