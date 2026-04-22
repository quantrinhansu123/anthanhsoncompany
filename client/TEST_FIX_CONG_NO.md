# TEST CASE - FIX CÔNG NỢ HỢP ĐỒNG

## Mục đích
Kiểm tra việc nhóm và cộng dồn giá trị quyết toán khi import Excel có nhiều dòng cùng số hợp đồng.

## Dữ liệu test

### File Excel mẫu (test-hop-dong-nhieu-dot.xlsx)

| TT | Số HĐ & PLHĐ | Ngày | Năm | Tên DA | Tên gói thầu | Loại DV | Giá HĐ/PLHĐ | Giá xuất HĐ | CĐT thanh toán | CĐT nợ | CĐT tạm ứng | Thông tin KH | MST KH |
|----|--------------|------|-----|--------|--------------|---------|-------------|-------------|----------------|--------|-------------|--------------|--------|
| 1 | HD-TEST-001 | 15/01 | 2025 | Dự án Test | Đợt 1 - Thiết kế | Tư vấn | 500000000 | 500000000 | 300000000 | 200000000 | 0 | Công ty ABC | 0123456789 |
| 2 | HD-TEST-001 | 20/02 | 2025 | Dự án Test | Đợt 2 - Thi công | Tư vấn | 300000000 | 300000000 | 200000000 | 100000000 | 0 | Công ty ABC | 0123456789 |
| 3 | HD-TEST-001 | 15/03 | 2025 | Dự án Test | Đợt 3 - Nghiệm thu | Tư vấn | 200000000 | 200000000 | 100000000 | 100000000 | 0 | Công ty ABC | 0123456789 |

## Kết quả mong đợi

### Sau khi import

**Hợp đồng HD-TEST-001:**
- Giá trị HĐ: 1,000,000,000 đ (500M + 300M + 200M)
- Giá trị QT: 1,000,000,000 đ (500M + 300M + 200M)
- Đã thu: 600,000,000 đ (từ phiếu thu: 300M + 200M + 100M)
- Công nợ: 400,000,000 đ (1,000M - 600M)

### Phiếu thu tự động tạo (nếu import qua màn Thu Chi)

| Loại phiếu | Số tiền | Ngày | Dự án | Hợp đồng | Tình trạng |
|------------|---------|------|-------|----------|------------|
| Phiếu thu | 300,000,000 | 15/01/2025 | Dự án Test | HD-TEST-001 | Thanh toán |
| Phiếu thu | 200,000,000 | 20/02/2025 | Dự án Test | HD-TEST-001 | Thanh toán |
| Phiếu thu | 100,000,000 | 15/03/2025 | Dự án Test | HD-TEST-001 | Thanh toán |

## Các bước test

### Test 1: Import hợp đồng nhiều đợt

1. **Chuẩn bị:**
   - Tạo khách hàng "Công ty ABC" (hoặc để hệ thống tự tạo)
   - Tạo dự án "Dự án Test"

2. **Thực hiện:**
   - Vào màn **Hợp đồng**
   - Click **Import Excel**
   - Chọn file test có 3 dòng cùng số HĐ
   - Click **Import**

3. **Kiểm tra:**
   - Chỉ có **1 hợp đồng** được tạo (không phải 3)
   - Số HĐ: HD-TEST-001
   - Giá trị QT: **1,000,000,000 đ** (không phải 200M)
   - Công nợ: Tính đúng dựa trên phiếu thu

### Test 2: Import qua màn Thu Chi (file CDT)

1. **Chuẩn bị:**
   - Đã có dự án "Dự án Test"
   - Chưa có hợp đồng HD-TEST-001

2. **Thực hiện:**
   - Vào màn **Thu Chi**
   - Click **Import Excel**
   - Chọn file CDT có 3 dòng thanh toán
   - Click **Import**

3. **Kiểm tra:**
   - Hợp đồng HD-TEST-001 được tạo tự động
   - Giá trị QT: **1,000,000,000 đ**
   - 3 phiếu thu được tạo
   - Tổng đã thu: **600,000,000 đ**
   - Công nợ: **400,000,000 đ**

### Test 3: Update hợp đồng đã có

1. **Chuẩn bị:**
   - Đã có hợp đồng HD-TEST-001 với giá trị QT = 500M

2. **Thực hiện:**
   - Import lại file Excel có 3 dòng
   - Hệ thống phát hiện HĐ đã tồn tại

3. **Kiểm tra:**
   - Giá trị QT được cập nhật thành **1,000,000,000 đ**
   - Không tạo hợp đồng mới
   - Công nợ được tính lại

### Test 4: Nhiều hợp đồng khác nhau

1. **Dữ liệu:**
   - HD-TEST-001: 3 dòng (như trên)
   - HD-TEST-002: 2 dòng (400M + 300M)
   - HD-TEST-003: 1 dòng (500M)

2. **Kiểm tra:**
   - 3 hợp đồng được tạo
   - HD-TEST-001: QT = 1,000M
   - HD-TEST-002: QT = 700M
   - HD-TEST-003: QT = 500M

### Test 5: Cùng số HĐ nhưng khác dự án

1. **Dữ liệu:**
   - HD-TEST-001 + Dự án A: 500M
   - HD-TEST-001 + Dự án B: 300M

2. **Kiểm tra:**
   - 2 hợp đồng riêng biệt được tạo
   - Mỗi HĐ gắn đúng dự án
   - Không cộng dồn (vì khác dự án)

## Kết quả test

| Test Case | Trạng thái | Ghi chú |
|-----------|------------|---------|
| Test 1: Import nhiều đợt | ⬜ Chưa test | |
| Test 2: Import CDT | ⬜ Chưa test | |
| Test 3: Update HĐ có sẵn | ⬜ Chưa test | |
| Test 4: Nhiều HĐ khác nhau | ⬜ Chưa test | |
| Test 5: Cùng số HĐ khác DA | ⬜ Chưa test | |

## Lỗi thường gặp

### Lỗi 1: Giá trị QT vẫn bị ghi đè
**Nguyên nhân:** Code chưa được deploy hoặc cache browser
**Giải pháp:** 
- Hard refresh (Ctrl + Shift + R)
- Xóa cache browser
- Kiểm tra code đã được build

### Lỗi 2: Công nợ âm
**Nguyên nhân:** Giá trị QT < Đã thu
**Giải pháp:**
- Kiểm tra giá trị QT có đúng không
- Kiểm tra phiếu thu có bị trùng không
- Chạy script fix-contract-debt.sql

### Lỗi 3: Tạo nhiều HĐ thay vì 1
**Nguyên nhân:** Số HĐ không giống nhau (có khoảng trắng, ký tự đặc biệt)
**Giải pháp:**
- Chuẩn hóa số HĐ trong Excel
- Xóa khoảng trắng thừa
- Kiểm tra chính tả

## Checklist trước khi release

- [ ] Code đã được review
- [ ] Test case 1-5 đều pass
- [ ] Không có lỗi console
- [ ] Không có lỗi TypeScript
- [ ] Đã test với dữ liệu thực
- [ ] Đã backup database
- [ ] Đã tạo migration script (nếu cần)
- [ ] Đã cập nhật documentation
