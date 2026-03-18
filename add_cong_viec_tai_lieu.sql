-- Thêm cột tài liệu, bình luận, lịch sử cho bảng cong_viec_chi_tiet (JSONB)
-- Chạy script này trong Supabase SQL Editor.

ALTER TABLE public.cong_viec_chi_tiet
  ADD COLUMN IF NOT EXISTS tai_lieu JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS binh_luan JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS lich_su JSONB DEFAULT '[]'::jsonb;

-- Gợi ý: Mỗi phần tử trong tai_lieu: { "ten": "Tên tài liệu", "link": "https://...", "mota": "Mô tả" }
