import { describe, expect, it } from 'vitest';
import { buildNaverShoppingSearchTerms } from '../../src/adapters/providers/naver-shopping/provider';

describe('naver shopping provider', () => {
  it('adds a CardSquare-specific query to reduce preferred seller bias', () => {
    expect(buildNaverShoppingSearchTerms('증식의 G')).toEqual([
      '증식의 G',
      '증식의 G 카드스퀘어'
    ]);
  });

  it('does not duplicate CardSquare-specific search terms', () => {
    expect(buildNaverShoppingSearchTerms('증식의 G 카드스퀘어')).toEqual(['증식의 G 카드스퀘어']);
    expect(buildNaverShoppingSearchTerms('증식의 G 유희왕STORE')).toEqual(['증식의 G 유희왕STORE']);
  });
});
