-- Thêm cột ngày bắt đầu / kết thúc / hoàn thành cho bảng cong_viec_chi_tiet
-- Chạy script này trong Supabase SQL Editor.

ALTER TABLE public.cong_viec_chi_tiet
  ADD COLUMN IF NOT EXISTS ngay_bat_dau date,
  ADD COLUMN IF NOT EXISTS ngay_ket_thuc date,
  ADD COLUMN IF NOT EXISTS ngay_hoan_thanh date;

-- Nếu chỉ đang dùng cột han_hoan_thanh cũ, có thể copy sang ngay_ket_thuc để đồng bộ hiển thị
UPDATE public.cong_viec_chi_tiet
SET ngay_ket_thuc = han_hoan_thanh
WHERE ngay_ket_thuc IS NULL AND han_hoan_thanh IS NOT NULL;

