-- Hạng mục thu (dùng khi Phiếu thu)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'thu_chi' AND column_name = 'hang_muc_thu'
  ) THEN
    ALTER TABLE public.thu_chi ADD COLUMN hang_muc_thu VARCHAR(100);
    RAISE NOTICE 'Đã thêm cột hang_muc_thu vào thu_chi';
  END IF;
END $$;
