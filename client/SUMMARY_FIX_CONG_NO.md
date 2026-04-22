# TÓM TẮT - FIX CÔNG NỢ HỢP ĐỒNG

## 🎯 Vấn đề đã giải quyết

Khi import Excel hợp đồng có nhiều giai đoạn thanh toán (nhiều dòng cùng số HĐ), giá trị quyết toán bị ghi đè thay vì cộng dồn → công nợ hiển thị sai.

## ✅ Giải pháp đã áp dụng

### 1. Sửa code frontend (HopDong.tsx)

**File:** `client/src/pages/customer/HopDong.tsx`

**Thay đổi:** Thêm logic nhóm và cộng dồn trước khi gọi API import

```typescript
// Nhóm các dòng theo số hợp đồng và cộng dồn giá trị quyết toán
const contractGroups = new Map<string, any>();
for (const row of processedChunk) {
    const soHd = (row.so_hop_dong || '').trim().toLowerCase();
    const duAnId = row.du_an_id || '';
    const groupKey = `${soHd}|${duAnId}`;
    
    if (contractGroups.has(groupKey)) {
        // Cộng dồn giá trị
        const existing = contractGroups.get(groupKey);
        existing.gia_tri_hd += row.gia_tri_hd || 0;
        existing.gia_tri_qt += row.gia_tri_qt || 0;
    } else {
        contractGroups.set(groupKey, { ...row });
    }
}
```

**Kết quả:** 
- Nhiều dòng cùng số HĐ → tự động merge thành 1 hợp đồng
- Giá trị quyết toán = tổng các đợt
- Công nợ tính đúng

### 2. Backend không cần sửa

Logic backend (`server/src/services/contractService.ts`) đã xử lý update đúng, chỉ cần frontend gửi dữ liệu đã tổng hợp.

## 📁 Files đã tạo

1. **FIX_CONG_NO_HOP_DONG.md** - Hướng dẫn chi tiết về vấn đề và giải pháp
2. **HUONG_DAN_SUA_CONG_NO.md** - Hướng dẫn ngắn gọn cho người dùng
3. **scripts/fix-contract-debt.sql** - Script SQL để kiểm tra và sửa dữ liệu cũ
4. **TEST_FIX_CONG_NO.md** - Test cases để kiểm tra fix
5. **SUMMARY_FIX_CONG_NO.md** - File này (tóm tắt)

## 🔧 Cách sử dụng

### Cho dữ liệu mới (sau khi fix)
- Import Excel như bình thường
- Hệ thống tự động nhóm và cộng dồn
- Không cần làm gì thêm

### Cho dữ liệu cũ (đã import sai)

**Cách 1: Sửa thủ công**
1. Vào màn Hợp đồng
2. Edit hợp đồng bị sai
3. Cập nhật "Giá trị quyết toán" đúng
4. Lưu → Công nợ tự động tính lại

**Cách 2: Chạy SQL script**
1. Mở Supabase SQL Editor
2. Copy nội dung file `scripts/fix-contract-debt.sql`
3. Chạy BƯỚC 1 để kiểm tra
4. Uncomment và chạy BƯỚC 2 để sửa
5. Chạy BƯỚC 3 để xác nhận

**Cách 3: Import lại**
1. Export dữ liệu hiện tại (backup)
2. Xóa hợp đồng bị sai
3. Import lại với code mới

## 📊 Ví dụ minh họa

### Trước khi fix

**File Excel:**
```
Số HĐ    | Giá xuất HĐ
HD-01    | 500,000,000
HD-01    | 300,000,000
```

**Kết quả (SAI):**
- Giá trị QT: 300,000,000 (chỉ lấy dòng cuối)
- Đã thu: 500,000,000 (từ phiếu thu)
- Công nợ: 0 (vì âm → hiển thị 0)

### Sau khi fix

**File Excel:** (giống trên)

**Kết quả (ĐÚNG):**
- Giá trị QT: 800,000,000 (500M + 300M)
- Đã thu: 500,000,000 (từ phiếu thu)
- Công nợ: 300,000,000 (800M - 500M)

## ⚠️ Lưu ý quan trọng

1. **Backup trước khi sửa dữ liệu cũ**
2. **Kiểm tra kỹ sau khi import**
3. **Công nợ = Giá trị QT - Đã thu** (tự động tính)
4. **Không nhập thủ công "Đã thu"** (lấy từ phiếu thu)

## 🎓 Best practices

1. **Chuẩn bị file Excel kỹ trước khi import**
   - Kiểm tra số HĐ có đúng không
   - Xóa khoảng trắng thừa
   - Kiểm tra giá trị có hợp lý không

2. **Import từng bước**
   - Import hợp đồng trước
   - Kiểm tra công nợ
   - Import phiếu thu chi sau

3. **Kiểm tra sau import**
   - Giá trị QT có đúng không?
   - Công nợ có hợp lý không?
   - Có hợp đồng trùng không?

## 📞 Hỗ trợ

Nếu gặp vấn đề:
1. Xem file `FIX_CONG_NO_HOP_DONG.md` (chi tiết)
2. Xem file `TEST_FIX_CONG_NO.md` (test cases)
3. Chạy script `fix-contract-debt.sql` (kiểm tra DB)

## ✨ Kết luận

Fix đã hoàn thành và sẵn sàng sử dụng. Code mới sẽ tự động xử lý đúng khi import Excel có nhiều dòng cùng số hợp đồng.
