import type { NormalizedProductResult } from '../../../domain/search/types.js';
import type { NaverShoppingApiItem } from './types.js';

export function normalizeNaverShoppingItems(
  items: NaverShoppingApiItem[]
): NormalizedProductResult[] {
  const results = items.map(normalizeNaverShoppingItem);
  const seen = new Set<string>();
  const deduped: NormalizedProductResult[] = [];

  for (const result of results) {
    if (seen.has(result.productId)) continue;
    seen.add(result.productId);
    deduped.push(result);
  }

  return deduped;
}

export function filterPreferredStoreResults(
  results: NormalizedProductResult[]
): NormalizedProductResult[] {
  return results.filter(isPreferredStoreResult);
}

export function isPreferredStoreResult(result: NormalizedProductResult): boolean {
  return (
    isYugiohStoreListing(result.merchantName, result.externalUrl) ||
    isCardKingdomListing(result.merchantName, result.externalUrl) ||
    isCardNyangListing(result.merchantName, result.externalUrl) ||
    isTcgMartListing(result.merchantName, result.externalUrl) ||
    result.sourceTags.includes('tcgshop-via-naver')
  );
}

export function normalizeNaverShoppingItem(item: NaverShoppingApiItem): NormalizedProductResult {
  const rawExternalUrl = item.link;
  const productId = item.productId?.trim() || deterministicProductId(rawExternalUrl);
  const rawMerchantName = item.mallName?.trim() || '알 수 없음';
  const sourceTags = isTcgShopListing(rawMerchantName, rawExternalUrl) ? ['tcgshop-via-naver'] : [];

  return {
    provider: 'naver-shopping',
    merchantName: normalizePreferredMerchantName(rawMerchantName, rawExternalUrl),
    title: stripNaverMarkup(item.title),
    price: parseNaverPrice(item.lprice),
    imageUrl: item.image?.trim() || null,
    externalUrl: rawExternalUrl,
    productId,
    availability: 'unknown',
    sourceTags
  };
}

export function normalizePreferredMerchantName(
  merchantName: string,
  externalUrl: string
): string {
  if (isYugiohStoreListing(merchantName, externalUrl)) {
    return '카드스퀘어';
  }

  if (isCardKingdomListing(merchantName, externalUrl)) {
    return '카드킹덤';
  }

  if (isCardNyangListing(merchantName, externalUrl)) {
    return '카드냥';
  }

  if (isTcgMartListing(merchantName, externalUrl)) {
    return 'TCG마트';
  }

  return merchantName;
}

export function stripNaverMarkup(value: string): string {
  return value
    .replace(/<\/?b>/gi, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

export function parseNaverPrice(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value.replace(/[^\d]/g, ''), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isTcgShopListing(merchantName: string, externalUrl: string): boolean {
  if (/tcg\s*shop|tcgshop|티씨지샵/i.test(merchantName)) {
    return true;
  }

  try {
    const host = new URL(externalUrl).hostname.toLocaleLowerCase('en-US');
    return host === 'tcgshop.co.kr' || host.endsWith('.tcgshop.co.kr');
  } catch {
    return false;
  }
}

export function isYugiohStoreListing(merchantName: string, externalUrl: string): boolean {
  if (/카드\s*스퀘어|카드스퀘어|유희왕\s*store|유희왕스토어|yugioh\s*store|yugiohstore/i.test(merchantName)) {
    return true;
  }

  return isSmartStoreSlug(externalUrl, 'yugiohstore') || isSmartStoreSlug(externalUrl, 'sulyunyen');
}

export function isCardKingdomListing(merchantName: string, externalUrl: string): boolean {
  if (/카드\s*킹덤|카드킹덤|card\s*kingdom|cardkingdom/i.test(merchantName)) {
    return true;
  }

  return isSmartStoreSlug(externalUrl, 'cardkingdom');
}

export function isCardNyangListing(merchantName: string, externalUrl: string): boolean {
  if (/카드\s*냥|카드냥|card\s*nyang|cardnyang/i.test(merchantName)) {
    return true;
  }

  return isSmartStoreSlug(externalUrl, 'cardnyang');
}

export function isTcgMartListing(merchantName: string, externalUrl: string): boolean {
  if (/tcg\s*마트|tcg마트|tcg\s*mart|tcgmart/i.test(merchantName)) {
    return true;
  }

  return isSmartStoreSlug(externalUrl, 'tcgmart');
}

function isSmartStoreSlug(externalUrl: string, slug: string): boolean {
  try {
    const url = new URL(externalUrl);
    const host = url.hostname.toLocaleLowerCase('en-US');
    const firstPath = url.pathname.split('/').filter(Boolean)[0]?.toLocaleLowerCase('en-US');
    return host === 'smartstore.naver.com' && firstPath === slug;
  } catch {
    return false;
  }
}

function deterministicProductId(externalUrl: string): string {
  let hash = 0;
  for (let index = 0; index < externalUrl.length; index += 1) {
    hash = (hash * 31 + externalUrl.charCodeAt(index)) >>> 0;
  }
  return `url-${hash.toString(36)}`;
}
