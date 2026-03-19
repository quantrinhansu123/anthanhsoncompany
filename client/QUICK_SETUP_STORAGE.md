# Hướng dẫn Setup Storage Buckets nhanh

## Cách 1: Setup tự động (Khuyến nghị)

### Bước 1: Tạo tất cả buckets trong Dashboard

1. Mở **Supabase Dashboard** → **Storage**
2. Tạo các buckets sau (mỗi bucket một lần):
   - `employee-avatars` (Public)
   - `thu-chi-files` (Public)
   - `task-evidence` (Public)
   - `certificates` (Public)
   - `logos` (Public)

**Lưu ý**: Tất cả buckets phải chọn **Public bucket**!

### Bước 2: Chạy script SQL tự động

1. Mở **Supabase Dashboard** → **SQL Editor**
2. Tạo query mới
3. Copy toàn bộ nội dung từ file `setup_all_storage_buckets.sql`
4. Paste vào SQL Editor
5. Click **Run**

Script sẽ:
- ✅ Tự động kiểm tra buckets đã tồn tại
- ✅ Tự động tạo policies cho buckets đã có
- ⚠️ Cảnh báo nếu bucket chưa được tạo

### Bước 3: Kiểm tra kết quả

Sau khi chạy script, xem phần "KIỂM TRA KẾT QUẢ" ở cuối script để:
- Xem danh sách buckets đã tạo
- Xem danh sách policies đã tạo

## Cách 2: Setup từng bucket riêng lẻ

Nếu muốn setup từng bucket một, sử dụng các file riêng:

- `create_employee_avatars_bucket.sql` - Cho bucket ảnh nhân sự
- `create_thu_chi_files_bucket.sql` - Cho bucket thu chi
- `create_task_evidence_bucket.sql` - Cho bucket ảnh bằng chứng task
- `create_certificates_bucket.sql` - Cho bucket chứng chỉ
- `create_logos_bucket.md` - Cho bucket logo (có script SQL bên trong)

## Lưu ý quan trọng

1. **Buckets phải là Public** - Nếu không, file sẽ không hiển thị được
2. **Tạo buckets trước khi chạy SQL** - Script chỉ tạo policies, không tạo buckets
3. **Kiểm tra kết quả** - Xem phần "KIỂM TRA KẾT QUẢ" trong script để đảm bảo tất cả đã được setup đúng

## Troubleshooting

### Lỗi: "Bucket chưa tồn tại"
- **Giải pháp**: Tạo bucket trong Dashboard trước khi chạy SQL

### Lỗi: "Policy already exists"
- **Giải pháp**: Không sao, script sẽ tự động xóa và tạo lại

### Ảnh không hiển thị sau khi upload
- **Kiểm tra**: Bucket có phải Public không?
- **Kiểm tra**: Policies đã được tạo chưa?
- **Kiểm tra**: URL ảnh có đúng format không?
