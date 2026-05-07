import { describe, expect, it } from 'vitest';
import rows from '../../fixtures/sessions/purchase-rows.json';
import {
  toValidPurchaseRequests,
  validatePurchaseRows,
  type PurchaseRequestRow
} from '../../src/domain/session/validation.js';

describe('purchase request validation', () => {
  it('keeps invalid rows visible and returns only valid requests for search', () => {
    const validated = validatePurchaseRows(rows as PurchaseRequestRow[]);

    expect(validated.find((row) => row.id === 'r3')?.issues[0].type).toBe('empty-search-term');
    expect(validated.find((row) => row.id === 'r5')?.issues[0].type).toBe('invalid-quantity');
    expect(validated.find((row) => row.id === 'r1')?.issues[0].type).toBe(
      'duplicate-search-term'
    );

    const valid = toValidPurchaseRequests(validated);
    expect(valid).toEqual([{ id: 'r2', searchTerm: '리자몽 VMAX', quantity: 1 }]);
  });
});
