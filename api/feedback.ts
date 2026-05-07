import {
  FeedbackStoreNotConfiguredError,
  submitFeedback,
  type FeedbackType
} from '../src/adapters/feedback/supabaseFeedback.js';

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
    const type = isRecord(body) ? body.type : undefined;
    const content = isRecord(body) ? body.content : undefined;

    if (typeof type !== 'string' || typeof content !== 'string') {
      res.status(400).json({ error: 'Invalid feedback' });
      return;
    }

    const result = await submitFeedback({ type: type as FeedbackType, content }, process.env);

    if (!result) {
      res.status(400).json({ error: 'Invalid feedback' });
      return;
    }

    res.status(202).json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof FeedbackStoreNotConfiguredError) {
      res.status(202).json(buildAnalyticsOnlyFeedbackResponse());
      return;
    }

    console.error('feedback_submission_failed', error);
    res.status(202).json(buildAnalyticsOnlyFeedbackResponse());
  }
}

function buildAnalyticsOnlyFeedbackResponse() {
  return {
    ok: true,
    id: null,
    storage: 'analytics-only'
  };
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
