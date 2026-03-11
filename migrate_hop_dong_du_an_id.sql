-- Migration script để thêm cột du_an_id vào hop_dong và map dữ liệu từ project_name
-- Cột du_an sẽ là foreign key trỏ đến id của bảng du_an

DO $$
BEGIN
  -- 1. Thêm cột du_an_id nếu chưa có
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'hop_dong' 
    AND column_name = 'du_an_id'
  ) THEN
    ALTER TABLE public.hop_dong ADD COLUMN du_an_id UUID;
  END IF;
  
  -- 2. Migration dữ liệu: map project_name sang du_an_id
  -- Tìm id của du_an dựa trên ten_du_an = project_name
  UPDATE public.hop_dong hd
  SET du_an_id = da.id
  FROM public.du_an da
  WHERE hd.project_name = da.ten_du_an
    AND hd.du_an_id IS NULL
    AND hd.project_name IS NOT NULL
    AND hd.project_name != '';
  
  -- 3. Thêm foreign key constraint
  IF NOT EXISTS (
    SELECT FROM pg_constraint 
    WHERE conname = 'fk_hop_dong_du_an'
  ) THEN
    ALTER TABLE public.hop_dong 
    ADD CONSTRAINT fk_hop_dong_du_an 
    FOREIGN KEY (du_an_id) REFERENCES public.du_an(id) ON DELETE SET NULL;
  END IF;
  
  -- 4. Tạo index cho du_an_id
  CREATE INDEX IF NOT EXISTS idx_hop_dong_du_an_id ON public.hop_dong(du_an_id);
END $$;
