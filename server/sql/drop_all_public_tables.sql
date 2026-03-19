-- =========================================================
-- DROP ALL TABLES IN PUBLIC SCHEMA
-- Muc tieu: xoa toan bo bang dang ton tai trong schema public
-- Luu y: lenh nay se XOA DU LIEU va cac ràng buộc lien quan (CASCADE)
-- =========================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE;', r.tablename);
  END LOOP;
END $$;

-- Kiem tra lai so bang con lai trong public (ket qua = 0 la dung)
SELECT COUNT(*) AS remaining_public_tables
FROM pg_tables
WHERE schemaname = 'public';
