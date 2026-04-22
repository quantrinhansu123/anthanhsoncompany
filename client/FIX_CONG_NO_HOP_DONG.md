# HƯỚNG DẪN KHẮC PHỤC VẤN ĐỀ CÔNG NỢ HỢP ĐỒNG

## 🔍 Vấn đề

Khi import Excel hợp đồng có nhiều giai đoạn thanh toán:
- Mỗi dòng Excel có `gia_xuat_hd` (Giá xuất HĐ) khác nhau cho từng đợt thanh toán
- Nhưng `gia_tri_qt` (Giá trị quyết toán) của hợp đồng bị ghi đè bởi dòng cuối cùng thay vì cộng dồn
- Dẫn đến công nợ (`con_phai_thu`) hiển thị không đúng

**Công thức tính công nợ hiện tại:**
```
con_phai_thu = gia_tri_qt - da_thu
```

Trong đó:
- `gia_tri_qt`: Giá trị quyết toán (từ cột "Giá xuất HĐ" trong Excel)
- `da_thu`: Tổng các phiếu thu gắn với hợp đồng

## 🎯 Nguyên nhân

### 1. Logic Import Excel (HopDong.tsx)

Khi import Excel, mỗi dòng được xử lý như sau:

```typescript
gia_tri_qt: parseMoneyVi(r.gia_xuat_hd || '0'),
da_thu: parseMoneyVi(r.cdt_thanh_toan || '0'),
con_phai_thu: parseMoneyVi(r.cdt_no || '0'),
```

**Vấn đề**: Nếu có nhiều dòng cho cùng 1 hợp đồng (cùng số HĐ), giá trị `gia_tri_qt` bị ghi đè thay vì cộng dồn.

### 2. Ví dụ minh họa

**File Excel:**
| Số HĐ | Tên gói thầu | Giá xuất HĐ | CĐT thanh toán | CĐT nợ |
|-------|--------------|-------------|----------------|--------|
| HD-01 | Đợt 1        | 500,000,000 | 300,000,000    | 200,000,000 |
| HD-01 | Đợt 2        | 300,000,000 | 200,000,000    | 100,000,000 |

**Kết quả mong muốn:**
- `gia_tri_qt` = 800,000,000 (500M + 300M)
- `da_thu` = 500,000,000 (300M + 200M từ phiếu thu)
- `con_phai_thu` = 300,000,000 (800M - 500M)

**Kết quả thực tế (lỗi):**
- `gia_tri_qt` = 300,000,000 (chỉ lấy dòng cuối)
- `da_thu` = 500,000,000 (đúng - từ phiếu thu)
- `con_phai_thu` = -200,000,000 → hiển thị 0 (do Math.max(0, ...))

## ✅ Giải pháp

### Phương án 1: Sửa logic import Excel (Khuyến nghị)

Cần nhóm các dòng có cùng số hợp đồng và cộng dồn giá trị quyết toán.

**File cần sửa:** `client/src/pages/customer/HopDong.tsx`

**Vị trí:** Trong hàm `onImport` của `ExcelImportExportBar` (khoảng dòng 1100-1130)

**Code hiện tại:**
```typescript
const result = await contractService.bulkImport(processedChunk);
```

**Code cần thêm trước khi gọi `bulkImport`:**

```typescript
// Nhóm các dòng theo số hợp đồng và cộng dồn giá trị
const contractGroups = new Map<string, any>();

for (const row of processedChunk) {
    const soHd = (row.so_hop_dong || '').trim().toLowerCase();
    if (!soHd) {
        // Không có số HĐ, xử lý như bình thường
        continue;
    }
    
    if (contractGroups.has(soHd)) {
        // Đã có HĐ này, cộng dồn giá trị
        const existing = contractGroups.get(soHd);
        existing.gia_tri_qt += row.gia_tri_qt || 0;
        existing.da_thu += row.da_thu || 0;
        existing.con_phai_thu = Math.max(0, existing.gia_tri_qt - existing.da_thu);
    } else {
        // HĐ mới, thêm vào map
        contractGroups.set(soHd, { ...row });
    }
}

// Chuyển map thành array để import
const mergedChunk = Array.from(contractGroups.values());
const result = await contractService.bulkImport(mergedChunk);
```

### Phương án 2: Cập nhật thủ công giá trị quyết toán

Nếu không muốn sửa code, bạn có thể:

1. **Tính tổng giá trị quyết toán** cho mỗi hợp đồng trong Excel trước khi import
2. **Chỉ giữ 1 dòng** cho mỗi hợp đồng với tổng giá trị đã tính
3. **Hoặc sau khi import**, vào chi tiết hợp đồng và cập nhật lại giá trị quyết toán đúng

### Phương án 3: Tạo script sửa dữ liệu

Nếu đã import sai, có thể tạo script để:

1. Lấy tất cả hợp đồng
2. Với mỗi hợp đồng, tính lại:
   - `da_thu` = tổng phiếu thu gắn với hợp đồng
   - `con_phai_thu` = `gia_tri_qt` - `da_thu`
3. Cập nhật lại database

## 📝 Lưu ý quan trọng

### 1. Phân biệt các khái niệm

- **Giá HĐ/PLHĐ** (`gia_tri_hd`): Giá trị hợp đồng ban đầu
- **Giá xuất HĐ** (`gia_tri_qt`): Giá trị quyết toán (có thể khác giá HĐ)
- **CĐT thanh toán**: Số tiền chủ đầu tư đã thanh toán (tạo phiếu thu)
- **CĐT nợ**: Số tiền chủ đầu tư còn nợ (= Giá xuất HĐ - CĐT thanh toán)

### 2. Cách import đúng

**Nếu 1 hợp đồng có nhiều đợt thanh toán:**

**Cách 1: Tổng hợp trước khi import**
- Tính tổng giá trị quyết toán của tất cả các đợt
- Chỉ giữ 1 dòng với tổng giá trị

**Cách 2: Import từng đợt riêng biệt**
- Mỗi đợt thanh toán là 1 hợp đồng riêng
- Đặt tên số HĐ khác nhau (VD: HD-01-Đợt1, HD-01-Đợt2)

**Cách 3: Sử dụng file CDT (Thu Chi)**
- Import hợp đồng với giá trị quyết toán tổng
- Import các phiếu thu từng đợt vào màn Thu Chi

### 3. Kiểm tra sau khi import

Sau khi import, kiểm tra:
1. Giá trị quyết toán có đúng không?
2. Tổng đã thu có khớp với tổng phiếu thu không?
3. Công nợ = Giá trị quyết toán - Đã thu

## 🔧 Cách sửa nhanh cho dữ liệu hiện tại

Nếu bạn đã import sai và cần sửa nhanh:

1. **Vào màn Hợp đồng**
2. **Tìm hợp đồng bị sai**
3. **Click Edit (biểu tượng bút chì)**
4. **Cập nhật lại "Giá trị quyết toán"** với tổng giá trị đúng
5. **Lưu lại**

Hệ thống sẽ tự động tính lại công nợ dựa trên:
- Giá trị quyết toán mới
- Tổng phiếu thu đã có trong hệ thống

## 📊 Công thức tính toán

```
Giá trị quyết toán (gia_tri_qt) = Tổng giá xuất HĐ của tất cả các đợt
Đã thu (da_thu) = Tổng các phiếu thu gắn với hợp đồng
Còn phải thu (con_phai_thu) = Giá trị quyết toán - Đã thu
```

**Lưu ý:** 
- Giá trị "Đã thu" được tính tự động từ các phiếu thu trong hệ thống
- Không nên nhập thủ công giá trị "Đã thu" khi tạo/sửa hợp đồng
- Chỉ cần đảm bảo "Giá trị quyết toán" đúng, hệ thống sẽ tự tính công nợ

## 🎓 Khuyến nghị

1. **Chuẩn bị file Excel kỹ trước khi import**
   - Kiểm tra các hợp đồng có nhiều đợt thanh toán
   - Tổng hợp giá trị quyết toán trước

2. **Sử dụng template đúng**
   - Download template từ hệ thống
   - Điền đúng các cột theo hướng dẫn

3. **Import từng bước**
   - Import hợp đồng trước
   - Import phiếu thu chi sau
   - Kiểm tra công nợ sau mỗi lần import

4. **Backup dữ liệu trước khi import**
   - Export dữ liệu hiện tại ra Excel
   - Lưu lại để phòng trường hợp cần rollback
