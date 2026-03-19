-- Migration: Thêm cột files vào bảng hop_dong để lưu thông tin các file của hợp đồng
-- Cột này sẽ lưu dưới dạng JSONB array chứa các object với cấu trúc:
-- { file_type: string, file_name: string, file_url: string, uploaded_at: string }

DO $$
BEGIN
  -- Thêm cột files nếu chưa tồn tại
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'hop_dong' AND column_name = 'files'
  ) THEN
    ALTER TABLE public.hop_dong ADD COLUMN files JSONB DEFAULT '[]'::jsonb;
    RAISE NOTICE 'Đã thêm cột files vào bảng hop_dong';
  ELSE
    RAISE NOTICE 'Cột files đã tồn tại trong bảng hop_dong';
  END IF;
END $$;

-- Tạo index cho cột files để tối ưu query
CREATE INDEX IF NOT EXISTS idx_hop_dong_files ON public.hop_dong USING GIN (files);
