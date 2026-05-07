import { describe, expect, it } from 'vitest';
import {
  buildExpandedSearchTerms,
  normalizeKeywordRuleInput,
  normalizeKeywordRuleSuggestion,
  toValidKeywordSearchRules
} from '../../src/domain/search/keywordRules.js';

describe('keyword search rules', () => {
  it('normalizes and rejects invalid rules', () => {
    expect(
      normalizeKeywordRuleInput({
        sourceKeyword: '  체셔   캣 ',
        targetKeyword: ' 체셔캣 '
      })
    ).toMatchObject({
      sourceKeyword: '체셔 캣',
      targetKeyword: '체셔캣'
    });

    expect(normalizeKeywordRuleInput({ sourceKeyword: '증식의 G', targetKeyword: '증식의 G' })).toBe(
      null
    );
  });

  it('validates unknown rule payloads and deduplicates them', () => {
    const rules = toValidKeywordSearchRules([
      { sourceKeyword: '체셔 캣', targetKeyword: '체셔캣' },
      { sourceKeyword: '체셔 캣', targetKeyword: '체셔캣' },
      { sourceKeyword: '', targetKeyword: 'ignored' },
      { sourceKeyword: '화이트래빗', targetKeyword: 'White Rabbit' }
    ]);

    expect(rules).toHaveLength(2);
  });

  it('expands a search term with matching companion keywords', () => {
    expect(
      buildExpandedSearchTerms('체셔 캣', [
        {
          id: 'r1',
          sourceKeyword: '체셔 캣',
          targetKeyword: '체셔캣'
        }
      ])
    ).toEqual(['체셔 캣', '체셔캣']);
  });

  it('builds normalized suggestion fields for review storage', () => {
    expect(
      normalizeKeywordRuleSuggestion({
        sourceKeyword: '  White   Rabbit ',
        targetKeyword: '화이트래빗'
      })
    ).toEqual({
      sourceKeyword: 'White Rabbit',
      targetKeyword: '화이트래빗',
      normalizedSource: 'white rabbit',
      normalizedTarget: '화이트래빗'
    });
  });
});
