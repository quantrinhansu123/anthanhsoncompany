-- Ngưỡng chi nhân sự: số tiền hoặc % (xem nguong_chi_nhan_su_loai)
-- Chạy toàn bộ script này trên Supabase → SQL Editor (hoặc psql) nếu gặp lỗi schema cache.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'hop_dong' AND column_name = 'nguong_chi_nhan_su'
  ) THEN
    ALTER TABLE public.hop_dong ADD COLUMN nguong_chi_nhan_su NUMERIC(15,2) DEFAULT 0;
    RAISE NOTICE 'Đã thêm cột nguong_chi_nhan_su vào hop_dong';
  END IF;
END $$;

-- Loại: tien (VNĐ) hoặc phan_tram (% × giá trị QT)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'hop_dong' AND column_name = 'nguong_chi_nhan_su_loai'
  ) THEN
    ALTER TABLE public.hop_dong ADD COLUMN nguong_chi_nhan_su_loai VARCHAR(20) DEFAULT 'tien';
    RAISE NOTICE 'Đã thêm cột nguong_chi_nhan_su_loai vào hop_dong';
  END IF;
END $$;
