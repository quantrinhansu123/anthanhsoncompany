-- =====================================================================
-- SCRIPT TỰ ĐỘNG SETUP TẤT CẢ STORAGE BUCKETS VÀ POLICIES
-- =====================================================================
-- LƯU Ý: Buckets phải được tạo thủ công trong Supabase Dashboard > Storage
-- Script này sẽ tự động tạo policies cho các buckets đã tồn tại
-- =====================================================================

-- Danh sách buckets cần thiết
DO $$
DECLARE
    bucket_name TEXT;
    bucket_exists BOOLEAN;
    buckets_to_setup TEXT[] := ARRAY[
        'employee-avatars',
        'thu-chi-files',
        'task-evidence',
        'certificates',
        'logos'
    ];
BEGIN
    -- Duyệt qua từng bucket
    FOREACH bucket_name IN ARRAY buckets_to_setup
    LOOP
        -- Kiểm tra bucket có tồn tại không
        SELECT EXISTS (
            SELECT 1 FROM storage.buckets WHERE name = bucket_name
        ) INTO bucket_exists;
        
        IF bucket_exists THEN
            RAISE NOTICE 'Bucket "%" đã tồn tại. Đang tạo policies...', bucket_name;
            
            -- Xóa các policy cũ nếu tồn tại
            EXECUTE format('DROP POLICY IF EXISTS "Allow anon uploads to %s" ON storage.objects', bucket_name);
            EXECUTE format('DROP POLICY IF EXISTS "Allow anon read from %s" ON storage.objects', bucket_name);
            EXECUTE format('DROP POLICY IF EXISTS "Allow anon delete from %s" ON storage.objects', bucket_name);
            EXECUTE format('DROP POLICY IF EXISTS "Allow anon update %s" ON storage.objects', bucket_name);
            
            -- Tạo policies mới
            EXECUTE format('
                CREATE POLICY "Allow anon uploads to %s"
                ON storage.objects FOR INSERT
                TO anon
                WITH CHECK (bucket_id = %L)
            ', bucket_name, bucket_name);
            
            EXECUTE format('
                CREATE POLICY "Allow anon read from %s"
                ON storage.objects FOR SELECT
                TO anon
                USING (bucket_id = %L)
            ', bucket_name, bucket_name);
            
            EXECUTE format('
                CREATE POLICY "Allow anon update %s"
                ON storage.objects FOR UPDATE
                TO anon
                USING (bucket_id = %L)
                WITH CHECK (bucket_id = %L)
            ', bucket_name, bucket_name, bucket_name);
            
            EXECUTE format('
                CREATE POLICY "Allow anon delete from %s"
                ON storage.objects FOR DELETE
                TO anon
                USING (bucket_id = %L)
            ', bucket_name, bucket_name);
            
            RAISE NOTICE 'Đã tạo policies cho bucket "%"', bucket_name;
        ELSE
            RAISE WARNING 'Bucket "%" CHƯA TỒN TẠI! Vui lòng tạo bucket trong Supabase Dashboard > Storage > New bucket với tên "%" và chọn Public bucket.', bucket_name, bucket_name;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Hoàn tất setup storage buckets!';
END $$;

-- =====================================================================
-- KIỂM TRA KẾT QUẢ
-- =====================================================================
-- Xem danh sách buckets đã tạo
SELECT 
    name as bucket_name,
    public as is_public,
    created_at
FROM storage.buckets
WHERE name IN ('employee-avatars', 'thu-chi-files', 'task-evidence', 'certificates', 'logos')
ORDER BY name;

-- Xem danh sách policies đã tạo
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'objects'
    AND schemaname = 'storage'
    AND (
        policyname LIKE '%employee-avatars%'
        OR policyname LIKE '%thu-chi-files%'
        OR policyname LIKE '%task-evidence%'
        OR policyname LIKE '%certificates%'
        OR policyname LIKE '%logos%'
    )
ORDER BY policyname;
