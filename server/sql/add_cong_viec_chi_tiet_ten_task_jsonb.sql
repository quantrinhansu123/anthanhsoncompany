-- Cột JSONB mô tả task (tên, tiêu chuẩn, trạng thái đạt/không đạt, ghi chú) cho Quản lý công việc
ALTER TABLE public.cong_viec_chi_tiet
  ADD COLUMN IF NOT EXISTS ten_task jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.cong_viec_chi_tiet.ten_task IS
  'JSON: { ten_task, noi_dung_tieu_chuan, trang_thai (Đạt|Không đạt|Chưa đánh giá), ghi_chu }';
