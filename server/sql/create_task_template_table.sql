-- Task template table (độc lập, không liên quan hợp đồng)
-- Lưu: loai_cv, cv, task, mo_ta, tieu_chuan(list), cac_buoc(list{hanh_dong, ghi_chu})

-- UUID generator
create extension if not exists pgcrypto;

-- updated_at trigger function (tạo 1 lần)
create or replace function public.set_current_timestamp_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists public.task_template (
  id uuid primary key default gen_random_uuid(),
  loai_cv text not null,
  cv text not null,
  task text not null,
  mo_ta text,
  tieu_chuan jsonb not null default '[]'::jsonb,
  cac_buoc jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists task_template_set_updated_at on public.task_template;
create trigger task_template_set_updated_at
before update on public.task_template
for each row
execute procedure public.set_current_timestamp_updated_at();

