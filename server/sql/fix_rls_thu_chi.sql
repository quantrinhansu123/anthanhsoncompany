-- RLS trên thu_chi: client anon thường bị chặn INSERT/SELECT (42501).
-- Ứng dụng đã dùng API server (service role) cho tạo/sửa/xóa/danh sách.
-- Chạy script này CHỈ nếu vẫn cần truy cập trực tiếp Supabase từ trình duyệt.

-- Cách 1 — development: tắt RLS
-- ALTER TABLE public.thu_chi DISABLE ROW LEVEL SECURITY;

-- Cách 2 — cho phép anon đọc/ghi (cẩn thận khi production)
ALTER TABLE public.thu_chi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "thu_chi_anon_all" ON public.thu_chi;
CREATE POLICY "thu_chi_anon_all"
  ON public.thu_chi
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
