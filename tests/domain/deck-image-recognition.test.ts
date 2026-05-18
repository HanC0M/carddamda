import { describe, expect, it } from 'vitest';
import {
  appendRecognizedCardsToRows,
  normalizeDeckRecognitionResponse
} from '../../src/domain/deck-image-recognition/normalizer.js';

describe('deck image recognition normalization', () => {
  it('deduplicates recognized cards and sums quantities', () => {
    const normalized = normalizeDeckRecognitionResponse({
      sourceTemplate: 'master_duel',
      recognized: [
        {
          searchTerm: '증식의 G',
          quantity: 2,
          confidence: 0.92,
          section: 'main',
          sourceName: 'Maxx "C"',
          note: null
        },
        {
          searchTerm: ' 증식의   G ',
          quantity: 1,
          confidence: 0.81,
          section: 'main',
          sourceName: 'Maxx "C"',
          note: null
        }
      ],
      unresolved: [{ quantity: 2, section: 'extra', reason: '작은 썸네일' }],
      warnings: ['대체 일러스트가 포함되어 있을 수 있습니다.']
    });

    expect(normalized.sourceTemplate).toBe('master_duel');
    expect(normalized.recognized).toHaveLength(1);
    expect(normalized.recognized[0]).toMatchObject({
      searchTerm: '증식의 G',
      quantity: 3,
      confidence: 0.92,
      section: 'main'
    });
    expect(normalized.unresolved[0].quantity).toBe(2);
    expect(normalized.warnings[0]).toContain('대체 일러스트');
  });

  it('appends recognized cards into existing purchase rows by normalized term', () => {
    const rows = appendRecognizedCardsToRows(
      [{ id: 'r1', searchTerm: '증식의 G', quantity: 1 }],
      [
        {
          searchTerm: '증식의 g',
          quantity: 2,
          confidence: 0.9,
          section: 'main',
          sourceName: null,
          note: null
        },
        {
          searchTerm: '무한포영',
          quantity: 3,
          confidence: 0.88,
          section: 'main',
          sourceName: 'Infinite Impermanence',
          note: null
        }
      ]
    );

    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ id: 'r1', searchTerm: '증식의 G', quantity: 3 });
    expect(rows[1].searchTerm).toBe('무한포영');
    expect(rows[1].quantity).toBe(3);
  });
});
