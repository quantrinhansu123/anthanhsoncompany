-- Nhật ký: nhân sự đã làm gì trong ngày (theo công việc chi tiết)
-- Chạy trong Supabase SQL Editor.

create extension if not exists "pgcrypto";

create table if not exists public.cong_viec_nhat_ky_nhan_su (
  id uuid primary key default gen_random_uuid(),
  cong_viec_chi_tiet_id uuid not null references public.cong_viec_chi_tiet (id) on delete cascade,
  nhan_su_id text not null,
  nhan_su_ten text not null default '',
  noi_dung text not null,
  task_id text,
  quy_trinh_item_id text,
  ghi_chu text,
  trang_thai text not null default 'Đang làm',
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_cong_viec_nhat_ky_chi_tiet_created
  on public.cong_viec_nhat_ky_nhan_su (cong_viec_chi_tiet_id, created_at desc);

comment on table public.cong_viec_nhat_ky_nhan_su is
  'Ghi nhận các công việc nhân sự đã làm (theo ngày giờ) cho từng công việc chi tiết.';

alter table public.cong_viec_nhat_ky_nhan_su enable row level security;

drop policy if exists "Allow anon full access cong_viec_nhat_ky_nhan_su" on public.cong_viec_nhat_ky_nhan_su;
create policy "Allow anon full access cong_viec_nhat_ky_nhan_su"
  on public.cong_viec_nhat_ky_nhan_su
  for all
  to anon
  using (true)
  with check (true);

drop policy if exists "Allow authenticated full access cong_viec_nhat_ky_nhan_su" on public.cong_viec_nhat_ky_nhan_su;
create policy "Allow authenticated full access cong_viec_nhat_ky_nhan_su"
  on public.cong_viec_nhat_ky_nhan_su
  for all
  to authenticated
  using (true)
  with check (true);
