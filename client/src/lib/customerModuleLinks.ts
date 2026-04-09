/**
 * Tham số query thống nhất giữa Khách hàng / Dự án / Hợp đồng / Thu chi.
 * - customerId: id khách hàng (bảng khách hàng)
 * - duAnId: id dự án
 * - hopDongId: id hợp đồng dùng trong UI (khớp uuid hợp đồng / thu_chi.hop_dong_id)
 * - project: tên dự án (lọc theo tên, tương thích URL cũ)
 */
export type CustomerModuleScope = {
    customerId?: string | null;
    duAnId?: string | null;
    hopDongId?: string | null;
    project?: string | null;
};

function scopeToSearchParams(scope: CustomerModuleScope): URLSearchParams {
    const p = new URLSearchParams();
    if (scope.customerId) p.set('customerId', scope.customerId);
    if (scope.duAnId) p.set('duAnId', scope.duAnId);
    if (scope.hopDongId) p.set('hopDongId', scope.hopDongId);
    if (scope.project) p.set('project', scope.project);
    return p;
}

export function customerModuleQuery(scope: CustomerModuleScope): string {
    const p = scopeToSearchParams(scope);
    const s = p.toString();
    return s ? `?${s}` : '';
}

export function thuChiPath(scope: CustomerModuleScope = {}): string {
    return `/tai-chinh/thu-chi${customerModuleQuery(scope)}`;
}

export function duAnPath(scope: CustomerModuleScope = {}): string {
    return `/khach-hang/du-an${customerModuleQuery(scope)}`;
}

export function hopDongPath(scope: CustomerModuleScope = {}, extraParams?: Record<string, string>): string {
    const p = scopeToSearchParams(scope);
    if (extraParams) {
        Object.entries(extraParams).forEach(([k, v]) => {
            if (v) p.set(k, v);
        });
    }
    const s = p.toString();
    return `/khach-hang/hop-dong${s ? `?${s}` : ''}`;
}
