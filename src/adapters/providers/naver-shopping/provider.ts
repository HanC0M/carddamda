import type { NormalizedProductResult } from '../../../domain/search/types';
import { searchNaverShopping } from './client';
import { filterPreferredStoreResults, normalizeNaverShoppingItems } from './normalizer';

export type NaverShoppingProviderConfig = {
  clientId?: string;
  clientSecret?: string;
  display?: number;
};

export async function searchNaverShoppingProvider(
  searchTerm: string,
  config: NaverShoppingProviderConfig
): Promise<NormalizedProductResult[]> {
  if (!config.clientId || !config.clientSecret) {
    throw new Error('Naver API credentials are not configured.');
  }

  const clientId = config.clientId;
  const clientSecret = config.clientSecret;
  const responses = await Promise.all(
    buildNaverShoppingSearchTerms(searchTerm).map((query) =>
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

export function buildNaverShoppingSearchTerms(searchTerm: string): string[] {
  const trimmed = searchTerm.trim();
  if (!trimmed) return [];

  const terms = [trimmed];
  if (!/카드\s*스퀘어|카드스퀘어|유희왕\s*store|유희왕스토어|yugioh\s*store|yugiohstore/i.test(trimmed)) {
    terms.push(`${trimmed} 카드스퀘어`);
  }

  return terms;
}
