import { describe, expect, it } from 'vitest';
import fixture from '../../fixtures/naver-shopping/search-results.json';
import {
  filterPreferredStoreResults,
  normalizeNaverShoppingItems
} from '../../src/adapters/providers/naver-shopping/normalizer.js';
import type { NaverShoppingApiResponse } from '../../src/adapters/providers/naver-shopping/types.js';

describe('naver shopping normalizer', () => {
  it('normalizes Naver API items and deduplicates by product ID', () => {
    const results = normalizeNaverShoppingItems((fixture as NaverShoppingApiResponse).items);

    expect(results).toHaveLength(9);
    expect(results[0]).toMatchObject({
      provider: 'naver-shopping',
      merchantName: '카드매니아',
      title: '피카츄 ex SAR 포켓몬 카드',
      price: 48000,
      imageUrl: 'https://example.com/pikachu.jpg',
      productId: '1001',
      availability: 'unknown',
      sourceTags: []
    });
  });

  it('tags TCGShop listings through mall name or URL host', () => {
    const results = normalizeNaverShoppingItems((fixture as NaverShoppingApiResponse).items);
    const tcgshop = results.find((result) => result.productId === '2002');

    expect(tcgshop?.sourceTags).toContain('tcgshop-via-naver');
  });

  it('filters results to preferred Smart Stores and TCGShop only', () => {
    const results = normalizeNaverShoppingItems((fixture as NaverShoppingApiResponse).items);
    const filtered = filterPreferredStoreResults(results);

    expect(filtered.map((result) => result.productId)).toEqual([
      '2002',
      '3003',
      '4004',
      '5005',
      '6006',
      '7007',
      '8008',
      '9009'
    ]);
    expect(filtered.some((result) => result.merchantName === '카드매니아')).toBe(false);
  });

  it('normalizes preferred seller display names', () => {
    const results = normalizeNaverShoppingItems((fixture as NaverShoppingApiResponse).items);

    expect(results.find((result) => result.productId === '3003')?.merchantName).toBe('카드킹덤');
    expect(results.find((result) => result.productId === '4004')?.merchantName).toBe('카드스퀘어');
    expect(results.find((result) => result.productId === '6006')?.merchantName).toBe('카드스퀘어');
    expect(results.find((result) => result.productId === '7007')?.merchantName).toBe('카드냥');
    expect(results.find((result) => result.productId === '8008')?.merchantName).toBe('TCG마트');
    expect(results.find((result) => result.productId === '9009')?.merchantName).toBe('OUR TCG');
  });

  it('preserves Naver Shopping outbound links instead of guessing SmartStore slugs', () => {
    const results = normalizeNaverShoppingItems((fixture as NaverShoppingApiResponse).items);
    const cardkingdom = results.find((result) => result.productId === '3003');
    const yugiohStore = results.find((result) => result.productId === '4004');
    const tcgshop = results.find((result) => result.productId === '2002');

    expect(cardkingdom?.externalUrl).toBe(
      'https://smartstore.naver.com/main/products/8312162594'
    );
    expect(yugiohStore?.externalUrl).toBe(
      'https://smartstore.naver.com/main/products/13184266985'
    );
    expect(tcgshop?.externalUrl).toBe('http://www.tcgshop.co.kr/goods_detail.php?goodsIdx=2002');
  });
});
