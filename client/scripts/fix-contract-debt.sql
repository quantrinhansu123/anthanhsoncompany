-- Script kiểm tra và sửa công nợ hợp đồng
-- Chạy script này trong Supabase SQL Editor để kiểm tra và sửa dữ liệu

-- ============================================
-- BƯỚC 1: KIỂM TRA CÁC HỢP ĐỒNG CÓ VẤN ĐỀ
-- ============================================

-- Xem các hợp đồng có công nợ âm (dấu hiệu giá trị quyết toán bị sai)
SELECT 
    hd.id,
    hd.so_hop_dong,
    hd.project_name,
    hd.gia_tri_qt as "Giá trị QT (DB)",
    COALESCE(SUM(tc.so_tien), 0) as "Đã thu (Phiếu thu)",
    hd.gia_tri_qt - COALESCE(SUM(tc.so_tien), 0) as "Công nợ tính toán",
    hd.con_phai_thu as "Công nợ (DB)"
FROM hop_dong hd
LEFT JOIN thu_chi tc ON tc.hop_dong_id = hd.id AND tc.loai_phieu = 'Phiếu thu'
GROUP BY hd.id, hd.so_hop_dong, hd.project_name, hd.gia_tri_qt, hd.con_phai_thu
HAVING (hd.gia_tri_qt - COALESCE(SUM(tc.so_tien), 0)) < 0
ORDER BY hd.so_hop_dong;

-- ============================================
-- BƯỚC 2: CẬP NHẬT CÔNG NỢ TỰ ĐỘNG
-- ============================================

-- Cập nhật lại cột con_phai_thu dựa trên tổng phiếu thu thực tế
-- CẢNH BÁO: Chỉ chạy sau khi đã kiểm tra và backup dữ liệu!

-- Uncomment dòng dưới để chạy update (xóa dấu -- ở đầu dòng)
/*
UPDATE hop_dong hd
SET 
    con_phai_thu = GREATEST(0, hd.gia_tri_qt - COALESCE(thu_summary.total_thu, 0)),
    updated_at = NOW()
FROM (
    SELECT 
        hop_dong_id,
        SUM(so_tien) as total_thu
    FROM thu_chi
    WHERE loai_phieu = 'Phiếu thu'
    GROUP BY hop_dong_id
) thu_summary
WHERE hd.id = thu_summary.hop_dong_id;
*/

-- ============================================
-- BƯỚC 3: KIỂM TRA SAU KHI SỬA
-- ============================================

-- Xem lại các hợp đồng sau khi cập nhật
SELECT 
    hd.id,
    hd.so_hop_dong,
    hd.project_name,
    hd.gia_tri_qt as "Giá trị QT",
    COALESCE(SUM(tc.so_tien), 0) as "Đã thu",
    hd.con_phai_thu as "Công nợ",
    CASE 
        WHEN hd.con_phai_thu = GREATEST(0, hd.gia_tri_qt - COALESCE(SUM(tc.so_tien), 0)) 
        THEN '✓ Đúng'
        ELSE '✗ Sai'
    END as "Trạng thái"
FROM hop_dong hd
LEFT JOIN thu_chi tc ON tc.hop_dong_id = hd.id AND tc.loai_phieu = 'Phiếu thu'
GROUP BY hd.id, hd.so_hop_dong, hd.project_name, hd.gia_tri_qt, hd.con_phai_thu
ORDER BY hd.so_hop_dong;

-- ============================================
-- BƯỚC 4: TÌM HỢP ĐỒNG TRÙNG SỐ (CẦN MERGE)
-- ============================================

-- Tìm các hợp đồng có cùng số HĐ (có thể cần merge)
SELECT 
    so_hop_dong,
    COUNT(*) as "Số lượng",
    STRING_AGG(id::text, ', ') as "Danh sách ID",
    SUM(gia_tri_qt) as "Tổng giá trị QT"
FROM hop_dong
WHERE so_hop_dong IS NOT NULL AND so_hop_dong != ''
GROUP BY so_hop_dong
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

-- ============================================
-- HƯỚNG DẪN SỬ DỤNG
-- ============================================

/*
1. KIỂM TRA:
   - Chạy BƯỚC 1 để xem các hợp đồng có vấn đề
   - Nếu có hợp đồng công nợ âm → giá trị quyết toán bị sai

2. BACKUP:
   - Export dữ liệu bảng hop_dong ra CSV trước khi sửa
   - Hoặc tạo bản sao: CREATE TABLE hop_dong_backup AS SELECT * FROM hop_dong;

3. SỬA CÔNG NỢ:
   - Uncomment câu UPDATE ở BƯỚC 2
   - Chạy để cập nhật công nợ dựa trên phiếu thu thực tế
   - LƯU Ý: Chỉ sửa cột con_phai_thu, KHÔNG sửa gia_tri_qt

4. KIỂM TRA LẠI:
   - Chạy BƯỚC 3 để xem kết quả
   - Tất cả phải có trạng thái "✓ Đúng"

5. XỬ LÝ HỢP ĐỒNG TRÙNG:
   - Chạy BƯỚC 4 để tìm hợp đồng trùng số
   - Nếu có: cần merge thủ công hoặc sửa số HĐ

LƯU Ý QUAN TRỌNG:
- Script này CHỈ sửa cột con_phai_thu (công nợ)
- KHÔNG sửa gia_tri_qt (giá trị quyết toán)
- Nếu gia_tri_qt sai, cần:
  + Sửa thủ công qua UI
  + Hoặc import lại với code mới (đã fix)
*/
