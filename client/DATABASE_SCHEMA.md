# TỔNG QUAN CẤU TRÚC DATABASE

## 📋 DANH SÁCH CÁC BẢNG

### 1. **nhan_su** (Nhân sự)
**Mục đích:** Quản lý thông tin nhân viên

| Cột | Kiểu dữ liệu | Mô tả | Ràng buộc |
|-----|--------------|-------|-----------|
| `id` | UUID | ID chính | PRIMARY KEY, DEFAULT gen_random_uuid() |
| `code` | VARCHAR(50) | Mã nhân viên | UNIQUE |
| `full_name` | VARCHAR(255) | Họ tên đầy đủ | |
| `name` | VARCHAR(255) | Tên | |
| `hoTen` | VARCHAR(255) | Họ tên (tiếng Việt) | |
| `department` | VARCHAR(255) | Phòng ban | |
| `phongBan` | VARCHAR(255) | Phòng ban (tiếng Việt) | |
| `position` | VARCHAR(255) | Chức vụ | |
| `chucVu` | VARCHAR(255) | Chức vụ (tiếng Việt) | |
| `email` | VARCHAR(255) | Email | |
| `phone` | VARCHAR(50) | Số điện thoại | |
| `sdtNhanVien` | VARCHAR(50) | SĐT nhân viên | |
| `status` | VARCHAR(20) | Trạng thái | DEFAULT 'active' |
| `joinDate` | DATE | Ngày vào làm | |
| `ngayVaoLam` | DATE | Ngày vào làm (tiếng Việt) | |
| `ngaySinh` | DATE | Ngày sinh | |
| `diaChi` | TEXT | Địa chỉ | |
| `soCCCD` | VARCHAR(50) | Số CCCD | |
| `ngayCapCCCD` | DATE | Ngày cấp CCCD | |
| `mstCaNhan` | VARCHAR(50) | MST cá nhân | |
| `maSoBHXH` | VARCHAR(50) | Mã số BHXH | |
| `bangDHChuyenNganh` | VARCHAR(255) | Bằng đại học chuyên ngành | |
| `namTotNghiep` | INTEGER | Năm tốt nghiệp | |
| `created_at` | TIMESTAMP WITH TIME ZONE | Ngày tạo | DEFAULT NOW() |
| `updated_at` | TIMESTAMP WITH TIME ZONE | Ngày cập nhật | DEFAULT NOW() |

**Indexes:**
- `idx_nhan_su_code` trên `code`
- `idx_nhan_su_status` trên `status`

---

### 2. **dependents** (Người phụ thuộc)
**Mục đích:** Quản lý người phụ thuộc của nhân viên

| Cột | Kiểu dữ liệu | Mô tả | Ràng buộc |
|-----|--------------|-------|-----------|
| `id` | UUID | ID chính | PRIMARY KEY, DEFAULT gen_random_uuid() |
| `employee_id` | UUID | ID nhân viên | NOT NULL, FK → nhan_su(id) |
| `hoTenNPT` | VARCHAR(255) | Họ tên người phụ thuộc | NOT NULL |
| `ngaySinhNPT` | DATE | Ngày sinh NPT | NOT NULL |
| `soCCCDNPT` | VARCHAR(50) | Số CCCD NPT | |
| `mstNPT` | VARCHAR(50) | MST NPT | |
| `quanHe` | VARCHAR(100) | Quan hệ | |
| `created_at` | TIMESTAMP WITH TIME ZONE | Ngày tạo | DEFAULT NOW() |
| `updated_at` | TIMESTAMP WITH TIME ZONE | Ngày cập nhật | DEFAULT NOW() |

**Foreign Keys:**
- `dependents_employee_id_fkey`: `employee_id` → `nhan_su(id)` ON DELETE CASCADE

**Indexes:**
- `idx_dependents_employee_id` trên `employee_id`

---

### 3. **nguoi_phu_thuoc** (Người phụ thuộc - bảng song song)
**Mục đích:** Bảng song song với `dependents` (có thể dùng cho migration)

| Cột | Kiểu dữ liệu | Mô tả | Ràng buộc |
|-----|--------------|-------|-----------|
| `id` | UUID | ID chính | PRIMARY KEY, DEFAULT gen_random_uuid() |
| `id_nhan_su` | UUID | ID nhân sự | FK → nhan_su(id) |
| `ho_ten_npt` | VARCHAR(255) | Họ tên người phụ thuộc | |
| `ngay_sinh_npt` | DATE | Ngày sinh NPT | |
| `so_cccd_npt` | VARCHAR(50) | Số CCCD NPT | |
| `mst_npt` | VARCHAR(50) | MST NPT | |
| `quan_he` | VARCHAR(100) | Quan hệ | |
| `created_at` | TIMESTAMP WITH TIME ZONE | Ngày tạo | DEFAULT NOW() |
| `updated_at` | TIMESTAMP WITH TIME ZONE | Ngày cập nhật | DEFAULT NOW() |

**Foreign Keys:**
- `nguoi_phu_thuoc_id_nhan_su_fkey`: `id_nhan_su` → `nhan_su(id)` ON DELETE CASCADE

---

### 4. **nhan_su_chi_tiet** (Chứng chỉ hành nghề)
**Mục đích:** Quản lý chứng chỉ hành nghề của nhân viên

| Cột | Kiểu dữ liệu | Mô tả | Ràng buộc |
|-----|--------------|-------|-----------|
| `id` | UUID | ID chính | PRIMARY KEY, DEFAULT gen_random_uuid() |
| `id_nhan_su` | UUID | ID nhân sự | NOT NULL, FK → nhan_su(id) |
| `ten_file_luu` | VARCHAR(255) | Tên file lưu | |
| `file_url` | TEXT | URL file | |
| `anh_url` | TEXT | URL ảnh 1 | |
| `anh2_url` | TEXT | URL ảnh 2 | |
| `ghi_chu` | TEXT | Ghi chú | |
| `cchn` | VARCHAR(255) | Chứng chỉ hành nghề | |
| `hang_cchn` | VARCHAR(255) | Hạng CCHN | |
| `ngay_het_han_cc` | DATE | Ngày hết hạn chứng chỉ | NOT NULL |
| `created_at` | TIMESTAMP WITH TIME ZONE | Ngày tạo | DEFAULT NOW() |
| `updated_at` | TIMESTAMP WITH TIME ZONE | Ngày cập nhật | DEFAULT NOW() |

**Foreign Keys:**
- `nhan_su_chi_tiet_id_nhan_su_fkey`: `id_nhan_su` → `nhan_su(id)` ON DELETE CASCADE

**Indexes:**
- `idx_nhan_su_chi_tiet_id_nhan_su` trên `id_nhan_su`
- `idx_nhan_su_chi_tiet_ngay_het_han` trên `ngay_het_han_cc`

---

### 5. **khach_hang** (Khách hàng)
**Mục đích:** Quản lý thông tin khách hàng

| Cột | Kiểu dữ liệu | Mô tả | Ràng buộc |
|-----|--------------|-------|-----------|
| `id` | UUID | ID chính | PRIMARY KEY, DEFAULT gen_random_uuid() |
| `ten_don_vi` | VARCHAR(500) | Tên đơn vị (Tên khách hàng) | NOT NULL |
| `loai_hinh` | VARCHAR(100) | Loại hình (Tư nhân, Doanh nghiệp, Cơ quan nhà nước) | |
| `mst` | VARCHAR(50) | Mã số thuế | |
| `dia_chi` | TEXT | Địa chỉ | |
| `nguoi_dai_dien` | VARCHAR(255) | Người đại diện | |
| `chuc_vu_dai_dien` | VARCHAR(100) | Chức vụ đại diện | |
| `nguoi_lien_he` | VARCHAR(255) | Người liên hệ | |
| `chuc_vu_lien_he` | VARCHAR(100) | Chức vụ liên hệ | |
| `sdt_lien_he` | VARCHAR(50) | SĐT liên hệ | |
| `tong_hop_dong` | DECIMAL(15,2) | Tổng hợp đồng | DEFAULT 0 |
| `gia_tri_quyet_toan` | DECIMAL(15,2) | Giá trị quyết toán | DEFAULT 0 |
| `da_thu` | DECIMAL(15,2) | Đã thu | DEFAULT 0 |
| `con_phai_thu` | DECIMAL(15,2) | Còn phải thu | DEFAULT 0 |
| `created_at` | TIMESTAMP WITH TIME ZONE | Ngày tạo | DEFAULT NOW() |
| `updated_at` | TIMESTAMP WITH TIME ZONE | Ngày cập nhật | DEFAULT NOW() |

**Indexes:**
- `idx_khach_hang_ten_don_vi` trên `ten_don_vi`
- `idx_khach_hang_mst` trên `mst`

---

### 6. **hop_dong** (Hợp đồng)
**Mục đích:** Quản lý hợp đồng với khách hàng

| Cột | Kiểu dữ liệu | Mô tả | Ràng buộc |
|-----|--------------|-------|-----------|
| `id` | UUID | ID chính | PRIMARY KEY, DEFAULT gen_random_uuid() |
| `customer_id` | UUID | ID khách hàng | FK → khach_hang(id) |
| `customer_name` | VARCHAR(255) | Tên khách hàng (snapshot) | |
| `project_name` | VARCHAR(255) | Tên dự án | |
| `so_hop_dong` | VARCHAR(100) | Số hợp đồng | |
| `ten_goi_thau` | TEXT | Tên gói thầu | |
| `ngay_ky_hd` | DATE | Ngày ký hợp đồng | |
| `file_status` | TEXT | Trạng thái file (Thiếu HĐ, BBNT, ...) | |
| `progress` | INTEGER | % trạng thái / tiến độ (0-100) | DEFAULT 0 |
| `gia_tri_hd` | NUMERIC(15,2) | Giá trị hợp đồng | DEFAULT 0 |
| `gia_tri_qt` | NUMERIC(15,2) | Giá trị quyết toán | DEFAULT 0 |
| `da_thu` | NUMERIC(15,2) | Đã thu | DEFAULT 0 |
| `con_phai_thu` | NUMERIC(15,2) | Còn phải thu | DEFAULT 0 |
| `loai_dich_vu` | TEXT | Loại dịch vụ | |
| `ngay_update` | DATE | Ngày cập nhật | |
| `created_at` | TIMESTAMP WITH TIME ZONE | Ngày tạo | DEFAULT NOW() |
| `updated_at` | TIMESTAMP WITH TIME ZONE | Ngày cập nhật | DEFAULT NOW() |

**Foreign Keys:**
- `fk_hop_dong_khach_hang`: `customer_id` → `khach_hang(id)` ON DELETE CASCADE

**Indexes:**
- `idx_hop_dong_customer_id` trên `customer_id`
- `idx_hop_dong_ngay_ky_hd` trên `ngay_ky_hd`
- `idx_hop_dong_project_name` trên `project_name`

---

### 7. **du_an** (Dự án)
**Mục đích:** Quản lý các dự án

| Cột | Kiểu dữ liệu | Mô tả | Ràng buộc |
|-----|--------------|-------|-----------|
| `id` | UUID | ID chính | PRIMARY KEY, DEFAULT gen_random_uuid() |
| `customer_id` | UUID | ID khách hàng | FK → khach_hang(id) (có thể NULL) |
| `ten_du_an` | VARCHAR(255) | Tên dự án | NOT NULL |
| `status` | VARCHAR(100) | Trạng thái dự án | DEFAULT 'Đang thực hiện' |
| `progress` | INTEGER | Tiến độ (%) 0-100 | DEFAULT 0 |
| `manager_img` | TEXT | Ảnh người quản lý | |
| `executor_img` | TEXT | Ảnh người thực thi | |
| `created_at` | TIMESTAMP WITH TIME ZONE | Ngày tạo | DEFAULT NOW() |
| `updated_at` | TIMESTAMP WITH TIME ZONE | Ngày cập nhật | DEFAULT NOW() |

**Indexes:**
- `idx_du_an_ten_du_an` trên `ten_du_an`
- `idx_du_an_customer_id` trên `customer_id`

---

### 8. **thu_vien_loi** (Thư viện lỗi Checklist)
**Mục đích:** Quản lý các lỗi thường gặp trong checklist

| Cột | Kiểu dữ liệu | Mô tả | Ràng buộc |
|-----|--------------|-------|-----------|
| `id` | UUID | ID chính | PRIMARY KEY, DEFAULT gen_random_uuid() |
| `stt` | INTEGER | Số thứ tự hiển thị | |
| `noi_dung_kiem_tra` | TEXT | Nội dung kiểm tra | NOT NULL |
| `checklist_id` | VARCHAR(100) | Mã checklist | |
| `chuyen_nganh` | VARCHAR(100) | Chuyên ngành (Hạ tầng, Dân dụng, ...) | |
| `bo_mon` | VARCHAR(100) | Bộ môn | |
| `hang_muc` | TEXT | Hạng mục | |
| `dien_giai_kiem_tra` | TEXT | Diễn giải kiểm tra | |
| `trong_cham` | INTEGER | Trọng chấm | DEFAULT 0 |
| `muc_do_quan_trong` | VARCHAR(50) | Mức độ quan trọng (Thấp/Trung bình/Cao/Nghiêm trọng) | |
| `canh_bao_loi` | VARCHAR(50) | Cảnh báo lỗi (Thấp/Trung bình/Vàng/Đỏ/Gấp) | |
| `ghi_chu_ky_thuat` | TEXT | Ghi chú kỹ thuật | |
| `hinh_anh_minh_hoa` | TEXT | Đường dẫn / tên file minh họa | |
| `created_at` | TIMESTAMP WITH TIME ZONE | Ngày tạo | DEFAULT NOW() |
| `updated_at` | TIMESTAMP WITH TIME ZONE | Ngày cập nhật | DEFAULT NOW() |

**Indexes:**
- `idx_thu_vien_loi_checklist_id` trên `checklist_id`
- `idx_thu_vien_loi_chuyen_nganh` trên `chuyen_nganh`
- `idx_thu_vien_loi_muc_do` trên `muc_do_quan_trong`

---

## 🔗 QUAN HỆ GIỮA CÁC BẢNG

```
nhan_su (1) ──< (N) dependents
nhan_su (1) ──< (N) nguoi_phu_thuoc
nhan_su (1) ──< (N) nhan_su_chi_tiet

khach_hang (1) ──< (N) hop_dong
khach_hang (1) ──< (N) du_an
```

---

## 📊 TỔNG KẾT

- **Tổng số bảng:** 8
- **Bảng chính:** nhan_su, khach_hang
- **Bảng phụ thuộc:** dependents, nguoi_phu_thuoc, nhan_su_chi_tiet, hop_dong, du_an, thu_vien_loi
- **Foreign Keys:** 5
- **Indexes:** 15+

---

## 📝 GHI CHÚ

1. Bảng `dependents` và `nguoi_phu_thuoc` là 2 bảng song song, có thể dùng cho migration
2. Tất cả các bảng đều có `created_at` và `updated_at` tự động
3. Tất cả ID chính đều dùng UUID với `gen_random_uuid()`
4. Các bảng có thể có cả tên cột tiếng Anh và tiếng Việt (ví dụ: `department` và `phongBan`)
