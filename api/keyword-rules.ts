import {
  KeywordRuleStoreNotConfiguredError,
  submitKeywordRuleSuggestion
} from '../src/adapters/rules/supabaseKeywordRules.js';

type VercelRequestLike = {
  method?: string;
  body?: unknown;
};

type VercelResponseLike = {
  status: (code: number) => VercelResponseLike;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

export default async function handler(req: VercelRequestLike, res: VercelResponseLike) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const body = parseBody(req.body);
    const sourceKeyword = isRecord(body) ? body.sourceKeyword : undefined;
    const targetKeyword = isRecord(body) ? body.targetKeyword : undefined;

    if (typeof sourceKeyword !== 'string' || typeof targetKeyword !== 'string') {
      res.status(400).json({ error: 'Invalid keyword rule suggestion' });
      return;
    }

    const result = await submitKeywordRuleSuggestion(
      { sourceKeyword, targetKeyword },
      process.env
    );

    if (!result) {
      res.status(400).json({ error: 'Invalid keyword rule suggestion' });
      return;
    }

    res.status(202).json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof KeywordRuleStoreNotConfiguredError) {
      res.status(503).json({ error: 'Keyword rule store is not configured' });
      return;
    }

    console.error('keyword_rule_suggestion_failed', error);
    res.status(500).json({ error: 'Keyword rule suggestion failed' });
  }
}

function parseBody(body: unknown): unknown {
  if (typeof body !== 'string') return body;

  try {
    return JSON.parse(body) as unknown;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
