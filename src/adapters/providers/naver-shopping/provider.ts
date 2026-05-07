import type { NormalizedProductResult } from '../../../domain/search/types.js';
import {
  buildExpandedSearchTerms,
  type ValidKeywordSearchRule
} from '../../../domain/search/keywordRules.js';
import { searchNaverShopping } from './client.js';
import { filterPreferredStoreResults, normalizeNaverShoppingItems } from './normalizer.js';

export type NaverShoppingProviderConfig = {
  clientId?: string;
  clientSecret?: string;
  display?: number;
};

export async function searchNaverShoppingProvider(
  searchTerm: string,
  config: NaverShoppingProviderConfig,
  keywordRules: ValidKeywordSearchRule[] = []
): Promise<NormalizedProductResult[]> {
  if (!config.clientId || !config.clientSecret) {
    throw new Error('Naver API credentials are not configured.');
  }

  const clientId = config.clientId;
  const clientSecret = config.clientSecret;
  const responses = await Promise.all(
    buildNaverShoppingSearchTerms(searchTerm, keywordRules).map((query) =>
      searchNaverShopping(query, {
        clientId,
        clientSecret,
        display: config.display
      })
    )
  );

  return filterPreferredStoreResults(
    normalizeNaverShoppingItems(responses.flatMap((response) => response.items))
  );
}

export function buildNaverShoppingSearchTerms(
  searchTerm: string,
  keywordRules: ValidKeywordSearchRule[] = []
): string[] {
  const expandedTerms = buildExpandedSearchTerms(searchTerm, keywordRules);
  const terms: string[] = [];

  for (const term of expandedTerms) {
    terms.push(term);
    if (!/카드\s*스퀘어|카드스퀘어|유희왕\s*store|유희왕스토어|yugioh\s*store|yugiohstore/i.test(term)) {
      terms.push(`${term} 카드스퀘어`);
    }
    if (!/카드\s*냥|카드냥|card\s*nyang|cardnyang/i.test(term)) {
      terms.push(`${term} 카드냥`);
    }
    if (!/tcg\s*마트|tcg마트|tcg\s*mart|tcgmart/i.test(term)) {
      terms.push(`${term} TCG마트`);
    }
  }

  return dedupeTerms(terms);
}

function dedupeTerms(terms: string[]): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const term of terms) {
    const key = term.toLocaleLowerCase('ko-KR');
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(term);
  }

  return deduped;
}
