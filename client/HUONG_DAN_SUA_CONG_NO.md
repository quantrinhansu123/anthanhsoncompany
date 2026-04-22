# HƯỚNG DẪN SỬA CÔNG NỢ HỢP ĐỒNG

## ⚠️ Vấn đề

Khi import Excel hợp đồng có nhiều đợt thanh toán (nhiều dòng cùng số HĐ), giá trị quyết toán bị sai → công nợ hiển thị không đúng.

**Ví dụ:**
- Hợp đồng HD-01 có 2 đợt:
  - Đợt 1: 500 triệu
  - Đợt 2: 300 triệu
- Tổng quyết toán đúng: 800 triệu
- Nhưng hệ thống chỉ lấy: 300 triệu (dòng cuối)
- → Công nợ sai!

## ✅ Đã sửa

Code đã được cập nhật để tự động:
1. Nhóm các dòng có cùng số hợp đồng
2. Cộng dồn giá trị quyết toán
3. Import với giá trị đúng

## 🔧 Cách sửa dữ liệu cũ

Nếu bạn đã import sai trước đây:

### Cách 1: Sửa thủ công (Nhanh)
1. Vào màn **Hợp đồng**
2. Tìm hợp đồng bị sai
3. Click **Edit** (biểu tượng bút chì)
4. Cập nhật **"Giá trị quyết toán"** = tổng giá trị các đợt
5. **Lưu** → Công nợ tự động tính lại

### Cách 2: Import lại (Khuyến nghị)
1. **Export** dữ liệu hiện tại ra Excel (backup)
2. **Xóa** hợp đồng bị sai
3. **Chuẩn bị** file Excel:
   - Nếu 1 HĐ có nhiều đợt → tính tổng trước
   - Hoặc giữ nguyên nhiều dòng (code mới sẽ tự cộng)
4. **Import** lại

## 📝 Lưu ý khi import

### ✅ Đúng - Nhiều dòng cùng số HĐ
```
Số HĐ    | Tên gói thầu | Giá xuất HĐ
HD-01    | Đợt 1        | 500,000,000
HD-01    | Đợt 2        | 300,000,000
```
→ Hệ thống tự cộng = 800,000,000 ✓

### ✅ Đúng - Tổng hợp trước
```
Số HĐ    | Tên gói thầu | Giá xuất HĐ
HD-01    | Tổng         | 800,000,000
```
→ Giá trị đúng ngay ✓

### ❌ Sai - Mỗi đợt là HĐ riêng (nếu thực tế là 1 HĐ)
```
Số HĐ      | Tên gói thầu | Giá xuất HĐ
HD-01-Đợt1 | Đợt 1        | 500,000,000
HD-01-Đợt2 | Đợt 2        | 300,000,000
```
→ Tạo 2 HĐ riêng, không cộng dồn ✗

## 🎯 Công thức tính công nợ

```
Công nợ = Giá trị quyết toán - Đã thu
```

Trong đó:
- **Giá trị quyết toán**: Từ cột "Giá xuất HĐ" (tự động cộng dồn nếu nhiều dòng)
- **Đã thu**: Tổng phiếu thu trong hệ thống (tự động tính)

## 📞 Hỗ trợ

Nếu vẫn gặp vấn đề, xem file chi tiết: `FIX_CONG_NO_HOP_DONG.md`
