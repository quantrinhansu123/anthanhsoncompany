-- Thêm cột các bước đánh giá / phê duyệt cho cong_viec_chi_tiet (JSONB)
-- Mỗi bước: { "id": "truong_bo_phan", "ten": "Trưởng bộ phận phê duyệt", "trang_thai": "cho"|"da_duyet", "nguoi_duyet": "...", "ngay_gio": "ISO", "ghi_chu": "..." }
-- Chạy trong Supabase SQL Editor.

ALTER TABLE public.cong_viec_chi_tiet
  ADD COLUMN IF NOT EXISTS buoc_danh_gia JSONB DEFAULT '[]'::jsonb;
