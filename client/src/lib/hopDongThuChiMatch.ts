import type { ThuChiRow } from './services/thuChiService';
import type { ContractRow } from './services/contractService';
import { cleanString, normalizeKey } from './excelTableTools';
import {
    isLegacyChuDauTuThanhToanLabel,
    normalizeTinhTrangPhieuInput,
    resolveThuChiTinhTrangDisplay,
    tinhTrangThuCdtLabel,
} from './thuChiTinhTrang';

export type ThuChiHopDongAmountMaps = {
    byHopDongId: Map<string, number>;
    /** Dự án + Số HĐ (không dùng tên gói thầu). */
    bySoDuAn: Map<string, number>;
    /** Dự án + tên gói thầu — khi phiếu Thu chi không gắn Số HĐ / hop_dong_id. */
    byDuAnGoiThau: Map<string, number>;
};

function isPhieuThuLoai(loai: string | null | undefined): boolean {
    const n = String(loai ?? '')
        .trim()
        .normalize('NFC')
        .toLowerCase();
    return n === 'phiếu thu' || n === 'phieu thu';
}

/** Phiếu thu — cột Tình trạng CĐT (không loại vì thêm «Có hóa đơn» trên HĐ). */
export function isThuChiCdtTinhTrangRow(
    tc: ThuChiRow,
    cdtLabel: 'CĐT thanh toán' | 'CĐT tạm ứng',
    canonical: 'Thanh toán' | 'Tạm ứng',
): boolean {
    if (!isPhieuThuLoai(tc.loai_phieu)) return false;

    if (normalizeTinhTrangPhieuInput(tc.tinh_trang_phieu) === canonical) return true;
    if (normalizeTinhTrangPhieuInput(tc.hang_muc_thu) === canonical) return true;
    if (canonical === 'Thanh toán') {
        if (
            isLegacyChuDauTuThanhToanLabel(tc.tinh_trang_phieu) ||
            isLegacyChuDauTuThanhToanLabel(tc.hang_muc_thu)
        ) {
            return true;
        }
    }

    const tinhTrang = resolveThuChiTinhTrangDisplay(tc);
    if (tinhTrang === 'Xuất hóa đơn') return false;
    if (tinhTrangThuCdtLabel(tinhTrang) === cdtLabel) return true;

    const nd = normalizeKey(tc.noi_dung || '');
    const needle = canonical === 'Thanh toán' ? 'cdt thanh toan' : 'cdt tam ung';
    return nd.includes(needle);
}

export function isThuChiCdtThanhToanRow(tc: ThuChiRow): boolean {
    return isThuChiCdtTinhTrangRow(tc, 'CĐT thanh toán', 'Thanh toán');
}

export function isThuChiCdtTamUngRow(tc: ThuChiRow): boolean {
    return isThuChiCdtTinhTrangRow(tc, 'CĐT tạm ứng', 'Tạm ứng');
}

function bumpMap(map: Map<string, number>, key: string, amount: number) {
    if (!key) return;
    map.set(key, (map.get(key) || 0) + amount);
}

/** Khóa trùng cột «Hợp đồng / Nội dung» trên bảng HĐ (Số HĐ + tên gói thầu — chỉ dùng khi xóa trùng). */
export function hopDongHopDongNoiDungKey(
    soHopDong: string | null | undefined,
    tenGoiThau: string | null | undefined,
): string {
    const so = normalizeSoHopDongKey(soHopDong);
    const nd = normalizeKey(cleanString(String(tenGoiThau ?? '')));
    if (!so) return '';
    return `${so}|${nd}`;
}

/** Chuẩn hóa Số HĐ khi so khớp (khoảng trắng, dấu /). */
export function normalizeSoHopDongKey(soHopDong: string | null | undefined): string {
    return normalizeKey(cleanString(String(soHopDong ?? '')))
        .replace(/\s*\/\s*/g, '/')
        .replace(/\s*-\s*/g, '-');
}

/** Mọi khóa dự án + Số HĐ có thể dùng (id và/hoặc tên dự án). */
export function hopDongSoDuAnKeys(
    duAnId: string | null | undefined,
    projectName: string | null | undefined,
    soHopDong: string | null | undefined,
): string[] {
    const so = normalizeSoHopDongKey(soHopDong);
    if (!so) return [];
    const keys: string[] = [];
    const du = String(duAnId ?? '').trim();
    const pn = normalizeKey(projectName || '');
    if (du) keys.push(`id:${du}|${so}`);
    if (pn) keys.push(`name:${pn}|${so}`);
    return [...new Set(keys)];
}

/** Khóa khớp Thu chi ↔ HĐ: dự án (id hoặc tên) + tên gói thầu. */
export function hopDongGoiThauKeys(
    duAnId: string | null | undefined,
    projectName: string | null | undefined,
    tenGoiThau: string | null | undefined,
): string[] {
    const goi = normalizeKey(cleanString(String(tenGoiThau ?? '')));
    if (!goi) return [];
    const keys: string[] = [];
    const du = String(duAnId ?? '').trim();
    const pn = normalizeKey(projectName || '');
    if (du) keys.push(`goi:id:${du}|${goi}`);
    if (pn) keys.push(`goi:name:${pn}|${goi}`);
    return [...new Set(keys)];
}

/** Khóa khớp Thu chi ↔ HĐ: dự án + Số HĐ (ưu tiên id dự án). */
export function hopDongSoDuAnKey(
    duAnId: string | null | undefined,
    projectName: string | null | undefined,
    soHopDong: string | null | undefined,
): string {
    const keys = hopDongSoDuAnKeys(duAnId, projectName, soHopDong);
    return keys[0] || '';
}

export function contractHopDongLookupIds(row: {
    hop_dong_row_id?: string | null;
    id?: string | null;
    contract_id?: string | null;
    hopDongRowId?: string | null;
    uuid?: string | null;
    contractRefId?: string | null;
}): string[] {
    return [
        ...new Set(
            [
                row.hop_dong_row_id,
                row.hopDongRowId,
                row.id,
                row.contract_id,
                row.contractRefId,
                row.uuid,
            ]
                .map((x) => String(x ?? '').trim())
                .filter(Boolean),
        ),
    ];
}

function buildContractByHopDongIdMap(contracts: ContractRow[]): Map<string, ContractRow> {
    const map = new Map<string, ContractRow>();
    for (const c of contracts) {
        for (const id of contractHopDongLookupIds(c)) {
            if (!map.has(id)) map.set(id, c);
        }
    }
    return map;
}

/** Trích Số HĐ từ nội dung phiếu (Excel / ghi chú). */
export function extractSoHopDongFromText(text: string | null | undefined): string | null {
    const raw = cleanString(String(text ?? ''));
    if (!raw) return null;

    const patterns = [
        /\d{5,6}\/VTK-ATS\/TV\s*\d{4}/i,
        /HĐTV\/ATS-[A-Z0-9]+/i,
        /HD\s*TV\/ATS-[A-Z0-9]+/i,
        /\d{5,6}\/[\w.-]+\/[\w.-]+(?:\s*\d{4})?/i,
    ];
    for (const re of patterns) {
        const m = raw.match(re);
        if (m?.[0]) return m[0].replace(/\s+/g, ' ').trim();
    }
    return null;
}

/** Index dự án + gói thầu → HĐ (một lần, tránh O(n×m) khi enrich). */
function buildContractsByGoiThauKeyIndex(contracts: ContractRow[]): Map<string, ContractRow[]> {
    const index = new Map<string, ContractRow[]>();
    for (const c of contracts) {
        for (const gk of hopDongGoiThauKeys(c.du_an_id, c.project_name, c.ten_goi_thau)) {
            const list = index.get(gk);
            if (list) list.push(c);
            else index.set(gk, [c]);
        }
    }
    return index;
}

/** Suy Số HĐ từ danh mục HĐ khi phiếu chỉ có dự án + tên gói thầu (một Số HĐ duy nhất). */
export function inferSoHopDongFromContractCatalog(
    tc: ThuChiRow,
    goiIndex: Map<string, ContractRow[]>,
): string | null {
    const matched: ContractRow[] = [];
    const seen = new Set<string>();
    for (const gk of hopDongGoiThauKeys(tc.du_an_id, tc.ten_du_an, tc.ten_goi_thau)) {
        const list = goiIndex.get(gk);
        if (!list) continue;
        for (const c of list) {
            const rid = String(c.hop_dong_row_id ?? c.id ?? c.contract_id ?? '').trim();
            if (rid && seen.has(rid)) continue;
            if (rid) seen.add(rid);
            matched.push(c);
        }
    }
    const soSet = new Set(
        matched
            .map((c) => normalizeSoHopDongKey(c.so_hop_dong))
            .filter(Boolean),
    );
    if (soSet.size !== 1) return null;
    const target = [...soSet][0];
    const hit = matched.find((c) => normalizeSoHopDongKey(c.so_hop_dong) === target);
    return hit?.so_hop_dong ? String(hit.so_hop_dong).trim() : null;
}

/** Bổ sung `so_hop_dong` / `du_an_id` / `ten_goi_thau` từ danh mục HĐ. */
export function enrichThuChiForHopDongMatch(
    rows: ThuChiRow[],
    contracts: ContractRow[],
): ThuChiRow[] {
    if (contracts.length === 0) return rows;
    const byHop = buildContractByHopDongIdMap(contracts);
    const goiIndex = buildContractsByGoiThauKeyIndex(contracts);
    return rows.map((tc) => {
        const hid = tc.hop_dong_id != null ? String(tc.hop_dong_id).trim() : '';
        const linked = hid ? byHop.get(hid) : undefined;

        let so =
            (tc.so_hop_dong && String(tc.so_hop_dong).trim()) ||
            extractSoHopDongFromText(tc.noi_dung) ||
            '';
        if (!so && linked?.so_hop_dong) so = String(linked.so_hop_dong).trim();
        if (!so) {
            const inferred = inferSoHopDongFromContractCatalog(tc, goiIndex);
            if (inferred) so = inferred;
        }

        const duAnId = tc.du_an_id || linked?.du_an_id || null;
        const tenDuAn =
            (tc.ten_du_an && String(tc.ten_du_an).trim()) ||
            (linked?.project_name && String(linked.project_name).trim()) ||
            null;
        const tenGoi =
            (tc.ten_goi_thau && String(tc.ten_goi_thau).trim()) ||
            (linked?.ten_goi_thau && String(linked.ten_goi_thau).trim()) ||
            '';

        if (
            so === (tc.so_hop_dong || '') &&
            duAnId === tc.du_an_id &&
            tenDuAn === tc.ten_du_an &&
            tenGoi === (tc.ten_goi_thau || '')
        ) {
            return tc;
        }
        return {
            ...tc,
            so_hop_dong: so || tc.so_hop_dong,
            du_an_id: duAnId,
            ten_du_an: tenDuAn,
            ten_goi_thau: tenGoi || tc.ten_goi_thau,
        };
    });
}

function bumpSoDuAnKeys(
    map: Map<string, number>,
    duAnId: string | null | undefined,
    projectName: string | null | undefined,
    soHopDong: string | null | undefined,
    amount: number,
) {
    for (const sk of hopDongSoDuAnKeys(duAnId, projectName, soHopDong)) {
        bumpMap(map, sk, amount);
    }
}

function bumpGoiThauKeys(
    map: Map<string, number>,
    duAnId: string | null | undefined,
    projectName: string | null | undefined,
    tenGoiThau: string | null | undefined,
    amount: number,
) {
    for (const key of hopDongGoiThauKeys(duAnId, projectName, tenGoiThau)) {
        bumpMap(map, key, amount);
    }
}

export function buildThuChiHopDongAmountMaps(
    rows: ThuChiRow[],
    includeRow: (tc: ThuChiRow) => boolean,
    contractsForEnrich: ContractRow[] = [],
    preEnrichedRows?: ThuChiRow[],
): ThuChiHopDongAmountMaps {
    const enriched =
        preEnrichedRows ??
        (contractsForEnrich.length > 0 ? enrichThuChiForHopDongMatch(rows, contractsForEnrich) : rows);
    const byHopDongId = new Map<string, number>();
    const bySoDuAn = new Map<string, number>();
    const byDuAnGoiThau = new Map<string, number>();

    for (const tc of enriched) {
        if (!includeRow(tc)) continue;
        const amount = Number(tc.so_tien) || 0;
        if (amount <= 0) continue;

        const hid = tc.hop_dong_id != null ? String(tc.hop_dong_id).trim() : '';
        if (hid) bumpMap(byHopDongId, hid, amount);

        bumpSoDuAnKeys(bySoDuAn, tc.du_an_id, tc.ten_du_an, tc.so_hop_dong, amount);
        bumpGoiThauKeys(byDuAnGoiThau, tc.du_an_id, tc.ten_du_an, tc.ten_goi_thau, amount);
    }

    return { byHopDongId, bySoDuAn, byDuAnGoiThau };
}

export type ThuChiSoHopDongPresence = {
    byHopDongId: Set<string>;
    bySoDuAn: Set<string>;
    /** Số HĐ chuẩn hóa — có ít nhất một phiếu Thu chi cùng Số HĐ. */
    bySoOnly: Set<string>;
    /** Dự án + tên gói thầu — khi Thu chi chưa ghi Số HĐ. */
    byDuAnGoiThau: Set<string>;
};

export const EMPTY_THU_CHI_SO_PRESENCE: ThuChiSoHopDongPresence = {
    byHopDongId: new Set(),
    bySoDuAn: new Set(),
    bySoOnly: new Set(),
    byDuAnGoiThau: new Set(),
};

export type HopDongThuChiMatchKind = 'so' | 'goi' | 'none';

/** Đánh dấu Số HĐ đã xuất hiện trên Thu chi (mọi loại phiếu). */
export function buildThuChiSoHopDongPresence(
    rows: ThuChiRow[],
    contracts: ContractRow[] = [],
    preEnrichedRows?: ThuChiRow[],
): ThuChiSoHopDongPresence {
    const enriched =
        preEnrichedRows ??
        (contracts.length > 0 ? enrichThuChiForHopDongMatch(rows, contracts) : rows);
    const byHopDongId = new Set<string>();
    const bySoDuAn = new Set<string>();
    const bySoOnly = new Set<string>();
    const byDuAnGoiThau = new Set<string>();

    for (const tc of enriched) {
        const hid = tc.hop_dong_id != null ? String(tc.hop_dong_id).trim() : '';
        if (hid) byHopDongId.add(hid);

        const so = normalizeSoHopDongKey(tc.so_hop_dong);
        if (so) bySoOnly.add(so);

        for (const sk of hopDongSoDuAnKeys(tc.du_an_id, tc.ten_du_an, tc.so_hop_dong)) {
            bySoDuAn.add(sk);
        }
        for (const gk of hopDongGoiThauKeys(tc.du_an_id, tc.ten_du_an, tc.ten_goi_thau)) {
            byDuAnGoiThau.add(gk);
        }
    }

    return { byHopDongId, bySoDuAn, bySoOnly, byDuAnGoiThau };
}

/** Có phiếu Thu chi khớp Số HĐ (hop_dong_id hoặc dự án + Số HĐ). */
export function contractHasThuChiSoHopDongMatch(
    c: ContractRow,
    presence: ThuChiSoHopDongPresence,
): boolean {
    for (const id of contractHopDongLookupIds(c)) {
        if (presence.byHopDongId.has(id)) return true;
    }

    const so = normalizeSoHopDongKey(c.so_hop_dong);
    if (!so) return false;

    for (const sk of hopDongSoDuAnKeys(c.du_an_id, c.project_name, c.so_hop_dong)) {
        if (presence.bySoDuAn.has(sk)) return true;
    }

    return presence.bySoOnly.has(so);
}

/** Mức khớp Thu chi: theo Số HĐ, hoặc theo dự án + gói thầu. */
export function contractThuChiMatchKind(
    c: ContractRow,
    presence: ThuChiSoHopDongPresence,
): HopDongThuChiMatchKind {
    if (contractHasThuChiSoHopDongMatch(c, presence)) return 'so';

    const goiSet = presence.byDuAnGoiThau;
    if (goiSet) {
        for (const gk of hopDongGoiThauKeys(c.du_an_id, c.project_name, c.ten_goi_thau)) {
            if (goiSet.has(gk)) return 'goi';
        }
    }
    return 'none';
}

export function resolveThuChiAmountForContractRow(
    c: ContractRow,
    maps: ThuChiHopDongAmountMaps,
): number {
    let fromIds = 0;
    for (const id of contractHopDongLookupIds(c)) {
        fromIds += maps.byHopDongId.get(id) || 0;
    }
    if (fromIds > 0) return fromIds;

    let fromSoDuAn = 0;
    for (const sk of hopDongSoDuAnKeys(c.du_an_id, c.project_name, c.so_hop_dong)) {
        fromSoDuAn = Math.max(fromSoDuAn, maps.bySoDuAn.get(sk) || 0);
    }
    if (fromSoDuAn > 0) return fromSoDuAn;

    const goiMap = maps.byDuAnGoiThau;
    if (!goiMap) return 0;

    let fromGoiThau = 0;
    for (const gk of hopDongGoiThauKeys(c.du_an_id, c.project_name, c.ten_goi_thau)) {
        fromGoiThau = Math.max(fromGoiThau, goiMap.get(gk) || 0);
    }
    return fromGoiThau;
}
