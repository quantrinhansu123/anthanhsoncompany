-- =====================================================================
-- FIX RLS (Row Level Security) CHO BẢNG thu_vien_loi
-- Chạy script này trong Supabase SQL Editor nếu query trả về empty array
-- =====================================================================

-- CÁCH 1: TẮT RLS (Đơn giản nhất cho development)
ALTER TABLE public.thu_vien_loi DISABLE ROW LEVEL SECURITY;

-- CÁCH 2: TẠO POLICY CHO PHÉP TẤT CẢ SELECT (Nếu muốn giữ RLS bật)
-- Xóa policy cũ nếu có
DROP POLICY IF EXISTS "Allow all SELECT on thu_vien_loi" ON public.thu_vien_loi;

-- Tạo policy mới cho phép SELECT cho tất cả users (anon role)
CREATE POLICY "Allow all SELECT on thu_vien_loi"
ON public.thu_vien_loi
FOR SELECT
TO anon, authenticated
USING (true);

-- Nếu muốn cho phép cả INSERT, UPDATE, DELETE (cho development)
DROP POLICY IF EXISTS "Allow all operations on thu_vien_loi" ON public.thu_vien_loi;

CREATE POLICY "Allow all operations on thu_vien_loi"
ON public.thu_vien_loi
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Kiểm tra RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'thu_vien_loi' AND schemaname = 'public';

-- Kiểm tra policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'thu_vien_loi' AND schemaname = 'public';
