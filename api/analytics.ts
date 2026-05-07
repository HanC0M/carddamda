import {
  AnalyticsStoreNotConfiguredError,
  submitAnalyticsEvent,
  type AnalyticsProperties
} from '../src/adapters/analytics/mixpanelServer.js';

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
    const event = isRecord(body) ? body.event : undefined;
    const properties = isRecord(body) && isRecord(body.properties) ? parseProperties(body.properties) : {};

    if (typeof event !== 'string') {
      res.status(400).json({ error: 'Invalid analytics event' });
      return;
    }

    const result = await submitAnalyticsEvent({ event, properties }, process.env);

    if (!result) {
      res.status(400).json({ error: 'Invalid analytics event' });
      return;
    }

    res.status(202).json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof AnalyticsStoreNotConfiguredError) {
      res.status(202).json({ ok: true, storage: 'not-configured' });
      return;
    }

    console.error('analytics_submission_failed', error);
    res.status(202).json({ ok: true, storage: 'failed-open' });
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

function parseProperties(value: Record<string, unknown>): AnalyticsProperties {
  return Object.entries(value).reduce<AnalyticsProperties>((properties, [key, property]) => {
    if (isAnalyticsPropertyValue(property)) {
      properties[key] = property;
    }

    return properties;
  }, {});
}

function isAnalyticsPropertyValue(
  value: unknown
): value is string | number | boolean | null | undefined {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null ||
    value === undefined
  );
}
