-- Sửa dữ liệu ten_khach_hang: Nếu là ID, cập nhật thành tên từ bảng khach_hang
-- Chạy script này trong Supabase SQL Editor

-- Bước 1: Kiểm tra dữ liệu hiện tại
SELECT 
    id,
    ten_du_an,
    customer_id,
    ten_khach_hang,
    CASE 
        WHEN ten_khach_hang ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 'UUID'
        WHEN ten_khach_hang ~ '^[0-9a-f]{8}$' THEN 'Short ID'
        ELSE 'Name'
    END as ten_khach_hang_type
FROM public.du_an
WHERE ten_khach_hang IS NOT NULL
LIMIT 20;

-- Bước 2: Cập nhật ten_khach_hang từ customer_id nếu ten_khach_hang là ID
UPDATE public.du_an da
SET ten_khach_hang = kh.ten_don_vi
FROM public.khach_hang kh
WHERE da.customer_id = kh.id
  AND da.ten_khach_hang IS NOT NULL
  AND (
    -- Nếu ten_khach_hang là UUID format
    da.ten_khach_hang ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    OR
    -- Hoặc là short ID format (8 ký tự hex)
    da.ten_khach_hang ~ '^[0-9a-f]{8}$'
  );

-- Bước 3: Kiểm tra kết quả
SELECT 
    id,
    ten_du_an,
    customer_id,
    ten_khach_hang,
    CASE 
        WHEN ten_khach_hang ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 'UUID'
        WHEN ten_khach_hang ~ '^[0-9a-f]{8}$' THEN 'Short ID'
        ELSE 'Name'
    END as ten_khach_hang_type
FROM public.du_an
WHERE ten_khach_hang IS NOT NULL
LIMIT 20;
