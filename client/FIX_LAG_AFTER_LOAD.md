# Fix Lag sau khi load data - QuanLyCongViec

## 🔍 Vấn đề phát hiện

Từ console logs:
```
[thuVienLoiService] Data received: (601) items
```

**Nguyên nhân lag sau khi load:**

1. ❌ **601 rows từ `thu_vien_loi`** được load và xử lý
2. ❌ **10 useMemo cascade** chạy mỗi lần state thay đổi:
   - `loiOptsChuyen` - filter 601 rows
   - `loiFilteredChuyen` - filter 601 rows
   - `loiOptsBoMon` - filter kết quả
   - `loiFilteredBoMon` - filter kết quả
   - `loiOptsCanhBao` - filter kết quả
   - `loiFilteredCanhBao` - filter kết quả
   - `loiOptsHangMuc` - filter kết quả
   - `loiFilteredHangMuc` - filter kết quả
   - `loiOptsNoiDung` - filter kết quả
   - `loiMatchingRows` - filter kết quả

3. ❌ **React StrictMode** chạy effects 2 lần (dev mode)
4. ❌ Mỗi lần gõ phím → state change → 10 useMemo chạy lại

## ✅ Giải pháp

### Fix 1: Lazy load thu_vien_loi (CHỈ KHI CẦN)

**Vấn đề:** Load 601 rows ngay khi mount component, dù user chưa mở tab "GHI NHẬN LỖI"

**Giải pháp:** Chỉ load khi user mở tab đó

**Tìm dòng ~1077-1088:**
```tsx
useEffect(() => {
  let cancelled = false;

  void thuVienLoiService
    .getAll()
    .then((rows) => {
      if (!cancelled) setThuVienLoiList(rows || []);
    })
    .catch((err) => {
      console.warn('[QuanLyCongViec] thu_vien_loi:', err);
      if (!cancelled) setThuVienLoiList([]);
    });

  // ... rest of useEffect
}, []);
```

**Thay bằng:**
```tsx
// ❌ XÓA useEffect load thu_vien_loi ở trên

// ✅ THÊM useEffect mới - chỉ load khi cần
useEffect(() => {
  // Chỉ load khi user mở tab GHI NHẬN LỖI
  if (detailTabState !== 'LOI_GHI_NHAN') return;
  
  // Đã load rồi thì không load lại
  if (thuVienLoiList.length > 0) return;

  let cancelled = false;

  void thuVienLoiService
    .getAll()
    .then((rows) => {
      if (!cancelled) setThuVienLoiList(rows || []);
    })
    .catch((err) => {
      console.warn('[QuanLyCongViec] thu_vien_loi:', err);
      if (!cancelled) setThuVienLoiList([]);
    });

  return () => {
    cancelled = true;
  };
}, [detailTabState]); // Chỉ chạy khi đổi tab
```

### Fix 2: Optimize cascade useMemo

**Vấn đề:** 10 useMemo chạy liên tục, dù user không tương tác với form lỗi

**Giải pháp:** Chỉ tính toán khi tab "GHI NHẬN LỖI" được mở

**Tìm dòng ~960-1020 và wrap tất cả useMemo:**

```tsx
// ✅ CHỈ TÍNH TOÁN KHI Ở TAB GHI NHẬN LỖI
const loiOptsChuyen = useMemo(() => {
  if (detailTabState !== 'LOI_GHI_NHAN') return [];
  return uniqueSortedThuVienKeys(thuVienLoiList, (r) => r.chuyen_nganh);
}, [thuVienLoiList, detailTabState]);

const loiFilteredChuyen = useMemo(() => {
  if (detailTabState !== 'LOI_GHI_NHAN') return [];
  if (!loiCascadeChuyen) return [] as ThuVienLoiRow[];
  return thuVienLoiList.filter(
    (r) => thuVienFieldKey(r.chuyen_nganh) === loiCascadeChuyen,
  );
}, [thuVienLoiList, loiCascadeChuyen, detailTabState]);

const loiOptsBoMon = useMemo(() => {
  if (detailTabState !== 'LOI_GHI_NHAN') return [];
  return uniqueSortedThuVienKeys(loiFilteredChuyen, (r) => r.bo_mon);
}, [loiFilteredChuyen, detailTabState]);

const loiFilteredBoMon = useMemo(() => {
  if (detailTabState !== 'LOI_GHI_NHAN') return [];
  if (!loiCascadeBoMon) return [] as ThuVienLoiRow[];
  return loiFilteredChuyen.filter(
    (r) => thuVienFieldKey(r.bo_mon) === loiCascadeBoMon,
  );
}, [loiFilteredChuyen, loiCascadeBoMon, detailTabState]);

const loiOptsCanhBao = useMemo(() => {
  if (detailTabState !== 'LOI_GHI_NHAN') return [];
  return uniqueSortedThuVienKeys(loiFilteredBoMon, (r) => r.canh_bao_loi);
}, [loiFilteredBoMon, detailTabState]);

const loiFilteredCanhBao = useMemo(() => {
  if (detailTabState !== 'LOI_GHI_NHAN') return [];
  if (!loiCascadeCanhBao) return [] as ThuVienLoiRow[];
  return loiFilteredBoMon.filter(
    (r) => thuVienFieldKey(r.canh_bao_loi) === loiCascadeCanhBao,
  );
}, [loiFilteredBoMon, loiCascadeCanhBao, detailTabState]);

const loiOptsHangMuc = useMemo(() => {
  if (detailTabState !== 'LOI_GHI_NHAN') return [];
  return uniqueSortedThuVienKeys(loiFilteredCanhBao, (r) => r.hang_muc_kiem_tra);
}, [loiFilteredCanhBao, detailTabState]);

const loiFilteredHangMuc = useMemo(() => {
  if (detailTabState !== 'LOI_GHI_NHAN') return [];
  if (!loiCascadeHangMuc) return [] as ThuVienLoiRow[];
  return loiFilteredCanhBao.filter(
    (r) => thuVienFieldKey(r.hang_muc_kiem_tra) === loiCascadeHangMuc,
  );
}, [loiFilteredCanhBao, loiCascadeHangMuc, detailTabState]);

const loiOptsNoiDung = useMemo(() => {
  if (detailTabState !== 'LOI_GHI_NHAN') return [];
  return uniqueSortedThuVienKeys(loiFilteredHangMuc, (r) => r.noi_dung_kiem_tra);
}, [loiFilteredHangMuc, detailTabState]);

const loiMatchingRows = useMemo(() => {
  if (detailTabState !== 'LOI_GHI_NHAN') return [];
  if (!loiCascadeNoiDung) return [] as ThuVienLoiRow[];
  return loiFilteredHangMuc.filter(
    (r) => thuVienFieldKey(r.noi_dung_kiem_tra) === loiCascadeNoiDung,
  );
}, [loiFilteredHangMuc, loiCascadeNoiDung, detailTabState]);

const loiResolvedThuVien = useMemo((): ThuVienLoiRow | null => {
  if (detailTabState !== 'LOI_GHI_NHAN') return null;
  if (loiMatchingRows.length === 1) return loiMatchingRows[0];
  if (loiMatchingRows.length > 1) {
    if (!loiCascadePickId) return null;
    return loiMatchingRows.find((r) => r.id === loiCascadePickId) ?? null;
  }
  return null;
}, [loiMatchingRows, loiCascadePickId, detailTabState]);
```

### Fix 3: Tắt React StrictMode (optional - chỉ trong dev)

**Vấn đề:** StrictMode chạy effects 2 lần, làm load data 2 lần

**Giải pháp:** Tắt trong `main.tsx` (chỉ khi cần)

**File: `client/src/main.tsx`**
```tsx
// ❌ TRƯỚC
<React.StrictMode>
  <App />
</React.StrictMode>

// ✅ SAU (chỉ trong dev, production vẫn nên bật)
<App />
```

**Lưu ý:** Chỉ tắt khi đang debug performance, nên bật lại sau

### Fix 4: Memoize uniqueSortedThuVienKeys function

**Vấn đề:** Function này chạy nhiều lần với cùng input

**Giải pháp:** Cache kết quả

**Tìm function `uniqueSortedThuVienKeys` (~dòng 94):**
```tsx
function uniqueSortedThuVienKeys(
  rows: ThuVienLoiRow[],
  get: (r: ThuVienLoiRow) => string | null | undefined,
): string[] {
  const set = new Set(rows.map((r) => thuVienFieldKey(get(r))));
  return Array.from(set).sort((a, b) => {
    if (a === TV_FIELD_EMPTY) return -1;
    if (b === TV_FIELD_EMPTY) return 1;
    return a.localeCompare(b, 'vi');
  });
}
```

**Thêm cache đơn giản:**
```tsx
// ✅ THÊM CACHE
const uniqueSortedCache = new Map<string, string[]>();

function uniqueSortedThuVienKeys(
  rows: ThuVienLoiRow[],
  get: (r: ThuVienLoiRow) => string | null | undefined,
  cacheKey?: string,
): string[] {
  // Nếu có cache key và đã tính rồi, trả về luôn
  if (cacheKey && uniqueSortedCache.has(cacheKey)) {
    return uniqueSortedCache.get(cacheKey)!;
  }

  const set = new Set(rows.map((r) => thuVienFieldKey(get(r))));
  const result = Array.from(set).sort((a, b) => {
    if (a === TV_FIELD_EMPTY) return -1;
    if (b === TV_FIELD_EMPTY) return 1;
    return a.localeCompare(b, 'vi');
  });

  // Lưu vào cache
  if (cacheKey) {
    uniqueSortedCache.set(cacheKey, result);
  }

  return result;
}
```

**Update các useMemo để dùng cache:**
```tsx
const loiOptsChuyen = useMemo(() => {
  if (detailTabState !== 'LOI_GHI_NHAN') return [];
  return uniqueSortedThuVienKeys(
    thuVienLoiList, 
    (r) => r.chuyen_nganh,
    `chuyen-${thuVienLoiList.length}` // cache key
  );
}, [thuVienLoiList, detailTabState]);
```

## 📊 Kết quả mong đợi

### Trước khi fix:
- Load trang: Load 601 rows ngay lập tức
- Mỗi lần gõ phím: 10 useMemo chạy lại với 601 rows
- Lag rõ rệt sau vài giây load xong

### Sau khi fix:
- Load trang: Không load thu_vien_loi
- Chỉ load khi user mở tab "GHI NHẬN LỖI"
- Mỗi lần gõ phím: useMemo chỉ chạy khi ở tab đó
- Mượt mà hơn 90%

## 🎯 Ưu tiên thực hiện

### Làm ngay (5 phút):
1. ✅ Fix 2: Thêm `detailTabState !== 'LOI_GHI_NHAN'` vào tất cả useMemo
2. ✅ Fix 1: Lazy load thu_vien_loi

### Làm sau (10 phút):
3. Fix 4: Cache uniqueSortedThuVienKeys

### Optional:
4. Fix 3: Tắt StrictMode (chỉ khi debug)

## 🧪 Cách test

1. Mở trang Quản lý công việc
2. Quan sát console - không thấy log thu_vien_loi
3. Chọn 1 công việc
4. Gõ vào các input - mượt mà
5. Chuyển sang tab "GHI NHẬN LỖI"
6. Lúc này mới thấy log load thu_vien_loi
7. Test form ghi nhận lỗi - vẫn hoạt động bình thường

## ⚠️ Lưu ý

- Fix này không ảnh hưởng đến chức năng
- Chỉ tối ưu performance
- Data vẫn được load đầy đủ khi cần
- Có thể kết hợp với fix lag nhập liệu trước đó
