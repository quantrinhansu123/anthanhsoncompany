-- Kiểm tra và thêm cột ten_khach_hang vào bảng du_an
-- Chạy script này trong Supabase SQL Editor

-- Bước 1: Kiểm tra xem cột đã tồn tại chưa
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'du_an' 
  AND column_name = 'ten_khach_hang';

-- Bước 2: Thêm cột nếu chưa có
ALTER TABLE public.du_an 
ADD COLUMN IF NOT EXISTS ten_khach_hang VARCHAR(500);

-- Bước 3: Cập nhật dữ liệu từ bảng khach_hang cho các dự án đã có customer_id
UPDATE public.du_an da
SET ten_khach_hang = kh.ten_don_vi
FROM public.khach_hang kh
WHERE da.customer_id = kh.id
  AND (da.ten_khach_hang IS NULL OR da.ten_khach_hang = '');

-- Bước 4: Kiểm tra lại
SELECT id, ten_du_an, customer_id, ten_khach_hang 
FROM public.du_an 
LIMIT 10;
