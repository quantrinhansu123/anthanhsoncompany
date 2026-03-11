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
    
    -- Thêm cột anh_nhan_su (URL ảnh nhân sự)
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'nhan_su' AND column_name = 'anh_nhan_su') THEN
      ALTER TABLE public.nhan_su ADD COLUMN anh_nhan_su TEXT;
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

-- =====================================================================
-- BẢNG KHÁCH HÀNG (khach_hang) - PHỤC VỤ MODULE KHÁCH HÀNG
-- =====================================================================

-- Tạo bảng khach_hang nếu chưa tồn tại
CREATE TABLE IF NOT EXISTS public.khach_hang (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ten_don_vi VARCHAR(500) NOT NULL,        -- Tên đơn vị (Tên khách hàng)
  loai_hinh VARCHAR(100),                   -- Loại hình: Tư nhân, Doanh nghiệp, Cơ quan nhà nước
  mst VARCHAR(50),                          -- Mã số thuế
  dia_chi TEXT,                             -- Địa chỉ
  nguoi_dai_dien VARCHAR(255),             -- Người đại diện
  chuc_vu_dai_dien VARCHAR(100),            -- Chức vụ đại diện
  nguoi_lien_he VARCHAR(255),              -- Người liên hệ
  chuc_vu_lien_he VARCHAR(100),            -- Chức vụ liên hệ
  sdt_lien_he VARCHAR(50),                  -- SĐT liên hệ
  tong_hop_dong DECIMAL(15,2) DEFAULT 0,   -- Tổng hợp đồng
  gia_tri_quyet_toan DECIMAL(15,2) DEFAULT 0, -- Giá trị quyết toán
  da_thu DECIMAL(15,2) DEFAULT 0,          -- Đã thu
  con_phai_thu DECIMAL(15,2) DEFAULT 0,     -- Còn phải thu
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Đảm bảo các cột tồn tại nếu bảng đã được tạo trước đó
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'khach_hang' AND column_name = 'ten_don_vi') THEN
    ALTER TABLE public.khach_hang ADD COLUMN ten_don_vi VARCHAR(500) NOT NULL DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'khach_hang' AND column_name = 'loai_hinh') THEN
    ALTER TABLE public.khach_hang ADD COLUMN loai_hinh VARCHAR(100);
  END IF;
  
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'khach_hang' AND column_name = 'mst') THEN
    ALTER TABLE public.khach_hang ADD COLUMN mst VARCHAR(50);
  END IF;
  
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'khach_hang' AND column_name = 'dia_chi') THEN
    ALTER TABLE public.khach_hang ADD COLUMN dia_chi TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'khach_hang' AND column_name = 'nguoi_dai_dien') THEN
    ALTER TABLE public.khach_hang ADD COLUMN nguoi_dai_dien VARCHAR(255);
  END IF;
  
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'khach_hang' AND column_name = 'chuc_vu_dai_dien') THEN
    ALTER TABLE public.khach_hang ADD COLUMN chuc_vu_dai_dien VARCHAR(100);
  END IF;
  
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'khach_hang' AND column_name = 'nguoi_lien_he') THEN
    ALTER TABLE public.khach_hang ADD COLUMN nguoi_lien_he VARCHAR(255);
  END IF;
  
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'khach_hang' AND column_name = 'chuc_vu_lien_he') THEN
    ALTER TABLE public.khach_hang ADD COLUMN chuc_vu_lien_he VARCHAR(100);
  END IF;
  
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'khach_hang' AND column_name = 'sdt_lien_he') THEN
    ALTER TABLE public.khach_hang ADD COLUMN sdt_lien_he VARCHAR(50);
  END IF;
  
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'khach_hang' AND column_name = 'tong_hop_dong') THEN
    ALTER TABLE public.khach_hang ADD COLUMN tong_hop_dong DECIMAL(15,2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'khach_hang' AND column_name = 'gia_tri_quyet_toan') THEN
    ALTER TABLE public.khach_hang ADD COLUMN gia_tri_quyet_toan DECIMAL(15,2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'khach_hang' AND column_name = 'da_thu') THEN
    ALTER TABLE public.khach_hang ADD COLUMN da_thu DECIMAL(15,2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'khach_hang' AND column_name = 'con_phai_thu') THEN
    ALTER TABLE public.khach_hang ADD COLUMN con_phai_thu DECIMAL(15,2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'khach_hang' AND column_name = 'created_at') THEN
    ALTER TABLE public.khach_hang ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
  
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'khach_hang' AND column_name = 'updated_at') THEN
    ALTER TABLE public.khach_hang ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- Index cho bảng khach_hang
CREATE INDEX IF NOT EXISTS idx_khach_hang_ten_don_vi ON public.khach_hang(ten_don_vi);
CREATE INDEX IF NOT EXISTS idx_khach_hang_mst ON public.khach_hang(mst);

-- =====================================================================
-- BẢNG HỢP ĐỒNG (hop_dong) - PHỤC VỤ MODULE KHÁCH HÀNG / HỢP ĐỒNG
-- =====================================================================

-- Tạo bảng hop_dong nếu chưa tồn tại (không có FK constraint ở đây, sẽ thêm sau trong migration)
CREATE TABLE IF NOT EXISTS public.hop_dong (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID,                         -- Foreign key đến khach_hang.id (sẽ thêm constraint trong migration)
  customer_name VARCHAR(255),               -- Tên khách hàng tại thời điểm ký HĐ (snapshot - có thể bỏ sau)
  project_name VARCHAR(255),                -- Tên dự án
  so_hop_dong VARCHAR(100),                 -- Số hợp đồng
  ten_goi_thau TEXT,                        -- Tên gói thầu
  ngay_ky_hd DATE,                          -- Ngày ký HĐ
  file_status TEXT,                         -- Trạng thái file: Thiếu HĐ, BBNT, ...
  progress INTEGER DEFAULT 0,                -- % trạng thái / tiến độ (0-100)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Đảm bảo các cột mới tồn tại nếu bảng đã được tạo trước đó
DO $$
BEGIN
  -- Thêm cột customer_id nếu chưa có
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'hop_dong' AND column_name = 'customer_id'
  ) THEN
    ALTER TABLE public.hop_dong ADD COLUMN customer_id UUID;
  END IF;
  
  -- Thêm cột progress
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'hop_dong' AND column_name = 'progress'
  ) THEN
    ALTER TABLE public.hop_dong ADD COLUMN progress INTEGER DEFAULT 0;
  END IF;
  
  -- Thêm cột customer_name (snapshot)
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'hop_dong' AND column_name = 'customer_name'
  ) THEN
    ALTER TABLE public.hop_dong ADD COLUMN customer_name VARCHAR(255);
  END IF;
  
  -- Thêm cột project_name
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'hop_dong' AND column_name = 'project_name'
  ) THEN
    ALTER TABLE public.hop_dong ADD COLUMN project_name VARCHAR(255);
  END IF;

  -- Thêm cột file_status
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'hop_dong' AND column_name = 'file_status'
  ) THEN
    ALTER TABLE public.hop_dong ADD COLUMN file_status TEXT;
  END IF;

  -- Thêm cột so_hop_dong
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'hop_dong' AND column_name = 'so_hop_dong'
  ) THEN
    ALTER TABLE public.hop_dong ADD COLUMN so_hop_dong VARCHAR(100);
  END IF;

  -- Thêm cột ten_goi_thau
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'hop_dong' AND column_name = 'ten_goi_thau'
  ) THEN
    ALTER TABLE public.hop_dong ADD COLUMN ten_goi_thau TEXT;
  END IF;

  -- Thêm cột ngay_ky_hd
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'hop_dong' AND column_name = 'ngay_ky_hd'
  ) THEN
    ALTER TABLE public.hop_dong ADD COLUMN ngay_ky_hd DATE;
  END IF;

  -- Thêm các cột tài chính và thông tin bổ sung để khớp với view HopDong
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'hop_dong' AND column_name = 'gia_tri_hd'
  ) THEN
    ALTER TABLE public.hop_dong ADD COLUMN gia_tri_hd NUMERIC(15,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'hop_dong' AND column_name = 'gia_tri_qt'
  ) THEN
    ALTER TABLE public.hop_dong ADD COLUMN gia_tri_qt NUMERIC(15,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'hop_dong' AND column_name = 'da_thu'
  ) THEN
    ALTER TABLE public.hop_dong ADD COLUMN da_thu NUMERIC(15,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'hop_dong' AND column_name = 'con_phai_thu'
  ) THEN
    ALTER TABLE public.hop_dong ADD COLUMN con_phai_thu NUMERIC(15,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'hop_dong' AND column_name = 'loai_dich_vu'
  ) THEN
    ALTER TABLE public.hop_dong ADD COLUMN loai_dich_vu TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'hop_dong' AND column_name = 'ngay_update'
  ) THEN
    ALTER TABLE public.hop_dong ADD COLUMN ngay_update DATE;
  END IF;
  
  -- Đổi kiểu dữ liệu customer_id sang UUID nếu cần
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'hop_dong' 
    AND column_name = 'customer_id'
    AND data_type != 'uuid'
  ) THEN
    -- Xóa dữ liệu không hợp lệ (không phải UUID format)
    DELETE FROM public.hop_dong 
    WHERE customer_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
    
    -- Đổi kiểu dữ liệu sang UUID
    BEGIN
      ALTER TABLE public.hop_dong ALTER COLUMN customer_id TYPE UUID USING customer_id::uuid;
    EXCEPTION WHEN OTHERS THEN
      -- Nếu không convert được, tạo cột mới
      ALTER TABLE public.hop_dong ADD COLUMN customer_id_new UUID;
      -- Copy dữ liệu hợp lệ
      UPDATE public.hop_dong 
      SET customer_id_new = customer_id::uuid 
      WHERE customer_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
      -- Xóa cột cũ và đổi tên cột mới
      ALTER TABLE public.hop_dong DROP COLUMN customer_id;
      ALTER TABLE public.hop_dong RENAME COLUMN customer_id_new TO customer_id;
    END;
  END IF;
  
  -- Thêm foreign key constraint nếu chưa có
  IF NOT EXISTS (
    SELECT FROM pg_constraint 
    WHERE conname = 'fk_hop_dong_khach_hang'
  ) THEN
    -- Xóa constraint cũ nếu có (có thể bị lỗi)
    ALTER TABLE public.hop_dong DROP CONSTRAINT IF EXISTS fk_hop_dong_khach_hang;
    
    -- Đảm bảo customer_id là UUID và có thể NULL tạm thời (sẽ set NOT NULL sau)
    -- Nếu bảng đã có dữ liệu, có thể cần set NULL trước
    ALTER TABLE public.hop_dong ALTER COLUMN customer_id TYPE UUID USING customer_id::uuid;
    
    -- Thêm foreign key constraint
    ALTER TABLE public.hop_dong 
    ADD CONSTRAINT fk_hop_dong_khach_hang 
    FOREIGN KEY (customer_id) REFERENCES public.khach_hang(id) ON DELETE CASCADE;
    
    -- Sau khi có FK, có thể set NOT NULL nếu muốn
    -- ALTER TABLE public.hop_dong ALTER COLUMN customer_id SET NOT NULL;
  END IF;
END $$;

-- Thêm cột phần trăm task hoàn thành vào hop_dong
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'hop_dong' AND column_name = 'phan_tram_task_hoan_thanh'
  ) THEN
    ALTER TABLE public.hop_dong ADD COLUMN phan_tram_task_hoan_thanh INTEGER DEFAULT 0;
  END IF;
END $$;

-- Thêm cột du_an_id (foreign key đến du_an.id) vào hop_dong
DO $$
BEGIN
  -- 1. Thêm cột du_an_id nếu chưa có
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'hop_dong' 
    AND column_name = 'du_an_id'
  ) THEN
    ALTER TABLE public.hop_dong ADD COLUMN du_an_id UUID;
  END IF;
  
  -- 2. Migration dữ liệu: map project_name sang du_an_id
  -- Tìm id của du_an dựa trên ten_du_an = project_name
  UPDATE public.hop_dong hd
  SET du_an_id = da.id
  FROM public.du_an da
  WHERE hd.project_name = da.ten_du_an
    AND hd.du_an_id IS NULL
    AND hd.project_name IS NOT NULL
    AND hd.project_name != '';
  
  -- 3. Thêm foreign key constraint
  IF NOT EXISTS (
    SELECT FROM pg_constraint 
    WHERE conname = 'fk_hop_dong_du_an'
  ) THEN
    ALTER TABLE public.hop_dong 
    ADD CONSTRAINT fk_hop_dong_du_an 
    FOREIGN KEY (du_an_id) REFERENCES public.du_an(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Thêm cột nhan_su_id (foreign key đến nhan_su.id) vào hop_dong
DO $$
BEGIN
  -- 1. Thêm cột nhan_su_id nếu chưa có
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'hop_dong' 
    AND column_name = 'nhan_su_id'
  ) THEN
    ALTER TABLE public.hop_dong ADD COLUMN nhan_su_id UUID;
  END IF;
  
  -- 2. Thêm foreign key constraint
  IF NOT EXISTS (
    SELECT FROM pg_constraint 
    WHERE conname = 'fk_hop_dong_nhan_su'
  ) THEN
    ALTER TABLE public.hop_dong 
    ADD CONSTRAINT fk_hop_dong_nhan_su 
    FOREIGN KEY (nhan_su_id) REFERENCES public.nhan_su(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Index hỗ trợ query nhanh theo khách hàng và ngày ký HĐ
CREATE INDEX IF NOT EXISTS idx_hop_dong_customer_id ON public.hop_dong(customer_id);
CREATE INDEX IF NOT EXISTS idx_hop_dong_ngay_ky_hd ON public.hop_dong(ngay_ky_hd);
CREATE INDEX IF NOT EXISTS idx_hop_dong_project_name ON public.hop_dong(project_name);
CREATE INDEX IF NOT EXISTS idx_hop_dong_du_an_id ON public.hop_dong(du_an_id);
CREATE INDEX IF NOT EXISTS idx_hop_dong_nhan_su_id ON public.hop_dong(nhan_su_id);

-- =====================================================================
-- BẢNG DỰ ÁN (du_an) - PHỤC VỤ MÀN /khach-hang/du-an
-- =====================================================================

-- Tạo bảng du_an nếu chưa tồn tại
CREATE TABLE IF NOT EXISTS public.du_an (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID,                       -- Tham chiếu khach_hang.id (có thể NULL nếu chưa gắn khách hàng)
  ten_du_an VARCHAR(255) NOT NULL,        -- Tên dự án
  status VARCHAR(100) DEFAULT 'Đang thực hiện', -- Trạng thái dự án
  progress INTEGER DEFAULT 0,             -- Tiến độ (%) 0-100
  manager_img TEXT,                       -- Ảnh người quản lý
  executor_img TEXT,                      -- Ảnh người thực thi
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Đảm bảo các cột tồn tại nếu bảng đã được tạo trước đó
DO $$
BEGIN
  -- Thêm cột ten_du_an nếu chưa có
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'du_an' AND column_name = 'ten_du_an') THEN
    -- Nếu có project_name, copy dữ liệu sang ten_du_an rồi xóa project_name
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'du_an' AND column_name = 'project_name') THEN
      ALTER TABLE public.du_an ADD COLUMN ten_du_an VARCHAR(255);
      UPDATE public.du_an SET ten_du_an = project_name WHERE ten_du_an IS NULL;
      ALTER TABLE public.du_an ALTER COLUMN ten_du_an SET NOT NULL;
      ALTER TABLE public.du_an DROP COLUMN IF EXISTS project_name;
    ELSE
      ALTER TABLE public.du_an ADD COLUMN ten_du_an VARCHAR(255) NOT NULL DEFAULT '';
    END IF;
  END IF;

  -- Xóa cột project_name nếu còn tồn tại (migration)
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'du_an' AND column_name = 'project_name') THEN
    -- Copy dữ liệu nếu ten_du_an chưa có
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'du_an' AND column_name = 'ten_du_an') THEN
      UPDATE public.du_an SET ten_du_an = project_name WHERE ten_du_an IS NULL OR ten_du_an = '';
    END IF;
    ALTER TABLE public.du_an DROP COLUMN IF EXISTS project_name;
  END IF;

  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'du_an' AND column_name = 'status') THEN
    ALTER TABLE public.du_an ADD COLUMN status VARCHAR(100) DEFAULT 'Đang thực hiện';
  END IF;

  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'du_an' AND column_name = 'progress') THEN
    ALTER TABLE public.du_an ADD COLUMN progress INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'du_an' AND column_name = 'manager_img') THEN
    ALTER TABLE public.du_an ADD COLUMN manager_img TEXT;
  END IF;

  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'du_an' AND column_name = 'executor_img') THEN
    ALTER TABLE public.du_an ADD COLUMN executor_img TEXT;
  END IF;
  
  -- Thêm cột manager_id (nhân sự quản lý)
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'du_an' AND column_name = 'manager_id') THEN
    ALTER TABLE public.du_an ADD COLUMN manager_id UUID;
  END IF;
  
  -- Thêm cột executor_id (nhân sự thực thi)
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'du_an' AND column_name = 'executor_id') THEN
    ALTER TABLE public.du_an ADD COLUMN executor_id UUID;
  END IF;

  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'du_an' AND column_name = 'customer_id') THEN
    ALTER TABLE public.du_an ADD COLUMN customer_id UUID;
    ALTER TABLE public.du_an ADD COLUMN ten_khach_hang VARCHAR(500);
  END IF;
END $$;

-- Foreign key constraints cho manager_id và executor_id
DO $$
BEGIN
  -- Foreign key cho manager_id
  IF NOT EXISTS (
    SELECT FROM pg_constraint 
    WHERE conname = 'fk_du_an_manager'
  ) THEN
    ALTER TABLE public.du_an 
    ADD CONSTRAINT fk_du_an_manager 
    FOREIGN KEY (manager_id) REFERENCES public.nhan_su(id) ON DELETE SET NULL;
  END IF;
  
  -- Foreign key cho executor_id
  IF NOT EXISTS (
    SELECT FROM pg_constraint 
    WHERE conname = 'fk_du_an_executor'
  ) THEN
    ALTER TABLE public.du_an 
    ADD CONSTRAINT fk_du_an_executor 
    FOREIGN KEY (executor_id) REFERENCES public.nhan_su(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Index cho bảng du_an
CREATE INDEX IF NOT EXISTS idx_du_an_ten_du_an ON public.du_an(ten_du_an);
CREATE INDEX IF NOT EXISTS idx_du_an_customer_id ON public.du_an(customer_id);
CREATE INDEX IF NOT EXISTS idx_du_an_manager_id ON public.du_an(manager_id);
CREATE INDEX IF NOT EXISTS idx_du_an_executor_id ON public.du_an(executor_id);
-- Xóa index cũ nếu có
DROP INDEX IF EXISTS public.idx_du_an_project_name;

-- =====================================================================
-- BẢNG TASK (task) - PHỤC VỤ MÀN HÌNH TASK, BẢNG CHA LÀ HỢP ĐỒNG
-- =====================================================================

-- Tạo bảng task nếu chưa tồn tại
CREATE TABLE IF NOT EXISTS public.task (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hop_dong_id UUID NOT NULL,                  -- Foreign key đến hop_dong.id
  ten_task VARCHAR(500) NOT NULL,              -- Tên task
  mo_ta TEXT,                                  -- Mô tả task
  trang_thai VARCHAR(50) DEFAULT 'Chưa bắt đầu', -- Trạng thái: Chưa bắt đầu, Đang thực hiện, Hoàn thành, Tạm dừng
  uu_tien VARCHAR(20) DEFAULT 'Trung bình',   -- Độ ưu tiên: Thấp, Trung bình, Cao, Khẩn cấp
  ngay_bat_dau DATE,                          -- Ngày bắt đầu
  ngay_ket_thuc DATE,                          -- Ngày kết thúc
  ngay_hoan_thanh DATE,                        -- Ngày hoàn thành thực tế
  nguoi_phu_trach VARCHAR(255),               -- Người phụ trách
  tien_do INTEGER DEFAULT 0,                  -- Tiến độ task (0-100)
  ghi_chu TEXT,                                -- Ghi chú
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_task_hop_dong FOREIGN KEY (hop_dong_id) REFERENCES public.hop_dong(id) ON DELETE CASCADE
);

-- Đảm bảo các cột tồn tại nếu bảng đã được tạo trước đó
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'task' AND column_name = 'hop_dong_id') THEN
    ALTER TABLE public.task ADD COLUMN hop_dong_id UUID NOT NULL;
  END IF;
  
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'task' AND column_name = 'ten_task') THEN
    ALTER TABLE public.task ADD COLUMN ten_task VARCHAR(500) NOT NULL DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'task' AND column_name = 'mo_ta') THEN
    ALTER TABLE public.task ADD COLUMN mo_ta TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'task' AND column_name = 'trang_thai') THEN
    ALTER TABLE public.task ADD COLUMN trang_thai VARCHAR(50) DEFAULT 'Chưa bắt đầu';
  END IF;
  
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'task' AND column_name = 'uu_tien') THEN
    ALTER TABLE public.task ADD COLUMN uu_tien VARCHAR(20) DEFAULT 'Trung bình';
  END IF;
  
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'task' AND column_name = 'ngay_bat_dau') THEN
    ALTER TABLE public.task ADD COLUMN ngay_bat_dau DATE;
  END IF;
  
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'task' AND column_name = 'ngay_ket_thuc') THEN
    ALTER TABLE public.task ADD COLUMN ngay_ket_thuc DATE;
  END IF;
  
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'task' AND column_name = 'ngay_hoan_thanh') THEN
    ALTER TABLE public.task ADD COLUMN ngay_hoan_thanh DATE;
  END IF;
  
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'task' AND column_name = 'nguoi_phu_trach') THEN
    ALTER TABLE public.task ADD COLUMN nguoi_phu_trach VARCHAR(255);
  END IF;
  
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'task' AND column_name = 'tien_do') THEN
    ALTER TABLE public.task ADD COLUMN tien_do INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'task' AND column_name = 'ghi_chu') THEN
    ALTER TABLE public.task ADD COLUMN ghi_chu TEXT;
  END IF;
  
  -- Thêm foreign key constraint nếu chưa có
  IF NOT EXISTS (
    SELECT FROM pg_constraint 
    WHERE conname = 'fk_task_hop_dong'
  ) THEN
    ALTER TABLE public.task 
    ADD CONSTRAINT fk_task_hop_dong 
    FOREIGN KEY (hop_dong_id) REFERENCES public.hop_dong(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Index cho bảng task
CREATE INDEX IF NOT EXISTS idx_task_hop_dong_id ON public.task(hop_dong_id);
CREATE INDEX IF NOT EXISTS idx_task_trang_thai ON public.task(trang_thai);
CREATE INDEX IF NOT EXISTS idx_task_ngay_bat_dau ON public.task(ngay_bat_dau);

-- Function để tự động cập nhật phần trăm task hoàn thành trong hop_dong
CREATE OR REPLACE FUNCTION update_hop_dong_task_percentage()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.hop_dong
  SET phan_tram_task_hoan_thanh = (
    SELECT COALESCE(
      ROUND(
        (COUNT(*) FILTER (WHERE trang_thai = 'Hoàn thành')::NUMERIC / 
         NULLIF(COUNT(*), 0)) * 100
      ), 
      0
    )
    FROM public.task
    WHERE hop_dong_id = COALESCE(NEW.hop_dong_id, OLD.hop_dong_id)
  )
  WHERE id = COALESCE(NEW.hop_dong_id, OLD.hop_dong_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger để tự động cập nhật phần trăm khi task thay đổi
DROP TRIGGER IF EXISTS trigger_update_hop_dong_task_percentage ON public.task;
CREATE TRIGGER trigger_update_hop_dong_task_percentage
AFTER INSERT OR UPDATE OR DELETE ON public.task
FOR EACH ROW
EXECUTE FUNCTION update_hop_dong_task_percentage();

-- =====================================================================
-- BẢNG THƯ VIỆN LỖI CHECKLIST (thu_vien_loi)
-- PHỤC VỤ MÀN HÌNH /quy-trinh/thu-vien-loi
-- =====================================================================

-- Tạo bảng thu_vien_loi nếu chưa tồn tại
CREATE TABLE IF NOT EXISTS public.thu_vien_loi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stt INTEGER,                              -- Số thứ tự hiển thị
  noi_dung_kiem_tra TEXT NOT NULL,          -- Nội dung kiểm tra
  checklist_id VARCHAR(100),                -- Mã checklist
  chuyen_nganh VARCHAR(100),                -- Chuyên ngành (Hạ tầng, Dân dụng, ...)
  bo_mon VARCHAR(100),                      -- Bộ môn
  hang_muc TEXT,                            -- Hạng mục
  hang_muc_kiem_tra TEXT,                   -- Hạng mục kiểm tra
  dien_giai_kiem_tra TEXT,                  -- Diễn giải kiểm tra (dachGiaiKiemTra)
  cach_kiem_tra_nhanh TEXT,                 -- Cách kiểm tra nhanh
  tieu_chuan TEXT,                          -- Tiêu chuẩn
  trong_cham INTEGER DEFAULT 0,             -- Trọng chấm
  muc_do_quan_trong VARCHAR(50),            -- Thấp / Trung bình / Cao / Nghiêm trọng
  canh_bao_loi VARCHAR(50),                 -- Thấp / Trung bình / Vàng / Đỏ / Gấp
  ghi_chu_ky_thuat TEXT,                    -- Ghi chú kỹ thuật
  hinh_anh_minh_hoa TEXT,                   -- Đường dẫn / tên file minh họa
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Đảm bảo các cột tồn tại nếu bảng đã được tạo trước đó
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'thu_vien_loi' AND column_name = 'noi_dung_kiem_tra') THEN
    ALTER TABLE public.thu_vien_loi ADD COLUMN noi_dung_kiem_tra TEXT;
  END IF;

  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'thu_vien_loi' AND column_name = 'checklist_id') THEN
    ALTER TABLE public.thu_vien_loi ADD COLUMN checklist_id VARCHAR(100);
  END IF;

  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'thu_vien_loi' AND column_name = 'chuyen_nganh') THEN
    ALTER TABLE public.thu_vien_loi ADD COLUMN chuyen_nganh VARCHAR(100);
  END IF;

  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'thu_vien_loi' AND column_name = 'bo_mon') THEN
    ALTER TABLE public.thu_vien_loi ADD COLUMN bo_mon VARCHAR(100);
  END IF;

  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'thu_vien_loi' AND column_name = 'hang_muc') THEN
    ALTER TABLE public.thu_vien_loi ADD COLUMN hang_muc TEXT;
  END IF;

  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'thu_vien_loi' AND column_name = 'dien_giai_kiem_tra') THEN
    ALTER TABLE public.thu_vien_loi ADD COLUMN dien_giai_kiem_tra TEXT;
  END IF;

  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'thu_vien_loi' AND column_name = 'trong_cham') THEN
    ALTER TABLE public.thu_vien_loi ADD COLUMN trong_cham INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'thu_vien_loi' AND column_name = 'muc_do_quan_trong') THEN
    ALTER TABLE public.thu_vien_loi ADD COLUMN muc_do_quan_trong VARCHAR(50);
  END IF;

  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'thu_vien_loi' AND column_name = 'canh_bao_loi') THEN
    ALTER TABLE public.thu_vien_loi ADD COLUMN canh_bao_loi VARCHAR(50);
  END IF;

  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'thu_vien_loi' AND column_name = 'ghi_chu_ky_thuat') THEN
    ALTER TABLE public.thu_vien_loi ADD COLUMN ghi_chu_ky_thuat TEXT;
  END IF;

  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'thu_vien_loi' AND column_name = 'hinh_anh_minh_hoa') THEN
    ALTER TABLE public.thu_vien_loi ADD COLUMN hinh_anh_minh_hoa TEXT;
  END IF;

  -- Thêm cột hang_muc_kiem_tra
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'thu_vien_loi' AND column_name = 'hang_muc_kiem_tra') THEN
    ALTER TABLE public.thu_vien_loi ADD COLUMN hang_muc_kiem_tra TEXT;
  END IF;

  -- Thêm cột cach_kiem_tra_nhanh
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'thu_vien_loi' AND column_name = 'cach_kiem_tra_nhanh') THEN
    ALTER TABLE public.thu_vien_loi ADD COLUMN cach_kiem_tra_nhanh TEXT;
  END IF;

  -- Thêm cột tieu_chuan
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'thu_vien_loi' AND column_name = 'tieu_chuan') THEN
    ALTER TABLE public.thu_vien_loi ADD COLUMN tieu_chuan TEXT;
  END IF;

  -- Migration: Đổi tên cột nếu cần (giữ nguyên snake_case vì PostgreSQL convention)
  -- Nếu có cột với tên khác, copy dữ liệu và đổi tên
  -- Ví dụ: nếu có cột "Chuyen_Nganh" (PascalCase), đổi sang "chuyen_nganh"
  
  -- Đổi chuyen_nganh nếu có tên khác
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'thu_vien_loi' AND column_name = 'Chuyen_Nganh') THEN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'thu_vien_loi' AND column_name = 'chuyen_nganh') THEN
      ALTER TABLE public.thu_vien_loi ADD COLUMN chuyen_nganh VARCHAR(100);
    END IF;
    UPDATE public.thu_vien_loi SET chuyen_nganh = "Chuyen_Nganh" WHERE chuyen_nganh IS NULL;
    ALTER TABLE public.thu_vien_loi DROP COLUMN IF EXISTS "Chuyen_Nganh";
  END IF;

  -- Đổi bo_mon nếu có tên khác
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'thu_vien_loi' AND column_name = 'Bo_Mon') THEN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'thu_vien_loi' AND column_name = 'bo_mon') THEN
      ALTER TABLE public.thu_vien_loi ADD COLUMN bo_mon VARCHAR(100);
    END IF;
    UPDATE public.thu_vien_loi SET bo_mon = "Bo_Mon" WHERE bo_mon IS NULL;
    ALTER TABLE public.thu_vien_loi DROP COLUMN IF EXISTS "Bo_Mon";
  END IF;

  -- Đổi hang_muc_kiem_tra nếu có tên khác
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'thu_vien_loi' AND column_name = 'Hang_Muc_Kiem_Tra') THEN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'thu_vien_loi' AND column_name = 'hang_muc_kiem_tra') THEN
      ALTER TABLE public.thu_vien_loi ADD COLUMN hang_muc_kiem_tra TEXT;
    END IF;
    UPDATE public.thu_vien_loi SET hang_muc_kiem_tra = "Hang_Muc_Kiem_Tra" WHERE hang_muc_kiem_tra IS NULL;
    ALTER TABLE public.thu_vien_loi DROP COLUMN IF EXISTS "Hang_Muc_Kiem_Tra";
  END IF;

  -- Đổi noi_dung_kiem_tra nếu có tên khác
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'thu_vien_loi' AND column_name = 'Noi_Dung_Kiem_Tra') THEN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'thu_vien_loi' AND column_name = 'noi_dung_kiem_tra') THEN
      ALTER TABLE public.thu_vien_loi ADD COLUMN noi_dung_kiem_tra TEXT;
    END IF;
    UPDATE public.thu_vien_loi SET noi_dung_kiem_tra = "Noi_Dung_Kiem_Tra" WHERE noi_dung_kiem_tra IS NULL;
    ALTER TABLE public.thu_vien_loi DROP COLUMN IF EXISTS "Noi_Dung_Kiem_Tra";
  END IF;

  -- Đổi cach_kiem_tra_nhanh nếu có tên khác
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'thu_vien_loi' AND column_name = 'Cach_Kiem_Tra_Nhanh') THEN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'thu_vien_loi' AND column_name = 'cach_kiem_tra_nhanh') THEN
      ALTER TABLE public.thu_vien_loi ADD COLUMN cach_kiem_tra_nhanh TEXT;
    END IF;
    UPDATE public.thu_vien_loi SET cach_kiem_tra_nhanh = "Cach_Kiem_Tra_Nhanh" WHERE cach_kiem_tra_nhanh IS NULL;
    ALTER TABLE public.thu_vien_loi DROP COLUMN IF EXISTS "Cach_Kiem_Tra_Nhanh";
  END IF;

  -- Đổi tieu_chuan nếu có tên khác
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'thu_vien_loi' AND column_name = 'Tieu_Chuan') THEN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'thu_vien_loi' AND column_name = 'tieu_chuan') THEN
      ALTER TABLE public.thu_vien_loi ADD COLUMN tieu_chuan TEXT;
    END IF;
    UPDATE public.thu_vien_loi SET tieu_chuan = "Tieu_Chuan" WHERE tieu_chuan IS NULL;
    ALTER TABLE public.thu_vien_loi DROP COLUMN IF EXISTS "Tieu_Chuan";
  END IF;

  -- Đổi muc_do_quan_trong nếu có tên khác
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'thu_vien_loi' AND column_name = 'Muc_Do_Quan_Trong') THEN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'thu_vien_loi' AND column_name = 'muc_do_quan_trong') THEN
      ALTER TABLE public.thu_vien_loi ADD COLUMN muc_do_quan_trong VARCHAR(50);
    END IF;
    UPDATE public.thu_vien_loi SET muc_do_quan_trong = "Muc_Do_Quan_Trong" WHERE muc_do_quan_trong IS NULL;
    ALTER TABLE public.thu_vien_loi DROP COLUMN IF EXISTS "Muc_Do_Quan_Trong";
  END IF;

  -- Đổi canh_bao_loi nếu có tên khác
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'thu_vien_loi' AND column_name = 'Canh_Bao_Loi') THEN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'thu_vien_loi' AND column_name = 'canh_bao_loi') THEN
      ALTER TABLE public.thu_vien_loi ADD COLUMN canh_bao_loi VARCHAR(50);
    END IF;
    UPDATE public.thu_vien_loi SET canh_bao_loi = "Canh_Bao_Loi" WHERE canh_bao_loi IS NULL;
    ALTER TABLE public.thu_vien_loi DROP COLUMN IF EXISTS "Canh_Bao_Loi";
  END IF;

  -- Đổi ghi_chu_ky_thuat nếu có tên khác
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'thu_vien_loi' AND column_name = 'Ghi_Chu_Ky_Thuat') THEN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'thu_vien_loi' AND column_name = 'ghi_chu_ky_thuat') THEN
      ALTER TABLE public.thu_vien_loi ADD COLUMN ghi_chu_ky_thuat TEXT;
    END IF;
    UPDATE public.thu_vien_loi SET ghi_chu_ky_thuat = "Ghi_Chu_Ky_Thuat" WHERE ghi_chu_ky_thuat IS NULL;
    ALTER TABLE public.thu_vien_loi DROP COLUMN IF EXISTS "Ghi_Chu_Ky_Thuat";
  END IF;
END $$;

-- Index hỗ trợ tìm kiếm nhanh
CREATE INDEX IF NOT EXISTS idx_thu_vien_loi_checklist_id ON public.thu_vien_loi(checklist_id);
CREATE INDEX IF NOT EXISTS idx_thu_vien_loi_chuyen_nganh ON public.thu_vien_loi(chuyen_nganh);
CREATE INDEX IF NOT EXISTS idx_thu_vien_loi_muc_do ON public.thu_vien_loi(muc_do_quan_trong);

-- Enable Row Level Security (RLS) - Tùy chọn, có thể bật sau
-- ALTER TABLE public.nhan_su ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.dependents ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.nhan_su_chi_tiet ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- BẢNG SETTINGS (setting)
-- PHỤC VỤ MÀN HÌNH /settings
-- =====================================================================

-- Tạo bảng setting nếu chưa tồn tại
CREATE TABLE IF NOT EXISTS public.setting (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255), -- ID người dùng (có thể là email, username, hoặc UUID)
  theme VARCHAR(20) DEFAULT 'light', -- light, dark, system
  color VARCHAR(50) DEFAULT 'blue', -- blue, purple, green, red, yellow, orange, cyan, gray
  font_family VARCHAR(100) DEFAULT 'Inter', -- Inter, Roboto, Open Sans
  font_size VARCHAR(50) DEFAULT 'Trung bình', -- Nhỏ, Trung bình, Lớn
  language VARCHAR(10) DEFAULT 'vi', -- vi, en, ja, ko, zh
  logo_url TEXT, -- URL logo ứng dụng
  timezone VARCHAR(100) DEFAULT '(GMT+07:00) Hà Nội, TP HCM, Bangkok', -- Timezone
  email_notifications BOOLEAN DEFAULT false, -- Thông báo email
  push_notifications BOOLEAN DEFAULT false, -- Thông báo push
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id) -- Mỗi user chỉ có 1 setting record
);

-- Index cho user_id để tìm kiếm nhanh
CREATE INDEX IF NOT EXISTS idx_setting_user_id ON public.setting(user_id);

-- Trigger để tự động cập nhật updated_at
CREATE OR REPLACE FUNCTION update_setting_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Xóa trigger cũ nếu tồn tại trước khi tạo mới
DROP TRIGGER IF EXISTS trigger_update_setting_updated_at ON public.setting;

CREATE TRIGGER trigger_update_setting_updated_at
BEFORE UPDATE ON public.setting
FOR EACH ROW
EXECUTE FUNCTION update_setting_updated_at();

-- =====================================================================
-- BẢNG THU CHI (thu_chi)
-- PHỤC VỤ MÀN HÌNH /tai-chinh/thu-chi
-- =====================================================================

-- Tạo bảng thu_chi nếu chưa tồn tại
CREATE TABLE IF NOT EXISTS public.thu_chi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  du_an_id UUID,                         -- Foreign key đến du_an.id (có thể NULL nếu không gắn dự án)
  hop_dong_id UUID,                      -- Foreign key đến hop_dong.id (có thể NULL)
  loai_phieu VARCHAR(50) NOT NULL,       -- Phiếu thu / Phiếu chi
  so_tien NUMERIC(15,2) NOT NULL DEFAULT 0, -- Số tiền
  ngay DATE NOT NULL,                    -- Ngày thu/chi
  noi_dung TEXT,                         -- Nội dung
  tinh_trang_phieu VARCHAR(50),          -- Tạm ứng / Thanh toán
  nguoi_nhan VARCHAR(255),               -- Người nhận / Người chi
  file_url TEXT,                         -- URL file đính kèm
  ghi_chu TEXT,                          -- Ghi chú
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Đảm bảo các cột tồn tại nếu bảng đã được tạo trước đó
DO $$
BEGIN
  -- Thêm cột du_an_id nếu chưa có
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'thu_chi' 
    AND column_name = 'du_an_id'
  ) THEN
    ALTER TABLE public.thu_chi ADD COLUMN du_an_id UUID;
  END IF;
  
  -- Thêm cột hop_dong_id nếu chưa có
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'thu_chi' 
    AND column_name = 'hop_dong_id'
  ) THEN
    ALTER TABLE public.thu_chi ADD COLUMN hop_dong_id UUID;
  END IF;
  
  -- Thêm các cột khác nếu chưa có
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'thu_chi' 
    AND column_name = 'loai_phieu'
  ) THEN
    ALTER TABLE public.thu_chi ADD COLUMN loai_phieu VARCHAR(50) NOT NULL DEFAULT 'Phiếu thu';
  END IF;
  
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'thu_chi' 
    AND column_name = 'so_tien'
  ) THEN
    ALTER TABLE public.thu_chi ADD COLUMN so_tien NUMERIC(15,2) NOT NULL DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'thu_chi' 
    AND column_name = 'ngay'
  ) THEN
    ALTER TABLE public.thu_chi ADD COLUMN ngay DATE NOT NULL DEFAULT CURRENT_DATE;
  END IF;
  
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'thu_chi' 
    AND column_name = 'noi_dung'
  ) THEN
    ALTER TABLE public.thu_chi ADD COLUMN noi_dung TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'thu_chi' 
    AND column_name = 'tinh_trang_phieu'
  ) THEN
    ALTER TABLE public.thu_chi ADD COLUMN tinh_trang_phieu VARCHAR(50);
  END IF;
  
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'thu_chi' 
    AND column_name = 'nguoi_nhan'
  ) THEN
    ALTER TABLE public.thu_chi ADD COLUMN nguoi_nhan VARCHAR(255);
  END IF;
  
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'thu_chi' 
    AND column_name = 'file_url'
  ) THEN
    ALTER TABLE public.thu_chi ADD COLUMN file_url TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'thu_chi' 
    AND column_name = 'ghi_chu'
  ) THEN
    ALTER TABLE public.thu_chi ADD COLUMN ghi_chu TEXT;
  END IF;
  
  -- Thêm cột anh_url (ảnh chứng từ)
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'thu_chi' 
    AND column_name = 'anh_url'
  ) THEN
    ALTER TABLE public.thu_chi ADD COLUMN anh_url TEXT;
  END IF;
  
  -- Thêm cột nhan_su_id (nhân sự chi cho ai)
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'thu_chi' 
    AND column_name = 'nhan_su_id'
  ) THEN
    ALTER TABLE public.thu_chi ADD COLUMN nhan_su_id UUID;
  END IF;
  
  -- Thêm foreign key constraints
  IF NOT EXISTS (
    SELECT FROM pg_constraint 
    WHERE conname = 'fk_thu_chi_du_an'
  ) THEN
    ALTER TABLE public.thu_chi 
    ADD CONSTRAINT fk_thu_chi_du_an 
    FOREIGN KEY (du_an_id) REFERENCES public.du_an(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT FROM pg_constraint 
    WHERE conname = 'fk_thu_chi_hop_dong'
  ) THEN
    ALTER TABLE public.thu_chi 
    ADD CONSTRAINT fk_thu_chi_hop_dong 
    FOREIGN KEY (hop_dong_id) REFERENCES public.hop_dong(id) ON DELETE SET NULL;
  END IF;
  
  -- Thêm foreign key constraint cho nhan_su_id
  IF NOT EXISTS (
    SELECT FROM pg_constraint 
    WHERE conname = 'fk_thu_chi_nhan_su'
  ) THEN
    ALTER TABLE public.thu_chi 
    ADD CONSTRAINT fk_thu_chi_nhan_su 
    FOREIGN KEY (nhan_su_id) REFERENCES public.nhan_su(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Index hỗ trợ query nhanh
CREATE INDEX IF NOT EXISTS idx_thu_chi_du_an_id ON public.thu_chi(du_an_id);
CREATE INDEX IF NOT EXISTS idx_thu_chi_hop_dong_id ON public.thu_chi(hop_dong_id);
CREATE INDEX IF NOT EXISTS idx_thu_chi_ngay ON public.thu_chi(ngay);
CREATE INDEX IF NOT EXISTS idx_thu_chi_loai_phieu ON public.thu_chi(loai_phieu);
CREATE INDEX IF NOT EXISTS idx_thu_chi_nhan_su_id ON public.thu_chi(nhan_su_id);

-- Trigger để tự động cập nhật updated_at
CREATE OR REPLACE FUNCTION update_thu_chi_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_thu_chi_updated_at ON public.thu_chi;
CREATE TRIGGER trigger_update_thu_chi_updated_at
BEFORE UPDATE ON public.thu_chi
FOR EACH ROW
EXECUTE FUNCTION update_thu_chi_updated_at();

-- =====================================================================
-- BẢNG TÀI LIỆU (tai_lieu) - PHỤC VỤ MODULE HÀNH CHÍNH / DANH SÁCH TÀI LIỆU
-- =====================================================================

-- Tạo bảng tai_lieu nếu chưa tồn tại
CREATE TABLE IF NOT EXISTS public.tai_lieu (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_tai_lieu VARCHAR(100),                    -- Mã tài liệu
  ten_tai_lieu TEXT,                           -- Tên tài liệu
  huong VARCHAR(50),                            -- Hướng: Nội bộ, Văn bản đến, Văn bản đi
  loai VARCHAR(100),                            -- Loại tài liệu
  nhom_tai_lieu VARCHAR(100),                   -- Nhóm tài liệu
  trang_thai VARCHAR(50),                       -- Trạng thái: Đã ký, Đã gửi, Chờ duyệt, Đã duyệt
  phong_quan_ly VARCHAR(100),                   -- Phòng quản lý
  phan_quyen VARCHAR(100),                       -- Phân quyền
  so_den VARCHAR(100),                          -- Số đến
  so_di VARCHAR(100),                           -- Số đi
  ngay_den DATE,                                -- Ngày đến
  ngay_ky DATE,                                 -- Ngày ký
  link TEXT,                                    -- Link để lưu trữ file/tài liệu
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger để tự động cập nhật updated_at
CREATE OR REPLACE FUNCTION update_tai_lieu_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_tai_lieu_updated_at ON public.tai_lieu;
CREATE TRIGGER trigger_update_tai_lieu_updated_at
BEFORE UPDATE ON public.tai_lieu
FOR EACH ROW
EXECUTE FUNCTION update_tai_lieu_updated_at();

-- Index hỗ trợ query nhanh
CREATE INDEX IF NOT EXISTS idx_tai_lieu_ma_tai_lieu ON public.tai_lieu(ma_tai_lieu);
CREATE INDEX IF NOT EXISTS idx_tai_lieu_huong ON public.tai_lieu(huong);
CREATE INDEX IF NOT EXISTS idx_tai_lieu_trang_thai ON public.tai_lieu(trang_thai);
CREATE INDEX IF NOT EXISTS idx_tai_lieu_phong_quan_ly ON public.tai_lieu(phong_quan_ly);
CREATE INDEX IF NOT EXISTS idx_tai_lieu_loai ON public.tai_lieu(loai);

-- Tạo policy để cho phép tất cả operations (tạm thời cho development)
-- Có thể thay đổi sau khi setup authentication
-- CREATE POLICY "Allow all operations" ON public.nhan_su FOR ALL USING (true) WITH CHECK (true);
-- CREATE POLICY "Allow all operations" ON public.dependents FOR ALL USING (true) WITH CHECK (true);
-- CREATE POLICY "Allow all operations" ON public.nhan_su_chi_tiet FOR ALL USING (true) WITH CHECK (true);
