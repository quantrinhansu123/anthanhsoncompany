# Tạo Storage Bucket cho Ảnh Nghiệm Thu Task

## Hướng dẫn

1. Mở **Supabase Dashboard** → **Storage**
2. Click **New bucket**
3. Đặt tên bucket: `task-evidence`
4. Chọn **Public bucket** (để có thể truy cập ảnh qua URL)
5. Click **Create bucket**

## Sau khi tạo bucket, chạy script SQL sau để thêm policies:

```sql
-- Xóa các policy cũ nếu tồn tại
DROP POLICY IF EXISTS "Allow anon uploads to task-evidence" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon read from task-evidence" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon delete from task-evidence" ON storage.objects;

-- Policy cho phép anon users upload ảnh
CREATE POLICY "Allow anon uploads to task-evidence"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'task-evidence');

-- Policy cho phép anon users đọc ảnh
CREATE POLICY "Allow anon read from task-evidence"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'task-evidence');

-- Policy cho phép anon users xóa ảnh
CREATE POLICY "Allow anon delete from task-evidence"
ON storage.objects FOR DELETE
TO anon
USING (bucket_id = 'task-evidence');
```
