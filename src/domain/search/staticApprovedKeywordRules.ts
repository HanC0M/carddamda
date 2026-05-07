import {
  normalizeKeywordRuleInput,
  type KeywordSearchRule,
  type ValidKeywordSearchRule
} from './keywordRules.js';

const staticApprovedKeywordRuleInputs: KeywordSearchRule[] = [];

export function loadStaticApprovedKeywordRules(): ValidKeywordSearchRule[] {
  return staticApprovedKeywordRuleInputs
    .map((rule) => normalizeKeywordRuleInput(rule))
    .filter((rule): rule is ValidKeywordSearchRule => Boolean(rule));
}
