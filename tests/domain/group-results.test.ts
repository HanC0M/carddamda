import { describe, expect, it } from 'vitest';
import { buildSearchResultGroup } from '../../src/domain/search/groupResults.js';
import type { NormalizedProductResult, PurchaseRequest } from '../../src/domain/search/types.js';

const request: PurchaseRequest = {
  id: 'r1',
  searchTerm: '피카츄 ex',
  quantity: 2
};

const result: NormalizedProductResult = {
  provider: 'naver-shopping',
  merchantName: '카드매니아',
  title: '피카츄 ex',
  price: 48000,
  imageUrl: null,
  externalUrl: 'https://example.com',
  productId: '1001',
  availability: 'unknown',
  sourceTags: []
};

describe('search result groups', () => {
  it('builds success groups with TCGShop auxiliary action', () => {
    const group = buildSearchResultGroup(request, { ok: true, results: [result] });

    expect(group.status).toBe('success');
    expect(group.searchTerm).toBe('피카츄 ex');
    expect(group.quantity).toBe(2);
    expect(group.auxiliaryActions[0]).toMatchObject({
      id: 'tcgshop-direct-search',
      label: 'TCGShop에서 직접 검색'
    });
    expect(group.auxiliaryActions[0].externalUrl).toContain('tcgshop.co.kr');
  });

  it('builds empty, failed, and partial statuses', () => {
    expect(buildSearchResultGroup(request, { ok: true, results: [] }).status).toBe('empty');
    expect(buildSearchResultGroup(request, { ok: false, errorMessage: 'boom' }).status).toBe(
      'failed'
    );
    expect(
      buildSearchResultGroup(request, { ok: false, errorMessage: 'late', results: [result] }).status
    ).toBe('partial');
  });
});
