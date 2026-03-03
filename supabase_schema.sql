-- Helper function để xử lý conflict giữa lowercase và camelCase columns
CREATE OR REPLACE FUNCTION handle_column_conflict(
  p_table_name TEXT,
  p_camel_case_name TEXT,
  p_column_type TEXT
) RETURNS VOID AS $$
DECLARE
  v_lower_case_name TEXT := LOWER(p_camel_case_name);
  v_has_lower BOOLEAN;
  v_has_camel BOOLEAN;
BEGIN
  -- Kiểm tra xem cột nào tồn tại
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = p_table_name 
    AND column_name = v_lower_case_name
  ) INTO v_has_lower;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = p_table_name 
    AND column_name = p_camel_case_name
  ) INTO v_has_camel;
  
  -- Nếu cả hai cột đều tồn tại, merge và xóa lowercase
  IF v_has_lower AND v_has_camel THEN
    -- Copy dữ liệu từ lowercase sang camelCase nếu camelCase trống
    EXECUTE format('UPDATE public.%I SET %I = %I WHERE %I IS NULL OR %I = ''''', 
      p_table_name, p_camel_case_name, v_lower_case_name, p_camel_case_name, p_camel_case_name);
    -- Xóa cột lowercase
    EXECUTE format('ALTER TABLE public.%I DROP COLUMN IF EXISTS %I', p_table_name, v_lower_case_name);
  -- Nếu chỉ có lowercase, đổi tên
  ELSIF v_has_lower AND NOT v_has_camel THEN
    EXECUTE format('ALTER TABLE public.%I RENAME COLUMN %I TO %I', p_table_name, v_lower_case_name, p_camel_case_name);
  -- Nếu không có cả hai, thêm mới
  ELSIF NOT v_has_lower AND NOT v_has_camel THEN
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN %I %s', p_table_name, p_camel_case_name, p_column_type);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Bảng nhan_su có thể đã tồn tại với id là UUID hoặc VARCHAR
-- Nếu chưa tồn tại, tạo mới với id là UUID để khớp với cấu trúc hiện có
-- Nếu đã tồn tại, đảm bảo id là UUID
DO $$
BEGIN
  -- Nếu bảng đã tồn tại, kiểm tra và đổi kiểu id sang UUID nếu cần
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'nhan_su') THEN
    -- Kiểm tra xem id có phải UUID không
    IF EXISTS (SELECT FROM information_schema.columns 
               WHERE table_schema = 'public' 
               AND table_name = 'nhan_su' 
               AND column_name = 'id'
               AND data_type != 'uuid') THEN
      -- Xóa foreign key constraints trước khi đổi kiểu
      IF EXISTS (SELECT FROM pg_constraint WHERE conname = 'dependents_employee_id_fkey') THEN
        ALTER TABLE public.dependents DROP CONSTRAINT IF EXISTS dependents_employee_id_fkey;
      END IF;
      IF EXISTS (SELECT FROM pg_constraint WHERE conname = 'nhan_su_chi_tiet_id_nhan_su_fkey') THEN
        ALTER TABLE public.nhan_su_chi_tiet DROP CONSTRAINT IF EXISTS nhan_su_chi_tiet_id_nhan_su_fkey;
      END IF;
      
      -- Xóa các record có id không hợp lệ (không phải UUID format)
      DELETE FROM public.dependents 
      WHERE employee_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
      DELETE FROM public.nhan_su_chi_tiet 
      WHERE id_nhan_su::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
      
      -- Tạo cột id mới với UUID
      ALTER TABLE public.nhan_su ADD COLUMN IF NOT EXISTS id_new UUID DEFAULT gen_random_uuid();
      
      -- Copy dữ liệu từ id cũ sang id_new (nếu id cũ là UUID hợp lệ)
      UPDATE public.nhan_su 
      SET id_new = id::uuid 
      WHERE id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
      
      -- Xóa cột id cũ và đổi tên id_new thành id
      ALTER TABLE public.nhan_su DROP CONSTRAINT IF EXISTS nhan_su_pkey;
      ALTER TABLE public.nhan_su DROP COLUMN IF EXISTS id;
      ALTER TABLE public.nhan_su RENAME COLUMN id_new TO id;
      ALTER TABLE public.nhan_su ADD PRIMARY KEY (id);
    END IF;
  END IF;
  
  -- Tạo bảng mới nếu chưa tồn tại
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'nhan_su') THEN
    CREATE TABLE public.nhan_su (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR(50) UNIQUE,
      full_name VARCHAR(255),
      name VARCHAR(255),
      hoTen VARCHAR(255),
      department VARCHAR(255),
      phongBan VARCHAR(255),
      position VARCHAR(255),
      chucVu VARCHAR(255),
      email VARCHAR(255),
      phone VARCHAR(50),
      sdtNhanVien VARCHAR(50),
      status VARCHAR(20) DEFAULT 'active',
      joinDate DATE,
      ngayVaoLam DATE,
      ngaySinh DATE,
      diaChi TEXT,
      soCCCD VARCHAR(50),
      ngayCapCCCD DATE,
      mstCaNhan VARCHAR(50),
      maSoBHXH VARCHAR(50),
      bangDHChuyenNganh VARCHAR(255),
      namTotNghiep INTEGER,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  ELSE
    -- Nếu bảng đã tồn tại, thêm các cột mới nếu chưa có
    -- Thêm cột code
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'nhan_su' AND column_name = 'code') THEN
      ALTER TABLE public.nhan_su ADD COLUMN code VARCHAR(50);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_nhan_su_code_unique ON public.nhan_su(code) WHERE code IS NOT NULL;
    END IF;
    
    -- Thêm cột full_name
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'nhan_su' AND column_name = 'full_name') THEN
      ALTER TABLE public.nhan_su ADD COLUMN full_name VARCHAR(255);
    END IF;
    
    -- Thêm cột name
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'nhan_su' AND column_name = 'name') THEN
      ALTER TABLE public.nhan_su ADD COLUMN name VARCHAR(255);
    END IF;
    
    -- Thêm cột hoTen (sử dụng helper function)
    PERFORM handle_column_conflict('nhan_su', 'hoTen', 'VARCHAR(255)');
    
    -- Thêm cột department
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'nhan_su' AND column_name = 'department') THEN
      ALTER TABLE public.nhan_su ADD COLUMN department VARCHAR(255);
    END IF;
    
    -- Thêm cột phongBan (sử dụng helper function)
    PERFORM handle_column_conflict('nhan_su', 'phongBan', 'VARCHAR(255)');
    
    -- Thêm cột position
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'nhan_su' AND column_name = 'position') THEN
      ALTER TABLE public.nhan_su ADD COLUMN position VARCHAR(255);
    END IF;
    
    -- Thêm cột chucVu (sử dụng helper function)
    PERFORM handle_column_conflict('nhan_su', 'chucVu', 'VARCHAR(255)');
    
    -- Thêm cột email
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'nhan_su' AND column_name = 'email') THEN
      ALTER TABLE public.nhan_su ADD COLUMN email VARCHAR(255);
    END IF;
    
    -- Thêm cột phone
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'nhan_su' AND column_name = 'phone') THEN
      ALTER TABLE public.nhan_su ADD COLUMN phone VARCHAR(50);
    END IF;
    
    -- Thêm cột sdtNhanVien (sử dụng helper function)
    PERFORM handle_column_conflict('nhan_su', 'sdtNhanVien', 'VARCHAR(50)');
    
    -- Thêm cột status
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'nhan_su' AND column_name = 'status') THEN
      ALTER TABLE public.nhan_su ADD COLUMN status VARCHAR(20) DEFAULT 'active';
    END IF;
    
    -- Thêm cột joinDate (sử dụng helper function)
    PERFORM handle_column_conflict('nhan_su', 'joinDate', 'DATE');
    
    -- Thêm cột ngayVaoLam (sử dụng helper function)
    PERFORM handle_column_conflict('nhan_su', 'ngayVaoLam', 'DATE');
    
    -- Thêm cột ngaySinh (sử dụng helper function)
    PERFORM handle_column_conflict('nhan_su', 'ngaySinh', 'DATE');
    
    -- Thêm cột diaChi (sử dụng helper function)
    PERFORM handle_column_conflict('nhan_su', 'diaChi', 'TEXT');
    
    -- Thêm cột soCCCD (sử dụng helper function)
    PERFORM handle_column_conflict('nhan_su', 'soCCCD', 'VARCHAR(50)');
    
    -- Thêm cột ngayCapCCCD (sử dụng helper function)
    PERFORM handle_column_conflict('nhan_su', 'ngayCapCCCD', 'DATE');
    
    -- Thêm cột mstCaNhan (sử dụng helper function)
    PERFORM handle_column_conflict('nhan_su', 'mstCaNhan', 'VARCHAR(50)');
    
    -- Thêm cột maSoBHXH (sử dụng helper function)
    PERFORM handle_column_conflict('nhan_su', 'maSoBHXH', 'VARCHAR(50)');
    
    -- Thêm cột bangDHChuyenNganh (sử dụng helper function)
    PERFORM handle_column_conflict('nhan_su', 'bangDHChuyenNganh', 'VARCHAR(255)');
    
    -- Thêm cột namTotNghiep (sử dụng helper function)
    PERFORM handle_column_conflict('nhan_su', 'namTotNghiep', 'INTEGER');
    
    -- Thêm cột created_at
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'nhan_su' AND column_name = 'created_at') THEN
      ALTER TABLE public.nhan_su ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    -- Thêm cột updated_at
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'nhan_su' AND column_name = 'updated_at') THEN
      ALTER TABLE public.nhan_su ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
  END IF;
END $$;

-- Xử lý migration cho bảng dependents nếu đã tồn tại
DO $$
BEGIN
  -- Xóa foreign key constraint cũ nếu tồn tại
  IF EXISTS (SELECT FROM pg_constraint WHERE conname = 'dependents_employee_id_fkey') THEN
    ALTER TABLE public.dependents DROP CONSTRAINT IF EXISTS dependents_employee_id_fkey;
  END IF;
  
  -- Đổi kiểu dữ liệu employee_id sang UUID nếu cần
  IF EXISTS (SELECT FROM information_schema.columns 
             WHERE table_schema = 'public' 
             AND table_name = 'dependents' 
             AND column_name = 'employee_id'
             AND data_type != 'uuid') THEN
    -- Chỉ đổi nếu cột tồn tại và không phải UUID
    ALTER TABLE public.dependents ALTER COLUMN employee_id TYPE UUID USING employee_id::uuid;
  END IF;
END $$;

-- Tạo bảng dependents (Người phụ thuộc)
CREATE TABLE IF NOT EXISTS public.dependents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL,
  hoTenNPT VARCHAR(255) NOT NULL,
  ngaySinhNPT DATE NOT NULL,
  soCCCDNPT VARCHAR(50),
  mstNPT VARCHAR(50),
  quanHe VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tạo foreign key constraint sau khi đảm bảo kiểu dữ liệu đúng
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_constraint WHERE conname = 'dependents_employee_id_fkey') THEN
    ALTER TABLE public.dependents 
    ADD CONSTRAINT dependents_employee_id_fkey 
    FOREIGN KEY (employee_id) REFERENCES public.nhan_su(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Tạo bảng nguoi_phu_thuoc (Người phụ thuộc) nếu chưa tồn tại
CREATE TABLE IF NOT EXISTS public.nguoi_phu_thuoc (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_nhan_su UUID,
  ho_ten_npt VARCHAR(255),
  ngay_sinh_npt DATE,
  so_cccd_npt VARCHAR(50),
  mst_npt VARCHAR(50),
  quan_he VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Thêm các cột còn thiếu vào bảng nguoi_phu_thuoc nếu đã tồn tại
DO $$
BEGIN
  -- Thêm cột id_nhan_su nếu chưa có
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'nguoi_phu_thuoc' AND column_name = 'id_nhan_su') THEN
    ALTER TABLE public.nguoi_phu_thuoc ADD COLUMN id_nhan_su UUID;
  END IF;
  
  -- Thêm các cột khác nếu chưa có
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'nguoi_phu_thuoc' AND column_name = 'ho_ten_npt') THEN
    ALTER TABLE public.nguoi_phu_thuoc ADD COLUMN ho_ten_npt VARCHAR(255);
  END IF;
  
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'nguoi_phu_thuoc' AND column_name = 'ngay_sinh_npt') THEN
    ALTER TABLE public.nguoi_phu_thuoc ADD COLUMN ngay_sinh_npt DATE;
  END IF;
  
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'nguoi_phu_thuoc' AND column_name = 'so_cccd_npt') THEN
    ALTER TABLE public.nguoi_phu_thuoc ADD COLUMN so_cccd_npt VARCHAR(50);
  END IF;
  
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'nguoi_phu_thuoc' AND column_name = 'mst_npt') THEN
    ALTER TABLE public.nguoi_phu_thuoc ADD COLUMN mst_npt VARCHAR(50);
  END IF;
  
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'nguoi_phu_thuoc' AND column_name = 'quan_he') THEN
    ALTER TABLE public.nguoi_phu_thuoc ADD COLUMN quan_he VARCHAR(100);
  END IF;
  
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'nguoi_phu_thuoc' AND column_name = 'created_at') THEN
    ALTER TABLE public.nguoi_phu_thuoc ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
  
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'nguoi_phu_thuoc' AND column_name = 'updated_at') THEN
    ALTER TABLE public.nguoi_phu_thuoc ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- Tạo foreign key constraint cho nguoi_phu_thuoc
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_constraint WHERE conname = 'nguoi_phu_thuoc_id_nhan_su_fkey') THEN
    ALTER TABLE public.nguoi_phu_thuoc 
    ADD CONSTRAINT nguoi_phu_thuoc_id_nhan_su_fkey 
    FOREIGN KEY (id_nhan_su) REFERENCES public.nhan_su(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Xử lý migration cho bảng nhan_su_chi_tiet nếu đã tồn tại
DO $$
BEGIN
  -- Xóa foreign key constraint cũ nếu tồn tại
  IF EXISTS (SELECT FROM pg_constraint WHERE conname = 'nhan_su_chi_tiet_id_nhan_su_fkey') THEN
    ALTER TABLE public.nhan_su_chi_tiet DROP CONSTRAINT IF EXISTS nhan_su_chi_tiet_id_nhan_su_fkey;
  END IF;
  
  -- Đổi kiểu dữ liệu id_nhan_su sang UUID nếu cần
  IF EXISTS (SELECT FROM information_schema.columns 
             WHERE table_schema = 'public' 
             AND table_name = 'nhan_su_chi_tiet' 
             AND column_name = 'id_nhan_su'
             AND data_type != 'uuid') THEN
    -- Xóa các record có id_nhan_su không phải UUID (không hợp lệ)
    -- Vì không thể map với nhan_su nếu không phải UUID
    DELETE FROM public.nhan_su_chi_tiet 
    WHERE id_nhan_su::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
    
    -- Sau đó chuyển đổi kiểu dữ liệu
    BEGIN
      ALTER TABLE public.nhan_su_chi_tiet ALTER COLUMN id_nhan_su TYPE UUID USING id_nhan_su::uuid;
    EXCEPTION WHEN OTHERS THEN
      -- Nếu vẫn không được, tạo cột mới
      ALTER TABLE public.nhan_su_chi_tiet ADD COLUMN id_nhan_su_new UUID;
      -- Copy dữ liệu hợp lệ
      UPDATE public.nhan_su_chi_tiet 
      SET id_nhan_su_new = id_nhan_su::uuid 
      WHERE id_nhan_su::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
      -- Xóa cột cũ và đổi tên cột mới
      ALTER TABLE public.nhan_su_chi_tiet DROP COLUMN id_nhan_su;
      ALTER TABLE public.nhan_su_chi_tiet RENAME COLUMN id_nhan_su_new TO id_nhan_su;
    END;
  END IF;
END $$;

-- Tạo bảng nhan_su_chi_tiet (Chứng chỉ hành nghề)
CREATE TABLE IF NOT EXISTS public.nhan_su_chi_tiet (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_nhan_su UUID NOT NULL,
  ten_file_luu VARCHAR(255),
  file_url TEXT,
  anh_url TEXT,
  anh2_url TEXT,
  ghi_chu TEXT,
  cchn VARCHAR(255),
  hang_cchn VARCHAR(255),
  ngay_het_han_cc DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Thêm các cột còn thiếu vào bảng nhan_su_chi_tiet nếu đã tồn tại
DO $$
BEGIN
  -- Thêm cột id_nhan_su nếu chưa có
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'nhan_su_chi_tiet' AND column_name = 'id_nhan_su') THEN
    ALTER TABLE public.nhan_su_chi_tiet ADD COLUMN id_nhan_su UUID;
  END IF;
  
  -- Thêm cột ten_file_luu
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'nhan_su_chi_tiet' AND column_name = 'ten_file_luu') THEN
    ALTER TABLE public.nhan_su_chi_tiet ADD COLUMN ten_file_luu VARCHAR(255);
  END IF;
  
  -- Thêm cột file_url
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'nhan_su_chi_tiet' AND column_name = 'file_url') THEN
    ALTER TABLE public.nhan_su_chi_tiet ADD COLUMN file_url TEXT;
  END IF;
  
  -- Thêm cột anh_url
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'nhan_su_chi_tiet' AND column_name = 'anh_url') THEN
    ALTER TABLE public.nhan_su_chi_tiet ADD COLUMN anh_url TEXT;
  END IF;
  
  -- Thêm cột anh2_url
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'nhan_su_chi_tiet' AND column_name = 'anh2_url') THEN
    ALTER TABLE public.nhan_su_chi_tiet ADD COLUMN anh2_url TEXT;
  END IF;
  
  -- Thêm cột ghi_chu
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'nhan_su_chi_tiet' AND column_name = 'ghi_chu') THEN
    ALTER TABLE public.nhan_su_chi_tiet ADD COLUMN ghi_chu TEXT;
  END IF;
  
  -- Thêm cột cchn
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'nhan_su_chi_tiet' AND column_name = 'cchn') THEN
    ALTER TABLE public.nhan_su_chi_tiet ADD COLUMN cchn VARCHAR(255);
  END IF;
  
  -- Thêm cột hang_cchn
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'nhan_su_chi_tiet' AND column_name = 'hang_cchn') THEN
    ALTER TABLE public.nhan_su_chi_tiet ADD COLUMN hang_cchn VARCHAR(255);
  END IF;
  
  -- Thêm cột ngay_het_han_cc
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'nhan_su_chi_tiet' AND column_name = 'ngay_het_han_cc') THEN
    ALTER TABLE public.nhan_su_chi_tiet ADD COLUMN ngay_het_han_cc DATE;
  END IF;
  
  -- Thêm cột created_at
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'nhan_su_chi_tiet' AND column_name = 'created_at') THEN
    ALTER TABLE public.nhan_su_chi_tiet ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
  
  -- Thêm cột updated_at
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'nhan_su_chi_tiet' AND column_name = 'updated_at') THEN
    ALTER TABLE public.nhan_su_chi_tiet ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- Tạo foreign key constraint sau khi đảm bảo kiểu dữ liệu đúng
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_constraint WHERE conname = 'nhan_su_chi_tiet_id_nhan_su_fkey') THEN
    ALTER TABLE public.nhan_su_chi_tiet 
    ADD CONSTRAINT nhan_su_chi_tiet_id_nhan_su_fkey 
    FOREIGN KEY (id_nhan_su) REFERENCES public.nhan_su(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Tạo indexes để tối ưu query (chỉ tạo nếu cột tồn tại)
DO $$
BEGIN
  -- Tạo index cho code nếu cột code tồn tại
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'nhan_su' AND column_name = 'code') THEN
    CREATE INDEX IF NOT EXISTS idx_nhan_su_code ON public.nhan_su(code);
  END IF;
  
  -- Tạo index cho status nếu cột status tồn tại
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'nhan_su' AND column_name = 'status') THEN
    CREATE INDEX IF NOT EXISTS idx_nhan_su_status ON public.nhan_su(status);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_dependents_employee_id ON public.dependents(employee_id);
CREATE INDEX IF NOT EXISTS idx_nhan_su_chi_tiet_id_nhan_su ON public.nhan_su_chi_tiet(id_nhan_su);
CREATE INDEX IF NOT EXISTS idx_nhan_su_chi_tiet_ngay_het_han ON public.nhan_su_chi_tiet(ngay_het_han_cc);

-- Enable Row Level Security (RLS) - Tùy chọn, có thể bật sau
-- ALTER TABLE public.nhan_su ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.dependents ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.nhan_su_chi_tiet ENABLE ROW LEVEL SECURITY;

-- Tạo policy để cho phép tất cả operations (tạm thời cho development)
-- Có thể thay đổi sau khi setup authentication
-- CREATE POLICY "Allow all operations" ON public.nhan_su FOR ALL USING (true) WITH CHECK (true);
-- CREATE POLICY "Allow all operations" ON public.dependents FOR ALL USING (true) WITH CHECK (true);
-- CREATE POLICY "Allow all operations" ON public.nhan_su_chi_tiet FOR ALL USING (true) WITH CHECK (true);
