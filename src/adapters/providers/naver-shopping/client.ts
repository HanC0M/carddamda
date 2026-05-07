import type { NaverShoppingApiResponse } from './types.js';

export type NaverShoppingClientOptions = {
  clientId: string;
  clientSecret: string;
  display?: number;
};

export async function searchNaverShopping(
  searchTerm: string,
  options: NaverShoppingClientOptions
): Promise<NaverShoppingApiResponse> {
  const display = Math.min(Math.max(options.display ?? 40, 1), 100);
  const url = new URL('https://openapi.naver.com/v1/search/shop.json');
  url.searchParams.set('query', searchTerm);
  url.searchParams.set('display', String(display));
  url.searchParams.set('start', '1');
  url.searchParams.set('sort', 'sim');
  url.searchParams.set('exclude', 'used:rental:cbshop');

  const response = await fetch(url, {
    headers: {
      'X-Naver-Client-Id': options.clientId,
      'X-Naver-Client-Secret': options.clientSecret
    }
  });

  if (!response.ok) {
    throw new Error(`Naver Shopping API failed with ${response.status}`);
  }

  return response.json() as Promise<NaverShoppingApiResponse>;
}
