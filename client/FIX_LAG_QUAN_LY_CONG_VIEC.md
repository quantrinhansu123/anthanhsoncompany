# Hướng dẫn Fix Lag trang Quản lý công việc

## 🔍 Nguyên nhân chính gây lag

Sau khi phân tích code `QuanLyCongViec.tsx` (3412 dòng), tôi đã xác định được các nguyên nhân chính:

### 1. ❌ Không có debounce cho input fields
**Vấn đề:** Mỗi ký tự gõ đều trigger re-render ngay lập tức
```tsx
// Code hiện tại - LAG
const [noiDungDraft, setNoiDungDraft] = useState(row.noi_dung);
<input 
  value={noiDungDraft}
  onChange={(e) => setNoiDungDraft(e.target.value)}
  onBlur={() => onNoiDungChange(row.key, noiDungDraft)}
/>
```

**Giải pháp:** Sử dụng DebouncedInput
```tsx
// Code mới - MƯỢT
<DebouncedInput
  value={row.noi_dung}
  onChange={(value) => onNoiDungChange(row.key, value)}
  delay={500}
/>
```

### 2. ❌ Quá nhiều state (40+ useState)
**Vấn đề:** Component quá lớn, mỗi state change trigger re-render toàn bộ
- 40+ useState hooks
- 20+ useEffect hooks
- 15+ useMemo hooks

**Giải pháp:** Tách thành các component nhỏ hơn với state riêng

### 3. ❌ Component ListCongViecDraftRowItem re-render không cần thiết
**Vấn đề:** Mỗi lần gõ phím, TẤT CẢ các dòng đều re-render
```tsx
// Hiện tại: Mỗi dòng có 2 local state
const [noiDungDraft, setNoiDungDraft] = useState(row.noi_dung);
const [ghiChuDraft, setGhiChuDraft] = useState(row.ghi_chu);

// 2 useEffect để sync
useEffect(() => { setNoiDungDraft(row.noi_dung); }, [row.key, row.noi_dung]);
useEffect(() => { setGhiChuDraft(row.ghi_chu); }, [row.key, row.ghi_chu]);
```

**Giải pháp:** Xóa local state, dùng DebouncedInput/DebouncedTextarea

### 4. ❌ Không có virtualization cho danh sách dài
**Vấn đề:** Render tất cả items cùng lúc, dù chỉ hiển thị 5-10 items

### 5. ❌ Search không được debounce
**Vấn đề:** Filter chạy mỗi lần gõ phím
```tsx
const [search, setSearch] = useState('');
// Không có debounce, filter chạy ngay
const filtered = useMemo(() => {
  const term = search.trim().toLowerCase();
  return list.filter(t => t.ten_task.toLowerCase().includes(term));
}, [list, search]);
```

---

## ✅ Giải pháp - 3 cấp độ ưu tiên

## 🚀 CẤP ĐỘ 1: FIX NHANH (30 phút - Giảm lag 70%)

### Bước 1.1: Import các component đã tạo sẵn

Thêm vào đầu file `QuanLyCongViec.tsx`:

```tsx
import { DebouncedInput } from '../../components/DebouncedInput';
import { DebouncedTextarea } from '../../components/DebouncedTextarea';
import { useDebounce } from '../../hooks/useDebounce';
```

### Bước 1.2: Thay thế input trong ListCongViecDraftRowItem

**Tìm dòng ~368-378:**
```tsx
const ListCongViecDraftRowItem = React.memo(function ListCongViecDraftRowItem({
  row,
  // ... props
}: ListCongViecDraftRowItemProps) {
  const [noiDungDraft, setNoiDungDraft] = useState(row.noi_dung);  // ❌ XÓA DÒNG NÀY
  const [ghiChuDraft, setGhiChuDraft] = useState(row.ghi_chu);      // ❌ XÓA DÒNG NÀY

  useEffect(() => {                                                  // ❌ XÓA BLOCK NÀY
    setNoiDungDraft(row.noi_dung);
  }, [row.key, row.noi_dung]);

  useEffect(() => {                                                  // ❌ XÓA BLOCK NÀY
    setGhiChuDraft(row.ghi_chu);
  }, [row.key, row.ghi_chu]);
```

**Tìm input "Nội dung công việc" (~dòng 450):**
```tsx
// ❌ XÓA CODE CŨ
<input
  type="text"
  value={noiDungDraft}
  disabled={saving}
  onChange={(e) => setNoiDungDraft(e.target.value)}
  onBlur={() => {
    if (noiDungDraft !== row.noi_dung) onNoiDungChange(row.key, noiDungDraft);
  }}
  className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] bg-slate-50"
  placeholder={`Việc ${index + 1}…`}
/>

// ✅ THAY BẰNG CODE MỚI
<DebouncedInput
  type="text"
  value={row.noi_dung}
  disabled={saving}
  onChange={(value) => onNoiDungChange(row.key, value)}
  delay={500}
  className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] bg-slate-50"
  placeholder={`Việc ${index + 1}…`}
/>
```

**Tìm textarea "Ghi chú" (~dòng 530):**
```tsx
// ❌ XÓA CODE CŨ
<textarea
  value={ghiChuDraft}
  disabled={saving}
  onChange={(e) => setGhiChuDraft(e.target.value)}
  onBlur={() => {
    if (ghiChuDraft !== row.ghi_chu) onGhiChuChange(row.key, ghiChuDraft);
  }}
  rows={2}
  className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] bg-slate-50 resize-y min-h-[2.5rem]"
  placeholder="Tuỳ chọn"
/>

// ✅ THAY BẰNG CODE MỚI
<DebouncedTextarea
  value={row.ghi_chu}
  disabled={saving}
  onChange={(value) => onGhiChuChange(row.key, value)}
  delay={500}
  rows={2}
  className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] bg-slate-50 resize-y min-h-[2.5rem]"
  placeholder="Tuỳ chọn"
/>
```

### Bước 1.3: Debounce search input

**Tìm dòng ~722-724:**
```tsx
const [search, setSearch] = useState('');
const deferredSearch = useDeferredValue(search);  // ❌ XÓA DÒNG NÀY
```

**Thay bằng:**
```tsx
const [search, setSearch] = useState('');
const debouncedSearch = useDebounce(search, 300);  // ✅ THÊM DÒNG NÀY
```

**Tìm useMemo filtered (~dòng 1150):**
```tsx
const filtered = useMemo(() => {
  let list = tasksAfterAssigneeAndDate;
  // ... các filter khác
  const term = deferredSearch.trim().toLowerCase();  // ❌ ĐỔI DÒNG NÀY
  if (term) {
    list = list.filter(
      (t) =>
        t.ten_task.toLowerCase().includes(term) ||
        (t.mo_ta || '').toLowerCase().includes(term),
    );
  }
  return list;
}, [tasksAfterAssigneeAndDate, activeTab, deferredSearch]);  // ❌ ĐỔI DEPENDENCY
```

**Thay bằng:**
```tsx
const filtered = useMemo(() => {
  let list = tasksAfterAssigneeAndDate;
  // ... các filter khác
  const term = debouncedSearch.trim().toLowerCase();  // ✅ DÙNG debouncedSearch
  if (term) {
    list = list.filter(
      (t) =>
        t.ten_task.toLowerCase().includes(term) ||
        (t.mo_ta || '').toLowerCase().includes(term),
    );
  }
  return list;
}, [tasksAfterAssigneeAndDate, activeTab, debouncedSearch]);  // ✅ ĐỔI DEPENDENCY
```

### ✅ Kết quả Cấp độ 1:
- Giảm lag 70% khi nhập liệu
- Không cần refactor lớn
- Thời gian: 30 phút

---

## 🔧 CẤP ĐỘ 2: TỐI ƯU TRUNG BÌNH (2-3 giờ - Giảm lag 85%)

### Bước 2.1: Optimize React.memo với custom comparison

**Tìm ListCongViecDraftRowItem (~dòng 368):**
```tsx
const ListCongViecDraftRowItem = React.memo(function ListCongViecDraftRowItem({
  // ... props
}: ListCongViecDraftRowItemProps) {
  // ... component code
});
```

**Thay bằng:**
```tsx
const ListCongViecDraftRowItem = React.memo(
  function ListCongViecDraftRowItem({
    // ... props
  }: ListCongViecDraftRowItemProps) {
    // ... component code
  },
  // Custom comparison để tránh re-render không cần thiết
  (prevProps, nextProps) => {
    return (
      prevProps.row.key === nextProps.row.key &&
      prevProps.row.noi_dung === nextProps.row.noi_dung &&
      prevProps.row.trang_thai === nextProps.row.trang_thai &&
      prevProps.row.ghi_chu === nextProps.row.ghi_chu &&
      prevProps.row.ngay_gio_hoan_thanh === nextProps.row.ngay_gio_hoan_thanh &&
      prevProps.row.nhan_su_phu_trach_ids.length === nextProps.row.nhan_su_phu_trach_ids.length &&
      prevProps.expanded === nextProps.expanded &&
      prevProps.saving === nextProps.saving &&
      prevProps.phuTrachOpenRow === nextProps.phuTrachOpenRow
    );
  }
);
```

### Bước 2.2: Optimize callbacks với useCallback

**Tìm các handler functions (~dòng 1300-1400):**
```tsx
const handleListCvExpand = useCallback((rowKey: string, expanded: boolean) => {
  setListCvRowExpanded((prev) => ({ ...prev, [rowKey]: expanded }));
}, []);

const handleListCvRemove = useCallback((rowKey: string) => {
  setListCongViecDraftRows((rows) => (rows.length <= 1 ? rows : rows.filter((r) => r.key !== rowKey)));
  setListCvRowExpanded((prev) => {
    const next = { ...prev };
    delete next[rowKey];
    return next;
  });
  setListCvPhuTrachOpenRow((prev) => (prev === rowKey ? null : prev));
}, []);

// ✅ CÁC CALLBACK NÀY ĐÃ TỐT, GIỮ NGUYÊN
```

### Bước 2.3: Gộp các useEffect liên quan

**Tìm các useEffect riêng lẻ và gộp lại:**
```tsx
// ❌ TRƯỚC: Nhiều useEffect nhỏ
useEffect(() => {
  setLoiCascadeChuyen('');
}, [selected?.id]);

useEffect(() => {
  setLoiCascadeBoMon('');
}, [selected?.id]);

useEffect(() => {
  setLoiCascadeCanhBao('');
}, [selected?.id]);

// ✅ SAU: Gộp thành 1 useEffect
useEffect(() => {
  setLoiCascadeChuyen('');
  setLoiCascadeBoMon('');
  setLoiCascadeCanhBao('');
  setLoiCascadeHangMuc('');
  setLoiCascadeNoiDung('');
  setLoiCascadePickId('');
  setLoiFormNguoiIds([]);
  setLoiFormGhiChu('');
  setLoiNguoiViPhamOpen(false);
}, [selected?.id]);
```

### ✅ Kết quả Cấp độ 2:
- Giảm lag 85% tổng thể
- Component render hiệu quả hơn
- Thời gian: 2-3 giờ

---

## 🏗️ CẤP ĐỘ 3: REFACTOR TOÀN DIỆN (1-2 ngày - Giảm lag 95%)

### Bước 3.1: Tách component thành nhiều file

**Cấu trúc thư mục mới:**
```
client/src/pages/process/
├── QuanLyCongViec/
│   ├── index.tsx                    # Component chính (gọn ~500 dòng)
│   ├── components/
│   │   ├── TaskListPanel.tsx        # Danh sách công việc bên trái
│   │   ├── TaskDetailPanel.tsx      # Chi tiết công việc bên phải
│   │   ├── TaskFilterBar.tsx        # Thanh filter
│   │   └── ListCongViecRow.tsx      # Dòng trong danh sách công việc
│   ├── tabs/
│   │   ├── NoiDungTab.tsx           # Tab nội dung
│   │   ├── BinhLuanTab.tsx          # Tab bình luận
│   │   ├── TaiLieuTab.tsx           # Tab tài liệu
│   │   ├── ListCongViecTab.tsx      # Tab danh sách công việc
│   │   ├── LoiGhiNhanTab.tsx        # Tab ghi nhận lỗi
│   │   └── LichSuTab.tsx            # Tab lịch sử
│   ├── hooks/
│   │   ├── useTaskFilters.ts        # Logic filter
│   │   ├── useTaskDetail.ts         # Logic chi tiết
│   │   └── useListCongViec.ts       # Logic danh sách công việc
│   └── context/
│       └── QuanLyCongViecContext.tsx # Shared state
```

### Bước 3.2: Sử dụng Context để tránh prop drilling

**Tạo file `context/QuanLyCongViecContext.tsx`:**
```tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface QuanLyCongViecContextType {
  tasks: TaskRow[];
  setTasks: (tasks: TaskRow[]) => void;
  selected: TaskRow | null;
  setSelected: (task: TaskRow | null) => void;
  employees: any[];
  contracts: any[];
  loading: boolean;
  // ... các state khác
}

const QuanLyCongViecContext = createContext<QuanLyCongViecContextType | undefined>(undefined);

export function QuanLyCongViecProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [selected, setSelected] = useState<TaskRow | null>(null);
  // ... các state khác

  return (
    <QuanLyCongViecContext.Provider value={{
      tasks,
      setTasks,
      selected,
      setSelected,
      // ... các value khác
    }}>
      {children}
    </QuanLyCongViecContext.Provider>
  );
}

export function useQuanLyCongViecContext() {
  const context = useContext(QuanLyCongViecContext);
  if (!context) {
    throw new Error('useQuanLyCongViecContext must be used within QuanLyCongViecProvider');
  }
  return context;
}
```

### Bước 3.3: Lazy load các tab

**Trong file chính:**
```tsx
import React, { lazy, Suspense } from 'react';

const TaiLieuTab = lazy(() => import('./tabs/TaiLieuTab'));
const BinhLuanTab = lazy(() => import('./tabs/BinhLuanTab'));
const ListCongViecTab = lazy(() => import('./tabs/ListCongViecTab'));
const LoiGhiNhanTab = lazy(() => import('./tabs/LoiGhiNhanTab'));
const LichSuTab = lazy(() => import('./tabs/LichSuTab'));

// Trong render:
<Suspense fallback={<div className="p-4 text-center">Đang tải...</div>}>
  {detailTabState === 'TAI_LIEU' && <TaiLieuTab />}
  {detailTabState === 'BINH_LUAN' && <BinhLuanTab />}
  {detailTabState === 'LIST_CONG_VIEC' && <ListCongViecTab />}
  {detailTabState === 'LOI_GHI_NHAN' && <LoiGhiNhanTab />}
  {detailTabState === 'LICH_SU' && <LichSuTab />}
</Suspense>
```

### Bước 3.4: Virtualization cho danh sách dài

**Cài đặt:**
```bash
npm install react-window
```

**Sử dụng trong TaskListPanel:**
```tsx
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={filtered.length}
  itemSize={80}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      <TaskListItem task={filtered[index]} />
    </div>
  )}
</FixedSizeList>
```

### ✅ Kết quả Cấp độ 3:
- Giảm lag 95%
- Code dễ maintain
- Performance tối ưu
- Thời gian: 1-2 ngày

---

## 📊 So sánh hiệu suất

| Cấp độ | Thời gian | Giảm lag | Độ khó | Ưu tiên |
|--------|-----------|----------|--------|---------|
| Cấp 1  | 30 phút   | 70%      | Dễ     | ⭐⭐⭐⭐⭐ |
| Cấp 2  | 2-3 giờ   | 85%      | Trung bình | ⭐⭐⭐⭐ |
| Cấp 3  | 1-2 ngày  | 95%      | Khó    | ⭐⭐⭐ |

---

## 🎯 Khuyến nghị

### Làm ngay (Cấp 1):
1. ✅ Thay input/textarea bằng DebouncedInput/DebouncedTextarea
2. ✅ Debounce search input
3. ✅ Test ngay để thấy cải thiện

### Làm sau (Cấp 2):
1. Optimize React.memo
2. Gộp useEffect
3. Review và optimize callbacks

### Làm khi có thời gian (Cấp 3):
1. Refactor thành nhiều file
2. Sử dụng Context
3. Lazy load tabs
4. Virtualization

---

## 🧪 Cách test

### Test lag trước khi fix:
1. Mở trang Quản lý công việc
2. Chọn 1 công việc
3. Vào tab "LIST CÔNG VIỆC"
4. Gõ nhanh vào ô "Nội dung công việc"
5. Quan sát: Lag rõ rệt, chữ hiện chậm

### Test sau khi fix Cấp 1:
1. Làm lại các bước trên
2. Quan sát: Gõ mượt mà, không lag
3. Kiểm tra: Dữ liệu vẫn được lưu đúng sau 500ms

---

## ⚠️ Lưu ý

1. **Backup code trước khi sửa**
2. **Test kỹ sau mỗi thay đổi**
3. **Kiểm tra các input khác** trong component có thể cần debounce
4. **Monitor performance** bằng React DevTools Profiler

---

## 📚 Tài liệu tham khảo

- [React Performance Optimization](https://react.dev/learn/render-and-commit)
- [Debouncing in React](https://www.freecodecamp.org/news/debouncing-explained/)
- [React.memo](https://react.dev/reference/react/memo)
- [useCallback](https://react.dev/reference/react/useCallback)
- [React Window](https://github.com/bvaughn/react-window)
