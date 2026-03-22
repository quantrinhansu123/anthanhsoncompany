-- Lịch làm việc theo nhân sự (ca, nghỉ, họp, đào tạo, ...)
-- Chạy thủ công trên Supabase SQL editor nếu bảng chưa tồn tại.

CREATE TABLE IF NOT EXISTS public.lich_lam_viec (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nhan_su_id UUID NOT NULL REFERENCES public.nhan_su(id) ON DELETE CASCADE,
  ngay DATE NOT NULL,
  gio_bat_dau TIME,
  gio_ket_thuc TIME,
  loai VARCHAR(50) NOT NULL DEFAULT 'ca',
  tieu_de VARCHAR(255),
  ghi_chu TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lich_lam_viec_nhan_su ON public.lich_lam_viec(nhan_su_id);
CREATE INDEX IF NOT EXISTS idx_lich_lam_viec_ngay ON public.lich_lam_viec(ngay);

COMMENT ON TABLE public.lich_lam_viec IS 'Lịch làm việc / ca / nghỉ theo từng nhân sự';
