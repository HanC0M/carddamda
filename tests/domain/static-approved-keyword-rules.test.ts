import { describe, expect, it } from 'vitest';
import { loadStaticApprovedKeywordRules } from '../../src/domain/search/staticApprovedKeywordRules.js';

describe('static approved keyword rules', () => {
  it('loads as a valid rule list even before Supabase is configured', () => {
    expect(loadStaticApprovedKeywordRules()).toEqual([]);
  });
});
