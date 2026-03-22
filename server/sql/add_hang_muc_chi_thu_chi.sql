-- Hạng mục chi: chi_du_an | chi_nhan_su (dùng khi Phiếu chi)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'thu_chi' AND column_name = 'hang_muc_chi'
  ) THEN
    ALTER TABLE public.thu_chi ADD COLUMN hang_muc_chi VARCHAR(30) DEFAULT 'chi_du_an';
    RAISE NOTICE 'Đã thêm cột hang_muc_chi vào thu_chi';
  END IF;
END $$;
