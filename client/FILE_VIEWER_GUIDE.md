# HƯỚNG DẪN XEM FILE TRONG HỆ THỐNG

## 🎯 Tính năng

Hệ thống hỗ trợ xem trực tiếp các loại file sau **KHÔNG CẦN TẢI XUỐNG**:

### ✅ Các định dạng được hỗ trợ

| Loại file | Định dạng | Cách xem |
|-----------|-----------|----------|
| 📄 PDF | .pdf | Hiển thị trực tiếp trong trình duyệt |
| 🖼️ Ảnh | .jpg, .jpeg, .png, .gif, .webp | Hiển thị trực tiếp |
| 📝 Word | .doc, .docx | Google Docs Viewer / Office Online |
| 📊 Excel | .xls, .xlsx, .csv | Google Docs Viewer / Office Online |

## 🚀 Cách sử dụng

### 1. Trong modal Hợp đồng

1. Mở modal **Thêm/Sửa hợp đồng**
2. Cuộn xuống phần **Tài liệu đính kèm**
3. Click vào icon **👁️ (mắt)** bên cạnh file muốn xem
4. Modal xem file sẽ mở ra

### 2. Các tính năng trong modal xem file

**Thanh công cụ trên cùng:**
- 🔗 **Mở trong tab mới** - Mở file trong tab riêng
- ⬇️ **Tải xuống** - Download file về máy
- ❌ **Đóng** - Đóng modal

**Đối với Word/Excel:**
- Có 2 nút chuyển đổi viewer:
  - **Google Viewer** (mặc định)
  - **Office Viewer** (backup nếu Google không load được)

**Phím tắt:**
- `ESC` - Đóng modal nhanh

## 📋 Lưu ý quan trọng

### 1. Yêu cầu kết nối internet

Để xem Word/Excel, cần:
- ✅ Kết nối internet ổn định
- ✅ File phải được host công khai (có URL truy cập được)
- ✅ URL không bị chặn bởi CORS

### 2. Giới hạn của viewer

**Google Docs Viewer:**
- ✅ Hỗ trợ tốt hầu hết file Word/Excel
- ❌ Giới hạn kích thước file (~25MB)
- ❌ Không hỗ trợ file có mật khẩu
- ❌ Có thể chậm với file lớn

**Office Online Viewer:**
- ✅ Hỗ trợ tốt định dạng Microsoft
- ❌ Yêu cầu file phải public
- ❌ Đôi khi không load được file từ một số domain

### 3. Xử lý lỗi

**Nếu file không hiển thị:**

1. **Thử đổi viewer** (Word/Excel):
   - Click nút "Office Viewer" nếu đang dùng "Google Viewer"
   - Hoặc ngược lại

2. **Mở trong tab mới**:
   - Click icon 🔗 để mở file trong tab riêng
   - Trình duyệt có thể xử lý tốt hơn

3. **Tải xuống**:
   - Click icon ⬇️ để download
   - Mở bằng ứng dụng trên máy

## 🎨 Giao diện

### Modal xem file

```
┌─────────────────────────────────────────────┐
│ 📄 Tên file.pdf              🔗 ⬇️ ❌      │ ← Header
├─────────────────────────────────────────────┤
│                                             │
│                                             │
│            [Nội dung file]                  │ ← Viewer
│                                             │
│                                             │
├─────────────────────────────────────────────┤
│  💡 Mẹo: Nhấn ESC để đóng                   │ ← Footer
└─────────────────────────────────────────────┘
```

### Trạng thái loading

Khi đang tải file, hiển thị:
```
    ⏳ Đang tải file...
```

### Trạng thái lỗi

Nếu không tải được, hiển thị:
```
    ⚠️ Lỗi tải file
    [Thông báo lỗi chi tiết]
    
    [Tải xuống]  [Đóng]
```

## 🔧 Kỹ thuật

### Cách hoạt động

1. **PDF & Ảnh**: Hiển thị trực tiếp qua `<iframe>` hoặc `<img>`

2. **Word/Excel**: Sử dụng viewer bên thứ 3:
   ```
   Google: https://docs.google.com/viewer?url=[FILE_URL]&embedded=true
   Office: https://view.officeapps.live.com/op/embed.aspx?src=[FILE_URL]
   ```

3. **File khác**: Hiển thị thông báo và nút tải xuống

### Component

**File:** `client/src/components/FileViewerModal.tsx`

**Props:**
```typescript
interface FileViewerModalProps {
    isOpen: boolean;        // Hiển thị modal
    onClose: () => void;    // Callback khi đóng
    fileUrl: string;        // URL file cần xem
    fileName?: string;      // Tên file (optional)
}
```

**Sử dụng:**
```tsx
import { FileViewerModal } from '@/components/FileViewerModal';

function MyComponent() {
    const [viewUrl, setViewUrl] = useState<string | null>(null);
    
    return (
        <>
            <button onClick={() => setViewUrl('https://example.com/file.pdf')}>
                Xem file
            </button>
            
            <FileViewerModal
                isOpen={!!viewUrl}
                onClose={() => setViewUrl(null)}
                fileUrl={viewUrl || ''}
                fileName="Tài liệu.pdf"
            />
        </>
    );
}
```

## 🐛 Troubleshooting

### Vấn đề: Word/Excel không hiển thị

**Nguyên nhân:**
- File quá lớn (>25MB)
- URL không public
- CORS bị chặn
- Viewer bị lỗi

**Giải pháp:**
1. Thử đổi viewer (Google ↔ Office)
2. Kiểm tra URL có truy cập được không
3. Tải xuống và mở bằng ứng dụng

### Vấn đề: PDF hiển thị trắng

**Nguyên nhân:**
- Trình duyệt không hỗ trợ
- File bị lỗi
- CORS issue

**Giải pháp:**
1. Thử trình duyệt khác (Chrome, Firefox)
2. Mở trong tab mới
3. Tải xuống để xem

### Vấn đề: Ảnh không load

**Nguyên nhân:**
- URL sai
- File không tồn tại
- Quyền truy cập bị chặn

**Giải pháp:**
1. Kiểm tra URL trong console
2. Thử mở URL trực tiếp trong trình duyệt
3. Kiểm tra quyền truy cập file

## 📊 So sánh với các giải pháp khác

| Giải pháp | Ưu điểm | Nhược điểm |
|-----------|---------|------------|
| **Hiện tại** (Google/Office Viewer) | ✅ Không cần backend<br>✅ Dễ implement<br>✅ Miễn phí | ❌ Cần internet<br>❌ Giới hạn file size<br>❌ Phụ thuộc bên thứ 3 |
| **PDF.js** | ✅ Offline được<br>✅ Tùy chỉnh cao | ❌ Chỉ PDF<br>❌ Phức tạp hơn |
| **LibreOffice Online** | ✅ Xem/sửa được<br>✅ Nhiều tính năng | ❌ Cần server riêng<br>❌ Phức tạp setup |
| **Microsoft Graph API** | ✅ Chính thống<br>✅ Tính năng đầy đủ | ❌ Cần license<br>❌ Phức tạp auth |

## 🎓 Best Practices

1. **Luôn có nút "Tải xuống"** - Backup khi viewer không hoạt động

2. **Hiển thị loading state** - Người dùng biết đang xử lý

3. **Xử lý lỗi gracefully** - Đưa ra hướng dẫn rõ ràng

4. **Tối ưu file size** - Nén file trước khi upload

5. **Kiểm tra định dạng** - Validate file type trước khi upload

## 🚀 Tương lai

Có thể cải thiện:

1. **Thêm zoom/pan** cho PDF và ảnh
2. **Hỗ trợ xem nhiều file** (slideshow)
3. **Cache viewer** để load nhanh hơn
4. **Hỗ trợ thêm định dạng** (PPT, video, audio)
5. **Annotation** - Đánh dấu, ghi chú trên file

## 📞 Hỗ trợ

Nếu gặp vấn đề:
1. Kiểm tra console browser (F12)
2. Thử các bước troubleshooting ở trên
3. Liên hệ team dev với thông tin:
   - Loại file
   - URL file
   - Thông báo lỗi (nếu có)
   - Screenshot
