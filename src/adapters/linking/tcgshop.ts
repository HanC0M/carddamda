export function buildTcgShopSearchUrl(searchTerm: string): string {
  const encoded = encodeURIComponent(searchTerm.trim()).replace(/%20/g, '+');
  return `http://www.tcgshop.co.kr/search_result.php?search=meta_str&searchstring=${encoded}`;
}
