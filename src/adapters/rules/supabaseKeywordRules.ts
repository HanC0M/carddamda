import {
  normalizeKeywordRuleInput,
  normalizeKeywordRuleSuggestion,
  type KeywordSearchRule,
  type ValidKeywordSearchRule
} from '../../domain/search/keywordRules.js';

export type KeywordRuleStoreEnv = {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
};

export type KeywordRuleSuggestionStatus = 'pending' | 'approved' | 'rejected' | 'disabled';

export type KeywordRuleSuggestionResult = {
  id: string | null;
  status: KeywordRuleSuggestionStatus;
  duplicate: boolean;
};

type SupabaseKeywordRuleRow = {
  id: string;
  source_keyword: string;
  target_keyword: string;
  normalized_source: string;
  normalized_target: string;
  status: KeywordRuleSuggestionStatus;
};

export class KeywordRuleStoreNotConfiguredError extends Error {
  constructor() {
    super('Keyword rule store is not configured.');
    this.name = 'KeywordRuleStoreNotConfiguredError';
  }
}

export async function loadApprovedKeywordRules(
  env: KeywordRuleStoreEnv
): Promise<ValidKeywordSearchRule[]> {
  const client = createSupabaseRestClient(env);
  if (!client) return [];

  const rows = await client.get<SupabaseKeywordRuleRow[]>(
    '/keyword_rule_suggestions?select=id,source_keyword,target_keyword,normalized_source,normalized_target,status&status=eq.approved&order=created_at.asc'
  );

  return rows
    .map((row) =>
      normalizeKeywordRuleInput({
        id: row.id,
        sourceKeyword: row.source_keyword,
        targetKeyword: row.target_keyword
      })
    )
    .filter((rule): rule is ValidKeywordSearchRule => Boolean(rule));
}

export async function submitKeywordRuleSuggestion(
  input: KeywordSearchRule,
  env: KeywordRuleStoreEnv
): Promise<KeywordRuleSuggestionResult | null> {
  const suggestion = normalizeKeywordRuleSuggestion(input);
  if (!suggestion) return null;

  const client = createSupabaseRestClient(env);
  if (!client) throw new KeywordRuleStoreNotConfiguredError();

  const existing = await client.get<SupabaseKeywordRuleRow[]>(
    `/keyword_rule_suggestions?select=id,status&normalized_source=eq.${encodeURIComponent(
      suggestion.normalizedSource
    )}&normalized_target=eq.${encodeURIComponent(suggestion.normalizedTarget)}&limit=1`
  );

  if (existing[0]) {
    return {
      id: existing[0].id,
      status: existing[0].status,
      duplicate: true
    };
  }

  const inserted = await client.post<SupabaseKeywordRuleRow[]>('/keyword_rule_suggestions', {
    source_keyword: suggestion.sourceKeyword,
    target_keyword: suggestion.targetKeyword,
    normalized_source: suggestion.normalizedSource,
    normalized_target: suggestion.normalizedTarget,
    status: 'pending'
  });

  return {
    id: inserted[0]?.id ?? null,
    status: inserted[0]?.status ?? 'pending',
    duplicate: false
  };
}

function createSupabaseRestClient(env: KeywordRuleStoreEnv) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return null;

  const baseUrl = env.SUPABASE_URL.replace(/\/$/, '');
  const key = env.SUPABASE_SERVICE_ROLE_KEY;

  return {
    get: <T>(path: string) =>
      requestSupabase<T>(`${baseUrl}/rest/v1${path}`, key, {
        method: 'GET'
      }),
    post: <T>(path: string, body: unknown) =>
      requestSupabase<T>(`${baseUrl}/rest/v1${path}`, key, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Prefer: 'return=representation'
        },
        body: JSON.stringify(body)
      })
  };
}

async function requestSupabase<T>(url: string, key: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      ...(init.headers ?? {})
    }
  });

  if (!response.ok) {
    throw new Error(`Supabase keyword rule request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}
