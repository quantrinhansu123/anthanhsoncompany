-- RLS cho bảng nhan_su_chi_tiet (chứng chỉ hành nghề)
-- Chạy trong Supabase SQL Editor nếu muốn client gọi Supabase trực tiếp.
-- Ứng dụng cũng có API /api/certificates (service role) — không bắt buộc chạy script này.

ALTER TABLE public.nhan_su_chi_tiet ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon users to read nhan_su_chi_tiet" ON public.nhan_su_chi_tiet;
DROP POLICY IF EXISTS "Allow anon users to insert nhan_su_chi_tiet" ON public.nhan_su_chi_tiet;
DROP POLICY IF EXISTS "Allow anon users to update nhan_su_chi_tiet" ON public.nhan_su_chi_tiet;
DROP POLICY IF EXISTS "Allow anon users to delete nhan_su_chi_tiet" ON public.nhan_su_chi_tiet;

CREATE POLICY "Allow anon users to read nhan_su_chi_tiet"
ON public.nhan_su_chi_tiet FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon users to insert nhan_su_chi_tiet"
ON public.nhan_su_chi_tiet FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon users to update nhan_su_chi_tiet"
ON public.nhan_su_chi_tiet FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon users to delete nhan_su_chi_tiet"
ON public.nhan_su_chi_tiet FOR DELETE TO anon USING (true);
