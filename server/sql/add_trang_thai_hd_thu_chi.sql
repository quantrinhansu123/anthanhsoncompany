-- Trạng thái hóa đơn (Có hóa đơn / Chưa có hóa đơn) — màn Thu chi
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'thu_chi' AND column_name = 'trang_thai_hd'
  ) THEN
    ALTER TABLE public.thu_chi ADD COLUMN trang_thai_hd VARCHAR(50);
    RAISE NOTICE 'Đã thêm cột trang_thai_hd vào thu_chi';
  END IF;
END $$;
