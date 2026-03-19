-- =========================================================
-- FULL SUPABASE SCHEMA - ONE SHOT
-- Repo: D:\anthanhsoncompany
-- Muc tieu: chay 1 file de tao full bang + cot bo sung
--
-- Luu y:
-- - File nay dung meta-command cua psql (\i), khong chay truc tiep trong Supabase SQL Editor.
-- - Neu dung Supabase SQL Editor, hay copy lan luot noi dung 4 file theo thu tu ben duoi.
-- =========================================================

\echo '1/4 Running supabase_schema.sql ...'
\i D:/anthanhsoncompany/supabase_schema.sql

\echo '2/4 Running create_cong_viec_chi_tiet_table.sql ...'
\i D:/anthanhsoncompany/create_cong_viec_chi_tiet_table.sql

\echo '3/4 Running create_task_template_table.sql ...'
\i D:/anthanhsoncompany/create_task_template_table.sql

\echo '4/4 Running add_cong_viec_buoc_danh_gia.sql ...'
\i D:/anthanhsoncompany/add_cong_viec_buoc_danh_gia.sql

\echo 'DONE: Full schema + extra columns created.'
