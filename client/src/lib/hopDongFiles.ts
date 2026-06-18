import type { ContractFile } from './services/contractService';

export const HOP_DONG_FILE_TYPES = [
  'File_BBTT',
  'File_HD',
  'File_BBNT',
  'File_PL3A',
  'File_BBTL',
  'File_PLHD',
  'File_QD',
  'File_Khac',
] as const;

export const HOP_DONG_FILE_TYPE_LABELS: Record<string, string> = {
  File_BBTT: 'Biên bản thỏa thuận',
  File_HD: 'Hợp đồng',
  File_BBNT: 'Biên bản nghiệm thu',
  File_PL3A: 'Phụ lục 3A',
  File_BBTL: 'Biên bản thanh lý',
  File_PLHD: 'Phụ lục hợp đồng',
  File_QD: 'Quyết định',
  File_Khac: 'Tài liệu khác',
};

const LABEL_TO_KEY = Object.fromEntries(
  Object.entries(HOP_DONG_FILE_TYPE_LABELS).map(([key, label]) => [label, key]),
);

export function normalizeHopDongFileType(type: string): string {
  const t = String(type || '').trim();
  if (!t) return '';
  return LABEL_TO_KEY[t] || t;
}

export function hopDongFileTypeLabel(type: string): string {
  const key = normalizeHopDongFileType(type);
  return HOP_DONG_FILE_TYPE_LABELS[key] || type || '—';
}

export function sanitizeHopDongFileName(name: string): string {
  const trimmed = String(name || '').trim();
  const normalized = trimmed.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const replaced = normalized
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  return replaced || 'file';
}

export function calculateHopDongFileStatus(files: ContractFile[]): string {
  const uploadedTypes = new Set(
    files
      .filter((f) => f.file_url && String(f.file_url).trim() !== '')
      .map((f) => normalizeHopDongFileType(f.file_type)),
  );
  const mandatoryTypes = HOP_DONG_FILE_TYPES.filter((t) => t !== 'File_QD' && t !== 'File_Khac');
  const missingFiles = mandatoryTypes.filter((type) => !uploadedTypes.has(type));
  return missingFiles.length === 0
    ? 'Đầy đủ file'
    : `Thiếu: ${missingFiles.map((t) => HOP_DONG_FILE_TYPE_LABELS[t] || t).join(', ')}`;
}

export function resolveHopDongFileTypeForSave(
  selectedType: string,
  customName?: string,
): string {
  if (selectedType === 'File_Khac' && String(customName || '').trim()) {
    return String(customName).trim();
  }
  return selectedType;
}

export function normalizeContractFiles(raw: unknown): ContractFile[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.filter((f) => f && typeof f === 'object') as ContractFile[];
  }
  if (typeof raw === 'string') {
    try {
      return normalizeContractFiles(JSON.parse(raw));
    } catch {
      return [];
    }
  }
  return [];
}

export const HOP_DONG_DATA_CHANGED_EVENT = 'hop-dong:data-changed';

export function emitHopDongDataChanged(
  contractId: string,
  files: ContractFile[],
  fileStatus: string,
) {
  window.dispatchEvent(
    new CustomEvent(HOP_DONG_DATA_CHANGED_EVENT, {
      detail: { contractId, files, fileStatus },
    }),
  );
}

/** URL tải xuống (hỗ trợ Google Drive). */
export function resolveFileDownloadUrl(fileUrl: string): string {
  const url = String(fileUrl || '').trim();
  if (!url) return url;
  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^/?]+)/);
  if (driveMatch?.[1]) {
    return `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
  }
  return url;
}

export function downloadContractFile(file: Pick<ContractFile, 'file_url' | 'file_name'>): void {
  const raw = String(file.file_url || '').trim();
  if (!raw) return;
  const href = resolveFileDownloadUrl(raw);
  const fileName = String(file.file_name || 'tai-lieu').trim() || 'tai-lieu';
  const a = document.createElement('a');
  a.href = href;
  a.download = fileName;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  a.remove();
}
