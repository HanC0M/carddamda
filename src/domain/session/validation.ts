import type { PurchaseRequest } from '../search/types';

export type PurchaseRequestIssueType = 'empty-search-term' | 'invalid-quantity' | 'duplicate-search-term';

export type PurchaseRequestIssue = {
  type: PurchaseRequestIssueType;
  message: string;
};

export type PurchaseRequestRow = {
  id: string;
  searchTerm: string;
  quantity: number;
};

export type ValidatedPurchaseRequestRow = PurchaseRequestRow & {
  issues: PurchaseRequestIssue[];
};

export function createPurchaseRequestRow(
  partial: Partial<PurchaseRequestRow> = {}
): PurchaseRequestRow {
  return {
    id: partial.id ?? cryptoSafeId(),
    searchTerm: partial.searchTerm ?? '',
    quantity: partial.quantity ?? 1
  };
}

export function validatePurchaseRows(rows: PurchaseRequestRow[]): ValidatedPurchaseRequestRow[] {
  const counts = new Map<string, number>();

  for (const row of rows) {
    const key = normalizeSearchTerm(row.searchTerm);
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return rows.map((row) => {
    const issues: PurchaseRequestIssue[] = [];
    const normalized = normalizeSearchTerm(row.searchTerm);

    if (!normalized) {
      issues.push({ type: 'empty-search-term', message: '검색어 없음' });
    }

    if (!Number.isInteger(row.quantity) || row.quantity < 1 || row.quantity > 99) {
      issues.push({ type: 'invalid-quantity', message: '수량 오류' });
    }

    if (normalized && (counts.get(normalized) ?? 0) > 1) {
      issues.push({ type: 'duplicate-search-term', message: '중복' });
    }

    return { ...row, issues };
  });
}

export function toValidPurchaseRequests(rows: ValidatedPurchaseRequestRow[]): PurchaseRequest[] {
  return rows
    .filter((row) => row.issues.length === 0)
    .map((row) => ({
      id: row.id,
      searchTerm: row.searchTerm.trim(),
      quantity: row.quantity
    }));
}

export function normalizeSearchTerm(searchTerm: string): string {
  return searchTerm.trim().replace(/\s+/g, ' ').toLocaleLowerCase('ko-KR');
}

function cryptoSafeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `row-${Math.random().toString(36).slice(2, 10)}`;
}
