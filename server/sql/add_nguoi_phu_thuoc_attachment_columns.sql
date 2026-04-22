-- Thêm cột đính kèm cho bảng người phụ thuộc
-- Chạy file này trên Supabase SQL Editor

ALTER TABLE public.nguoi_phu_thuoc
  ADD COLUMN IF NOT EXISTS file_url TEXT,
  ADD COLUMN IF NOT EXISTS file_name TEXT,
  ADD COLUMN IF NOT EXISTS file_type VARCHAR(50);

-- Đồng bộ luôn bảng dependents để tránh lệch schema nếu có màn hình khác dùng bảng này
ALTER TABLE public.dependents
  ADD COLUMN IF NOT EXISTS file_url TEXT,
  ADD COLUMN IF NOT EXISTS file_name TEXT,
  ADD COLUMN IF NOT EXISTS file_type VARCHAR(50);

