-- Thêm cột lưu nhiều người quản lý / nhiều người thực thi (dự án)
-- Chạy script này trên Supabase SQL Editor nếu bảng du_an đã tồn tại.

-- Cột manager_ids: mảng UUID (dạng JSON array string) ví dụ ["uuid1","uuid2"]
ALTER TABLE public.du_an
  ADD COLUMN IF NOT EXISTS manager_ids JSONB DEFAULT '[]'::jsonb;

-- Cột executor_ids: mảng UUID
ALTER TABLE public.du_an
  ADD COLUMN IF NOT EXISTS executor_ids JSONB DEFAULT '[]'::jsonb;

-- Gợi ý: migrate dữ liệu cũ từ manager_id/executor_id sang mảng (chạy 1 lần)
UPDATE public.du_an
SET manager_ids = (
  CASE
    WHEN manager_id IS NOT NULL THEN jsonb_build_array(manager_id::text)
    ELSE '[]'::jsonb
  END
)
WHERE manager_ids = '[]' OR manager_ids IS NULL;

UPDATE public.du_an
SET executor_ids = (
  CASE
    WHEN executor_id IS NOT NULL THEN jsonb_build_array(executor_id::text)
    ELSE '[]'::jsonb
  END
)
WHERE executor_ids = '[]' OR executor_ids IS NULL;
