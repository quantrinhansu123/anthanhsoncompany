-- Script để thêm RLS policies cho bảng task
-- Chạy script này trong Supabase SQL Editor

-- Bật RLS cho bảng task
ALTER TABLE public.task ENABLE ROW LEVEL SECURITY;

-- Xóa các policy cũ nếu tồn tại (để tránh conflict)
DROP POLICY IF EXISTS "Allow all operations on task" ON public.task;
DROP POLICY IF EXISTS "Allow authenticated users to read task" ON public.task;
DROP POLICY IF EXISTS "Allow authenticated users to insert task" ON public.task;
DROP POLICY IF EXISTS "Allow authenticated users to update task" ON public.task;
DROP POLICY IF EXISTS "Allow authenticated users to delete task" ON public.task;
DROP POLICY IF EXISTS "Allow anon users to read task" ON public.task;
DROP POLICY IF EXISTS "Allow anon users to insert task" ON public.task;
DROP POLICY IF EXISTS "Allow anon users to update task" ON public.task;
DROP POLICY IF EXISTS "Allow anon users to delete task" ON public.task;
DROP POLICY IF EXISTS "Allow public access to task" ON public.task;

-- Policy cho phép anon users (ứng dụng đang dùng anon key) đọc task
CREATE POLICY "Allow anon users to read task"
ON public.task
FOR SELECT
TO anon
USING (true);

-- Policy cho phép anon users thêm task
CREATE POLICY "Allow anon users to insert task"
ON public.task
FOR INSERT
TO anon
WITH CHECK (true);

-- Policy cho phép anon users cập nhật task
CREATE POLICY "Allow anon users to update task"
ON public.task
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- Policy cho phép anon users xóa task
CREATE POLICY "Allow anon users to delete task"
ON public.task
FOR DELETE
TO anon
USING (true);

-- Policy cho phép authenticated users (nếu có) đọc task
CREATE POLICY "Allow authenticated users to read task"
ON public.task
FOR SELECT
TO authenticated
USING (true);

-- Policy cho phép authenticated users thêm task
CREATE POLICY "Allow authenticated users to insert task"
ON public.task
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy cho phép authenticated users cập nhật task
CREATE POLICY "Allow authenticated users to update task"
ON public.task
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Policy cho phép authenticated users xóa task
CREATE POLICY "Allow authenticated users to delete task"
ON public.task
FOR DELETE
TO authenticated
USING (true);
