-- Cho phép app dùng anon key đọc/ghi khach_hang (nếu vẫn gọi Supabase trực tiếp từ client).
-- Khuyến nghị: dùng API /api/customers (service role) — không bắt buộc chạy file này.

ALTER TABLE public.khach_hang ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS khach_hang_select_all ON public.khach_hang;
DROP POLICY IF EXISTS khach_hang_insert_all ON public.khach_hang;
DROP POLICY IF EXISTS khach_hang_update_all ON public.khach_hang;
DROP POLICY IF EXISTS khach_hang_delete_all ON public.khach_hang;

CREATE POLICY khach_hang_select_all ON public.khach_hang
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY khach_hang_insert_all ON public.khach_hang
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY khach_hang_update_all ON public.khach_hang
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY khach_hang_delete_all ON public.khach_hang
  FOR DELETE TO anon, authenticated USING (true);
