-- FK du_an.customer_id → khach_hang
-- Bước 1: gỡ customer_id không tồn tại trong khach_hang (tránh lỗi 23503 khi ADD CONSTRAINT)
UPDATE public.du_an d
SET customer_id = NULL
WHERE d.customer_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.khach_hang k WHERE k.id = d.customer_id
  );

DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO orphan_count
  FROM public.du_an d
  WHERE d.customer_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.khach_hang k WHERE k.id = d.customer_id);

  IF orphan_count > 0 THEN
    RAISE EXCEPTION 'Còn % dòng du_an có customer_id không khớp khach_hang — đã cố gắn NULL ở bước UPDATE phía trên', orphan_count;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_du_an_khach_hang') THEN
    ALTER TABLE public.du_an
    ADD CONSTRAINT fk_du_an_khach_hang
    FOREIGN KEY (customer_id) REFERENCES public.khach_hang(id) ON DELETE SET NULL;
    RAISE NOTICE 'Đã thêm fk_du_an_khach_hang';
  ELSE
    RAISE NOTICE 'fk_du_an_khach_hang đã tồn tại — bỏ qua';
  END IF;
END $$;
