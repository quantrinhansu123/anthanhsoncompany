-- =====================================================================
-- TẠO STORAGE BUCKET CHO CONTRACT FILES
-- =====================================================================
-- LƯU Ý: Bucket phải được tạo thủ công trong Supabase Dashboard > Storage
-- Script này sẽ tự động tạo policies cho bucket đã tồn tại
-- =====================================================================

-- Tên bucket
DO $$
DECLARE
    bucket_name TEXT := 'contract-files';
    bucket_exists BOOLEAN;
BEGIN
    -- Kiểm tra bucket có tồn tại không
    SELECT EXISTS (
        SELECT 1 FROM storage.buckets WHERE name = bucket_name
    ) INTO bucket_exists;
    
    IF bucket_exists THEN
        RAISE NOTICE 'Bucket "%" đã tồn tại. Đang tạo policies...', bucket_name;
        
        -- Policy: Cho phép authenticated users upload files
        IF NOT EXISTS (
            SELECT 1 FROM storage.policies 
            WHERE bucket_id = bucket_name 
            AND name = 'Allow authenticated users to upload contract files'
        ) THEN
            CREATE POLICY "Allow authenticated users to upload contract files"
            ON storage.objects
            FOR INSERT
            TO authenticated
            WITH CHECK (bucket_id = bucket_name);
            RAISE NOTICE 'Đã tạo policy: Allow authenticated users to upload contract files';
        END IF;
        
        -- Policy: Cho phép authenticated users đọc files
        IF NOT EXISTS (
            SELECT 1 FROM storage.policies 
            WHERE bucket_id = bucket_name 
            AND name = 'Allow authenticated users to read contract files'
        ) THEN
            CREATE POLICY "Allow authenticated users to read contract files"
            ON storage.objects
            FOR SELECT
            TO authenticated
            USING (bucket_id = bucket_name);
            RAISE NOTICE 'Đã tạo policy: Allow authenticated users to read contract files';
        END IF;
        
        -- Policy: Cho phép authenticated users xóa files của chính họ
        IF NOT EXISTS (
            SELECT 1 FROM storage.policies 
            WHERE bucket_id = bucket_name 
            AND name = 'Allow authenticated users to delete contract files'
        ) THEN
            CREATE POLICY "Allow authenticated users to delete contract files"
            ON storage.objects
            FOR DELETE
            TO authenticated
            USING (bucket_id = bucket_name);
            RAISE NOTICE 'Đã tạo policy: Allow authenticated users to delete contract files';
        END IF;
        
        -- Policy: Cho phép authenticated users cập nhật files
        IF NOT EXISTS (
            SELECT 1 FROM storage.policies 
            WHERE bucket_id = bucket_name 
            AND name = 'Allow authenticated users to update contract files'
        ) THEN
            CREATE POLICY "Allow authenticated users to update contract files"
            ON storage.objects
            FOR UPDATE
            TO authenticated
            USING (bucket_id = bucket_name);
            RAISE NOTICE 'Đã tạo policy: Allow authenticated users to update contract files';
        END IF;
        
    ELSE
        RAISE NOTICE 'Bucket "%" chưa tồn tại. Vui lòng tạo bucket trong Supabase Dashboard > Storage > New bucket với tên "%" và chọn Public bucket.', bucket_name, bucket_name;
    END IF;
END $$;
