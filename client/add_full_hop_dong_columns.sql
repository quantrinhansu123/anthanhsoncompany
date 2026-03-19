-- Migration: Thêm đầy đủ các cột vào bảng hop_dong theo yêu cầu
-- Các cột cần thêm:
-- - Contract_ID (đổi tên id thành contract_id)
-- - Tên đầy đủ chủ đầu tư
-- - Đại diện bên A
-- - Chức vụ đại diện A
-- - Tài khoản bên A
-- - MST
-- - Địa chỉ tại thời điểm ký
-- - Người đại diện ký
-- - Loại công trình
-- - Cấp công trình
-- - Trạng thái

DO $$
BEGIN
  -- Đổi tên cột id thành contract_id nếu chưa đổi
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'hop_dong' AND column_name = 'id'
  ) AND NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'hop_dong' AND column_name = 'contract_id'
  ) THEN
    ALTER TABLE public.hop_dong RENAME COLUMN id TO contract_id;
    RAISE NOTICE 'Đã đổi tên cột id thành contract_id';
  ELSE
    RAISE NOTICE 'Cột contract_id đã tồn tại hoặc id không tồn tại';
  END IF;
  
  -- Thêm cột "Tên đầy đủ chủ đầu tư"
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'hop_dong' AND column_name = 'ten_day_du_chu_dau_tu'
  ) THEN
    ALTER TABLE public.hop_dong ADD COLUMN ten_day_du_chu_dau_tu VARCHAR(500);
    RAISE NOTICE 'Đã thêm cột ten_day_du_chu_dau_tu';
  ELSE
    RAISE NOTICE 'Cột ten_day_du_chu_dau_tu đã tồn tại';
  END IF;

  -- Thêm cột "Đại diện bên A"
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'hop_dong' AND column_name = 'dai_dien_ben_a'
  ) THEN
    ALTER TABLE public.hop_dong ADD COLUMN dai_dien_ben_a VARCHAR(255);
    RAISE NOTICE 'Đã thêm cột dai_dien_ben_a';
  ELSE
    RAISE NOTICE 'Cột dai_dien_ben_a đã tồn tại';
  END IF;

  -- Thêm cột "Chức vụ đại diện A"
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'hop_dong' AND column_name = 'chuc_vu_dai_dien_a'
  ) THEN
    ALTER TABLE public.hop_dong ADD COLUMN chuc_vu_dai_dien_a VARCHAR(255);
    RAISE NOTICE 'Đã thêm cột chuc_vu_dai_dien_a';
  ELSE
    RAISE NOTICE 'Cột chuc_vu_dai_dien_a đã tồn tại';
  END IF;

  -- Thêm cột "Tài khoản bên A"
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'hop_dong' AND column_name = 'tai_khoan_ben_a'
  ) THEN
    ALTER TABLE public.hop_dong ADD COLUMN tai_khoan_ben_a VARCHAR(100);
    RAISE NOTICE 'Đã thêm cột tai_khoan_ben_a';
  ELSE
    RAISE NOTICE 'Cột tai_khoan_ben_a đã tồn tại';
  END IF;

  -- Thêm cột "MST" (Mã số thuế)
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'hop_dong' AND column_name = 'mst'
  ) THEN
    ALTER TABLE public.hop_dong ADD COLUMN mst VARCHAR(50);
    RAISE NOTICE 'Đã thêm cột mst';
  ELSE
    RAISE NOTICE 'Cột mst đã tồn tại';
  END IF;

  -- Thêm cột "Địa chỉ tại thời điểm ký"
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'hop_dong' AND column_name = 'dia_chi_tai_thoi_diem_ky'
  ) THEN
    ALTER TABLE public.hop_dong ADD COLUMN dia_chi_tai_thoi_diem_ky TEXT;
    RAISE NOTICE 'Đã thêm cột dia_chi_tai_thoi_diem_ky';
  ELSE
    RAISE NOTICE 'Cột dia_chi_tai_thoi_diem_ky đã tồn tại';
  END IF;

  -- Thêm cột "Người đại diện ký"
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'hop_dong' AND column_name = 'nguoi_dai_dien_ky'
  ) THEN
    ALTER TABLE public.hop_dong ADD COLUMN nguoi_dai_dien_ky VARCHAR(255);
    RAISE NOTICE 'Đã thêm cột nguoi_dai_dien_ky';
  ELSE
    RAISE NOTICE 'Cột nguoi_dai_dien_ky đã tồn tại';
  END IF;

  -- Thêm cột "Loại công trình"
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'hop_dong' AND column_name = 'loai_cong_trinh'
  ) THEN
    ALTER TABLE public.hop_dong ADD COLUMN loai_cong_trinh VARCHAR(255);
    RAISE NOTICE 'Đã thêm cột loai_cong_trinh';
  ELSE
    RAISE NOTICE 'Cột loai_cong_trinh đã tồn tại';
  END IF;

  -- Thêm cột "Cấp công trình"
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'hop_dong' AND column_name = 'cap_cong_trinh'
  ) THEN
    ALTER TABLE public.hop_dong ADD COLUMN cap_cong_trinh VARCHAR(100);
    RAISE NOTICE 'Đã thêm cột cap_cong_trinh';
  ELSE
    RAISE NOTICE 'Cột cap_cong_trinh đã tồn tại';
  END IF;

  -- Thêm cột "Trạng thái" (nếu chưa có, có thể dùng file_status hoặc tạo mới)
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'hop_dong' AND column_name = 'trang_thai'
  ) THEN
    ALTER TABLE public.hop_dong ADD COLUMN trang_thai VARCHAR(100);
    RAISE NOTICE 'Đã thêm cột trang_thai';
  ELSE
    RAISE NOTICE 'Cột trang_thai đã tồn tại';
  END IF;

END $$;

-- Tạo index cho các cột quan trọng
CREATE INDEX IF NOT EXISTS idx_hop_dong_mst ON public.hop_dong(mst);
CREATE INDEX IF NOT EXISTS idx_hop_dong_trang_thai ON public.hop_dong(trang_thai);
