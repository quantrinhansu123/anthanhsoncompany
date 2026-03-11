-- Thêm cột ten_khach_hang vào bảng du_an
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'du_an' 
    AND column_name = 'ten_khach_hang'
  ) THEN
    ALTER TABLE public.du_an ADD COLUMN ten_khach_hang VARCHAR(500);
    
    -- Cập nhật dữ liệu từ bảng khach_hang nếu có customer_id
    UPDATE public.du_an da
    SET ten_khach_hang = kh.ten_don_vi
    FROM public.khach_hang kh
    WHERE da.customer_id = kh.id
      AND da.ten_khach_hang IS NULL;
    
    RAISE NOTICE 'Đã thêm cột ten_khach_hang vào bảng du_an và cập nhật dữ liệu từ khach_hang';
  ELSE
    RAISE NOTICE 'Cột ten_khach_hang đã tồn tại trong bảng du_an';
  END IF;
END $$;
