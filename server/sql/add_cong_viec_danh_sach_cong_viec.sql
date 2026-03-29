-- Danh sách việc con tự thêm trong tab "List công việc" (Quản lý công việc)
-- Chạy trong Supabase SQL Editor.

ALTER TABLE public.cong_viec_chi_tiet
  ADD COLUMN IF NOT EXISTS danh_sach_cong_viec JSONB DEFAULT '[]'::jsonb;

-- Mỗi phần tử (JSON trong mảng):
-- { "id": "uuid", "noi_dung": "...", "trang_thai": "Đang làm"|"Hoàn thành"|"Duyệt"|"Từ chối",
--   "ly_do_tu_choi": "..." (khi từ chối), "ngay_gio_hoan_thanh": "ISO", "ghi_chu": "...",
--   "nhan_su_phu_trach_ids": ["uuid", ...] }
-- Bản cũ có thể chỉ có "da_xong": true/false — client map true → Hoàn thành.
