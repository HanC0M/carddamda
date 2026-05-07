export type KeywordSearchRule = {
  id?: string;
  sourceKeyword: string;
  targetKeyword: string;
};

export type ValidKeywordSearchRule = {
  id: string;
  sourceKeyword: string;
  targetKeyword: string;
};

export type KeywordRuleSuggestion = {
  sourceKeyword: string;
  targetKeyword: string;
  normalizedSource: string;
  normalizedTarget: string;
};

export function normalizeKeywordRuleSuggestion(
  rule: KeywordSearchRule
): KeywordRuleSuggestion | null {
  const normalized = normalizeKeywordRuleInput(rule);
  if (!normalized) return null;

  return {
    sourceKeyword: normalized.sourceKeyword,
    targetKeyword: normalized.targetKeyword,
    normalizedSource: normalizeForRuleMatching(normalized.sourceKeyword),
    normalizedTarget: normalizeForRuleMatching(normalized.targetKeyword)
  };
}

export function normalizeKeywordRuleInput(rule: KeywordSearchRule): ValidKeywordSearchRule | null {
  const sourceKeyword = normalizeRuleTerm(rule.sourceKeyword);
  const targetKeyword = normalizeRuleTerm(rule.targetKeyword);

  if (!sourceKeyword || !targetKeyword) return null;
  if (sourceKeyword === targetKeyword) return null;

  return {
    id: rule.id || buildKeywordRuleId(sourceKeyword, targetKeyword),
    sourceKeyword,
    targetKeyword
  };
}

export function toValidKeywordSearchRules(rules: unknown): ValidKeywordSearchRule[] {
  if (!Array.isArray(rules)) return [];

  const seen = new Set<string>();
  const validRules: ValidKeywordSearchRule[] = [];

  for (const value of rules) {
    if (!isKeywordRuleLike(value)) continue;

    const rule = normalizeKeywordRuleInput(value);
    if (!rule) continue;

    const key = buildKeywordRuleId(rule.sourceKeyword, rule.targetKeyword);
    if (seen.has(key)) continue;

    seen.add(key);
    validRules.push(rule);
  }

  return validRules.slice(0, 50);
}

export function buildExpandedSearchTerms(
  searchTerm: string,
  rules: ValidKeywordSearchRule[]
): string[] {
  const baseTerm = normalizeRuleTerm(searchTerm);
  if (!baseTerm) return [];

  const terms = [baseTerm];
  const normalizedBase = normalizeForRuleMatching(baseTerm);

  for (const rule of rules) {
    if (normalizeForRuleMatching(rule.sourceKeyword) === normalizedBase) {
      terms.push(rule.targetKeyword);
    }
  }

  return dedupeTerms(terms);
}

export function buildKeywordRuleId(sourceKeyword: string, targetKeyword: string): string {
  return `${normalizeForRuleMatching(sourceKeyword)}->${normalizeForRuleMatching(targetKeyword)}`;
}

export function normalizeRuleTerm(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function dedupeTerms(terms: string[]): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const term of terms) {
    const key = normalizeForRuleMatching(term);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(term);
  }

  return deduped;
}

export function normalizeForRuleMatching(value: string): string {
  return normalizeRuleTerm(value).toLocaleLowerCase('ko-KR');
}

function isKeywordRuleLike(value: unknown): value is KeywordSearchRule {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.sourceKeyword === 'string' &&
    typeof candidate.targetKeyword === 'string' &&
    (candidate.id === undefined || typeof candidate.id === 'string')
  );
}
