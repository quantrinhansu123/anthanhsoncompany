-- Script để thêm các cột nghiệm thu vào bảng task
-- Chạy script này trong Supabase SQL Editor

DO $$
BEGIN
  -- Thêm cột link_tai_lieu (link tài liệu nghiệm thu)
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'task' AND column_name = 'link_tai_lieu'
  ) THEN
    ALTER TABLE public.task ADD COLUMN link_tai_lieu TEXT;
    RAISE NOTICE 'Đã thêm cột link_tai_lieu';
  ELSE
    RAISE NOTICE 'Cột link_tai_lieu đã tồn tại';
  END IF;

  -- Thêm cột anh_bang_chung (URL ảnh bằng chứng nghiệm thu)
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'task' AND column_name = 'anh_bang_chung'
  ) THEN
    ALTER TABLE public.task ADD COLUMN anh_bang_chung TEXT;
    RAISE NOTICE 'Đã thêm cột anh_bang_chung';
  ELSE
    RAISE NOTICE 'Cột anh_bang_chung đã tồn tại';
  END IF;

  RAISE NOTICE 'Hoàn thành thêm các cột nghiệm thu vào bảng task';
END $$;
