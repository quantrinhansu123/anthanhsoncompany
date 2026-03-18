-- Tạo extension để sinh UUID (nếu chưa có)
create extension if not exists "pgcrypto";

-- Hàm auto-update cột updated_at
create or replace function public.set_current_timestamp_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Bảng chi tiết công việc (các task con / bước chi tiết)
create table if not exists public.cong_viec_chi_tiet (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.task(id) on delete cascade,

  ten_cong_viec text not null,
  mo_ta text,
  nguoi_thuc_hien text,
  han_hoan_thanh date,

  trang_thai text default 'Chưa bắt đầu',
  tien_do numeric default 0,
  ghi_chu text,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_cong_viec_chi_tiet_task_id
  on public.cong_viec_chi_tiet(task_id);

-- Trigger cập nhật updated_at
drop trigger if exists set_timestamp_cong_viec_chi_tiet on public.cong_viec_chi_tiet;

create trigger set_timestamp_cong_viec_chi_tiet
before update on public.cong_viec_chi_tiet
for each row
execute procedure public.set_current_timestamp_updated_at();

