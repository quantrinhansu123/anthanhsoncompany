-- Thêm cột lưu nhiều người phụ trách hợp đồng (người phụ trách dạng tickbox)
-- Chạy script này trên Supabase SQL Editor.

ALTER TABLE public.hop_dong
  ADD COLUMN IF NOT EXISTS nhan_su_ids JSONB DEFAULT '[]'::jsonb;

-- Gợi ý: migrate từ nhan_su_id sang mảng (chạy 1 lần)
UPDATE public.hop_dong
SET nhan_su_ids = (
  CASE
    WHEN nhan_su_id IS NOT NULL THEN jsonb_build_array(nhan_su_id::text)
    ELSE '[]'::jsonb
  END
)
WHERE nhan_su_ids = '[]' OR nhan_su_ids IS NULL;
