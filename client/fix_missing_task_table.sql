-- Fix nhanh lỗi PGRST205: Could not find table public.task
-- Chạy file này trong Supabase SQL Editor

create extension if not exists pgcrypto;

-- Đảm bảo bảng task tồn tại
create table if not exists public.task (
  id uuid primary key default gen_random_uuid(),
  hop_dong_id uuid not null,
  ten_task varchar(500) not null,
  mo_ta text,
  trang_thai varchar(50) default 'Chưa bắt đầu',
  uu_tien varchar(20) default 'Trung bình',
  ngay_bat_dau date,
  ngay_ket_thuc date,
  ngay_hoan_thanh date,
  nguoi_phu_trach varchar(255),
  tien_do integer default 0,
  ghi_chu text,
  link_tai_lieu text,
  anh_bang_chung text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Đảm bảo các cột mở rộng tồn tại (nếu bảng đã tạo từ bản cũ)
alter table public.task add column if not exists link_tai_lieu text;
alter table public.task add column if not exists anh_bang_chung text;

-- FK đến hợp đồng (nếu có bảng hop_dong)
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'hop_dong'
  ) then
    if not exists (
      select 1 from pg_constraint
      where conname = 'fk_task_hop_dong'
    ) then
      alter table public.task
      add constraint fk_task_hop_dong
      foreign key (hop_dong_id) references public.hop_dong(id) on delete cascade;
    end if;
  end if;
end $$;

create index if not exists idx_task_hop_dong_id on public.task(hop_dong_id);
create index if not exists idx_task_trang_thai on public.task(trang_thai);

-- Trigger cập nhật updated_at
create or replace function public.update_task_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_update_task_updated_at on public.task;
create trigger trigger_update_task_updated_at
before update on public.task
for each row
execute function public.update_task_updated_at();

-- Reload PostgREST schema cache để API thấy bảng ngay
notify pgrst, 'reload schema';

-- Verify
select to_regclass('public.task') as task_table_exists;
