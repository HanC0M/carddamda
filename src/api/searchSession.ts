import type { PurchaseRequestInput } from '../domain/search/types.js';
import { buildSearchResultGroup } from '../domain/search/groupResults.js';
import {
  createPurchaseRequestRow,
  toValidPurchaseRequests,
  validatePurchaseRows
} from '../domain/session/validation.js';
import { searchNaverShoppingProvider } from '../adapters/providers/naver-shopping/provider.js';
import {
  loadApprovedKeywordRules,
  type KeywordRuleStoreEnv
} from '../adapters/rules/supabaseKeywordRules.js';
import { loadStaticApprovedKeywordRules } from '../domain/search/staticApprovedKeywordRules.js';

export type SearchSessionEnv = KeywordRuleStoreEnv & {
  NAVER_CLIENT_ID?: string;
  NAVER_CLIENT_SECRET?: string;
};

export async function buildSearchSessionResponse(requests: unknown, env: SearchSessionEnv) {
  const rows = parseRequestRows(requests);
  const validated = validatePurchaseRows(rows);
  const validRequests = toValidPurchaseRequests(validated);
  const approvedKeywordRules = await safeLoadApprovedKeywordRules(env);

  const groups = await Promise.all(
    validRequests.map(async (request) => {
      try {
        const results = await searchNaverShoppingProvider(
          request.searchTerm,
          {
            clientId: env.NAVER_CLIENT_ID,
            clientSecret: env.NAVER_CLIENT_SECRET,
            display: 40
          },
          approvedKeywordRules
        );

        return buildSearchResultGroup(request, { ok: true, results });
      } catch (error) {
        return buildSearchResultGroup(request, {
          ok: false,
          errorMessage: error instanceof Error ? error.message : 'Unknown provider error'
        });
      }
    })
  );

  return { validatedRows: validated, groups };
}

async function safeLoadApprovedKeywordRules(env: SearchSessionEnv) {
  try {
    return [...loadStaticApprovedKeywordRules(), ...(await loadApprovedKeywordRules(env))];
  } catch (error) {
    console.error('approved_keyword_rules_load_failed', error);
    return loadStaticApprovedKeywordRules();
  }
}

function parseRequestRows(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value.map((input: PurchaseRequestInput, index) =>
    createPurchaseRequestRow({
      id: String(input.id || `request-${index + 1}`),
      searchTerm: String(input.searchTerm ?? ''),
      quantity: Number(input.quantity)
    })
  );
}
