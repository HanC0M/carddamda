import { buildSearchSessionResponseWithRules } from '../src/api/searchSession';

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
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const body = parseBody(req.body);
  const requests = isRecord(body) ? body.requests : undefined;
  const keywordRules = isRecord(body) ? body.keywordRules : undefined;
  const payload = await buildSearchSessionResponseWithRules(requests, keywordRules, process.env);

  res.status(200).json(payload);
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
