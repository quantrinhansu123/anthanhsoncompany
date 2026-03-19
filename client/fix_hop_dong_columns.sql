-- Script để thêm các cột còn thiếu vào bảng hop_dong
-- Chạy script này nếu bảng hop_dong đã tồn tại nhưng thiếu các cột

DO $$
BEGIN
  -- Thêm cột file_status
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'hop_dong' AND column_name = 'file_status'
  ) THEN
    ALTER TABLE public.hop_dong ADD COLUMN file_status TEXT;
    RAISE NOTICE 'Đã thêm cột file_status';
  ELSE
    RAISE NOTICE 'Cột file_status đã tồn tại';
  END IF;

  -- Thêm cột so_hop_dong
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'hop_dong' AND column_name = 'so_hop_dong'
  ) THEN
    ALTER TABLE public.hop_dong ADD COLUMN so_hop_dong VARCHAR(100);
    RAISE NOTICE 'Đã thêm cột so_hop_dong';
  ELSE
    RAISE NOTICE 'Cột so_hop_dong đã tồn tại';
  END IF;

  -- Thêm cột ten_goi_thau
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'hop_dong' AND column_name = 'ten_goi_thau'
  ) THEN
    ALTER TABLE public.hop_dong ADD COLUMN ten_goi_thau TEXT;
    RAISE NOTICE 'Đã thêm cột ten_goi_thau';
  ELSE
    RAISE NOTICE 'Cột ten_goi_thau đã tồn tại';
  END IF;

  -- Thêm cột ngay_ky_hd
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'hop_dong' AND column_name = 'ngay_ky_hd'
  ) THEN
    ALTER TABLE public.hop_dong ADD COLUMN ngay_ky_hd DATE;
    RAISE NOTICE 'Đã thêm cột ngay_ky_hd';
  ELSE
    RAISE NOTICE 'Cột ngay_ky_hd đã tồn tại';
  END IF;

  -- Thêm cột project_name (nếu chưa có)
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'hop_dong' AND column_name = 'project_name'
  ) THEN
    ALTER TABLE public.hop_dong ADD COLUMN project_name VARCHAR(255);
    RAISE NOTICE 'Đã thêm cột project_name';
  ELSE
    RAISE NOTICE 'Cột project_name đã tồn tại';
  END IF;

  -- Thêm cột gia_tri_hd (nếu chưa có)
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'hop_dong' AND column_name = 'gia_tri_hd'
  ) THEN
    ALTER TABLE public.hop_dong ADD COLUMN gia_tri_hd NUMERIC(15,2) DEFAULT 0;
    RAISE NOTICE 'Đã thêm cột gia_tri_hd';
  ELSE
    RAISE NOTICE 'Cột gia_tri_hd đã tồn tại';
  END IF;

  -- Thêm cột gia_tri_qt (nếu chưa có)
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'hop_dong' AND column_name = 'gia_tri_qt'
  ) THEN
    ALTER TABLE public.hop_dong ADD COLUMN gia_tri_qt NUMERIC(15,2) DEFAULT 0;
    RAISE NOTICE 'Đã thêm cột gia_tri_qt';
  ELSE
    RAISE NOTICE 'Cột gia_tri_qt đã tồn tại';
  END IF;

  -- Thêm cột da_thu (nếu chưa có)
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'hop_dong' AND column_name = 'da_thu'
  ) THEN
    ALTER TABLE public.hop_dong ADD COLUMN da_thu NUMERIC(15,2) DEFAULT 0;
    RAISE NOTICE 'Đã thêm cột da_thu';
  ELSE
    RAISE NOTICE 'Cột da_thu đã tồn tại';
  END IF;

  -- Thêm cột con_phai_thu (nếu chưa có)
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'hop_dong' AND column_name = 'con_phai_thu'
  ) THEN
    ALTER TABLE public.hop_dong ADD COLUMN con_phai_thu NUMERIC(15,2) DEFAULT 0;
    RAISE NOTICE 'Đã thêm cột con_phai_thu';
  ELSE
    RAISE NOTICE 'Cột con_phai_thu đã tồn tại';
  END IF;

  -- Thêm cột loai_dich_vu (nếu chưa có)
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'hop_dong' AND column_name = 'loai_dich_vu'
  ) THEN
    ALTER TABLE public.hop_dong ADD COLUMN loai_dich_vu TEXT;
    RAISE NOTICE 'Đã thêm cột loai_dich_vu';
  ELSE
    RAISE NOTICE 'Cột loai_dich_vu đã tồn tại';
  END IF;

  -- Thêm cột ngay_update (nếu chưa có)
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'hop_dong' AND column_name = 'ngay_update'
  ) THEN
    ALTER TABLE public.hop_dong ADD COLUMN ngay_update DATE;
    RAISE NOTICE 'Đã thêm cột ngay_update';
  ELSE
    RAISE NOTICE 'Cột ngay_update đã tồn tại';
  END IF;

  RAISE NOTICE 'Hoàn thành kiểm tra và thêm các cột còn thiếu vào bảng hop_dong';
END $$;
