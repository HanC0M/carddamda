import {
  buildKeywordRuleId,
  normalizeKeywordRuleInput,
  type KeywordSearchRule,
  type ValidKeywordSearchRule
} from '../domain/search/keywordRules';

const storageKey = 'carddamda.keywordRules.v1';

export function loadKeywordRules(): ValidKeywordSearchRule[] {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((rule) => (isKeywordRule(rule) ? normalizeKeywordRuleInput(rule) : null))
      .filter((rule): rule is ValidKeywordSearchRule => Boolean(rule));
  } catch {
    return [];
  }
}

export function saveKeywordRules(rules: ValidKeywordSearchRule[]) {
  window.localStorage.setItem(storageKey, JSON.stringify(rules));
}

export function upsertKeywordRule(
  rules: ValidKeywordSearchRule[],
  nextRule: KeywordSearchRule
): ValidKeywordSearchRule[] {
  const normalized = normalizeKeywordRuleInput(nextRule);
  if (!normalized) return rules;

  const key = buildKeywordRuleId(normalized.sourceKeyword, normalized.targetKeyword);
  const withoutExisting = rules.filter(
    (rule) => buildKeywordRuleId(rule.sourceKeyword, rule.targetKeyword) !== key
  );

  return [normalized, ...withoutExisting].slice(0, 50);
}

function isKeywordRule(value: unknown): value is KeywordSearchRule {
  if (typeof value !== 'object' || value === null) return false;

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.sourceKeyword === 'string' &&
    typeof candidate.targetKeyword === 'string' &&
    (candidate.id === undefined || typeof candidate.id === 'string')
  );
}
