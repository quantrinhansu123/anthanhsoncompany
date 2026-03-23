-- Bổ sung: task nguồn, bước quy trình (task con), ghi chú, trạng thái, thời điểm hoàn thành
-- Chạy sau add_cong_viec_nhat_ky_nhan_su.sql

alter table public.cong_viec_nhat_ky_nhan_su
  add column if not exists task_id text,
  add column if not exists quy_trinh_item_id text,
  add column if not exists ghi_chu text,
  add column if not exists trang_thai text not null default 'Đang làm',
  add column if not exists completed_at timestamptz;

comment on column public.cong_viec_nhat_ky_nhan_su.task_id is 'Id công việc nguồn (danh sách QLCV)';
comment on column public.cong_viec_nhat_ky_nhan_su.quy_trinh_item_id is 'Id bước trong quy trình (task con); null = ghi cho cả công việc';
comment on column public.cong_viec_nhat_ky_nhan_su.ghi_chu is 'Ghi chú thêm';
comment on column public.cong_viec_nhat_ky_nhan_su.trang_thai is 'Đang làm | Hoàn thành';
comment on column public.cong_viec_nhat_ky_nhan_su.completed_at is 'Thời điểm duyệt hoàn thành';
