-- Tên gói thầu trên phiếu thu/chi (một dự án có nhiều gói; có thể khác tên trên HĐ hoặc ghi khi chưa gắn HĐ)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'thu_chi' AND column_name = 'ten_goi_thau'
  ) THEN
    ALTER TABLE public.thu_chi ADD COLUMN ten_goi_thau TEXT;
    RAISE NOTICE 'Đã thêm cột ten_goi_thau vào thu_chi';
  ELSE
    RAISE NOTICE 'Cột ten_goi_thau đã tồn tại trên thu_chi';
  END IF;
END $$;
