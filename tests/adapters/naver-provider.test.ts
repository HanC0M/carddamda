import { describe, expect, it } from 'vitest';
import { buildNaverShoppingSearchTerms } from '../../src/adapters/providers/naver-shopping/provider.js';

describe('naver shopping provider', () => {
  it('adds a CardSquare-specific query to reduce preferred seller bias', () => {
    expect(buildNaverShoppingSearchTerms('증식의 G')).toEqual([
      '증식의 G',
      '증식의 G 카드스퀘어',
      '증식의 G 카드냥',
      '증식의 G TCG마트',
      '증식의 G OUR TCG'
    ]);
  });

  it('does not duplicate preferred seller search terms', () => {
    expect(buildNaverShoppingSearchTerms('증식의 G 카드스퀘어')).toEqual([
      '증식의 G 카드스퀘어',
      '증식의 G 카드스퀘어 카드냥',
      '증식의 G 카드스퀘어 TCG마트',
      '증식의 G 카드스퀘어 OUR TCG'
    ]);
    expect(buildNaverShoppingSearchTerms('증식의 G 유희왕STORE')).toEqual([
      '증식의 G 유희왕STORE',
      '증식의 G 유희왕STORE 카드냥',
      '증식의 G 유희왕STORE TCG마트',
      '증식의 G 유희왕STORE OUR TCG'
    ]);
    expect(buildNaverShoppingSearchTerms('증식의 G 카드냥')).toEqual([
      '증식의 G 카드냥',
      '증식의 G 카드냥 카드스퀘어',
      '증식의 G 카드냥 TCG마트',
      '증식의 G 카드냥 OUR TCG'
    ]);
    expect(buildNaverShoppingSearchTerms('증식의 G TCG마트')).toEqual([
      '증식의 G TCG마트',
      '증식의 G TCG마트 카드스퀘어',
      '증식의 G TCG마트 카드냥',
      '증식의 G TCG마트 OUR TCG'
    ]);
    expect(buildNaverShoppingSearchTerms('증식의 G OUR TCG')).toEqual([
      '증식의 G OUR TCG',
      '증식의 G OUR TCG 카드스퀘어',
      '증식의 G OUR TCG 카드냥',
      '증식의 G OUR TCG TCG마트'
    ]);
  });

  it('adds user-provided companion keywords before provider-specific expansion', () => {
    expect(
      buildNaverShoppingSearchTerms('체셔 캣', [
        {
          id: 'cheshire',
          sourceKeyword: '체셔 캣',
          targetKeyword: '체셔캣'
        }
      ])
    ).toEqual([
      '체셔 캣',
      '체셔 캣 카드스퀘어',
      '체셔 캣 카드냥',
      '체셔 캣 TCG마트',
      '체셔 캣 OUR TCG',
      '체셔캣',
      '체셔캣 카드스퀘어',
      '체셔캣 카드냥',
      '체셔캣 TCG마트',
      '체셔캣 OUR TCG'
    ]);
  });
});
