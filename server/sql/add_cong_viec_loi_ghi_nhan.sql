-- Cột JSONB ghi nhận lỗi theo từng công việc (thư viện lỗi + người vi phạm + ghi chú + thời điểm)
-- Chạy trong Supabase SQL Editor.

ALTER TABLE public.cong_viec_chi_tiet
  ADD COLUMN IF NOT EXISTS loi_ghi_nhan JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.cong_viec_chi_tiet.loi_ghi_nhan IS
  'Mảng: { id, thu_vien_loi_id, chuyen_nganh, bo_mon, canh_bao_loi, hang_muc_kiem_tra, noi_dung_kiem_tra, nguoi_vi_pham_id, nguoi_vi_pham_ten, ghi_chu, ngay_gio }';
