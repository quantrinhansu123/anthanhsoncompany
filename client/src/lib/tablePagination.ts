export const PAGE_SIZE_OPTIONS = [20, 50, 100, 200, 300, 400, 500] as const;

export function buildVisiblePages(currentPage: number, totalPages: number): Array<number | 'ellipsis'> {
    if (totalPages <= 0) return [];
    if (totalPages <= 13) {
        return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const pages = new Set<number>([1, totalPages]);
    for (let delta = -4; delta <= 4; delta++) {
        pages.add(currentPage + delta);
    }
    const sorted = [...pages].filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b);
    const result: Array<number | 'ellipsis'> = [];

    for (let index = 0; index < sorted.length; index++) {
        if (index > 0 && sorted[index] - sorted[index - 1] > 1) {
            result.push('ellipsis');
        }
        result.push(sorted[index]);
    }

    return result;
}
