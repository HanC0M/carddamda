import { describe, expect, it } from 'vitest';
import type { SearchResultGroup } from '../../src/domain/search/types';

describe('api response contract shape', () => {
  it('keeps grouped results tied to request identity', () => {
    const group: SearchResultGroup = {
      requestId: 'r1',
      searchTerm: '피카츄 ex',
      quantity: 2,
      status: 'empty',
      results: [],
      auxiliaryActions: [
        {
          id: 'tcgshop-direct-search',
          label: 'TCGShop에서 직접 검색',
          externalUrl: 'http://www.tcgshop.co.kr/search_result.php?search=meta_str&searchstring=x',
          reason: 'TCGShop direct search is user-initiated in V1.'
        }
      ],
      errorMessage: null
    };

    expect(group.requestId).toBe('r1');
    expect(group.quantity).toBe(2);
    expect(group.auxiliaryActions[0].label).toBe('TCGShop에서 직접 검색');
  });
});
