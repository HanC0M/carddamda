import type {
  NormalizedProductResult,
  PurchaseRequest,
  SearchAuxiliaryAction,
  SearchGroupStatus,
  SearchResultGroup
} from './types';
import { buildTcgShopSearchUrl } from '../../adapters/linking/tcgshop';

export type ProviderSearchOutcome =
  | { ok: true; results: NormalizedProductResult[] }
  | { ok: false; errorMessage: string; results?: NormalizedProductResult[] };

export function buildSearchResultGroup(
  request: PurchaseRequest,
  outcome: ProviderSearchOutcome
): SearchResultGroup {
  const results = outcome.results ?? [];
  const status = getGroupStatus(outcome, results);

  return {
    requestId: request.id,
    searchTerm: request.searchTerm,
    quantity: request.quantity,
    status,
    results,
    auxiliaryActions: [buildTcgShopAuxiliaryAction(request.searchTerm)],
    errorMessage: outcome.ok ? null : outcome.errorMessage
  };
}

function getGroupStatus(
  outcome: ProviderSearchOutcome,
  results: NormalizedProductResult[]
): SearchGroupStatus {
  if (!outcome.ok && results.length > 0) return 'partial';
  if (!outcome.ok) return 'failed';
  if (results.length === 0) return 'empty';
  return 'success';
}

function buildTcgShopAuxiliaryAction(searchTerm: string): SearchAuxiliaryAction {
  return {
    id: 'tcgshop-direct-search',
    label: 'TCGShop에서 직접 검색',
    externalUrl: buildTcgShopSearchUrl(searchTerm),
    reason: 'TCGShop direct search is user-initiated in V1.'
  };
}
