export type AnalyticsEnv = {
  MIXPANEL_TOKEN?: string;
  VITE_MIXPANEL_TOKEN?: string;
};

export type AnalyticsProperties = Record<string, string | number | boolean | null | undefined>;

export type AnalyticsInput = {
  event: string;
  properties?: AnalyticsProperties;
};

export type AnalyticsSubmissionResult = {
  storage: 'mixpanel';
};

type MixpanelVerboseResponse = {
  status?: number;
  error?: string | null;
};

export class AnalyticsStoreNotConfiguredError extends Error {
  constructor() {
    super('Analytics store is not configured.');
    this.name = 'AnalyticsStoreNotConfiguredError';
  }
}

export function normalizeAnalyticsInput(input: AnalyticsInput): AnalyticsInput | null {
  const event = input.event.trim().replace(/\s+/g, ' ');
  if (!event || event.length > 120) return null;

  return {
    event,
    properties: normalizeProperties(input.properties ?? {})
  };
}

export async function submitAnalyticsEvent(
  input: AnalyticsInput,
  env: AnalyticsEnv
): Promise<AnalyticsSubmissionResult | null> {
  const normalized = normalizeAnalyticsInput(input);
  if (!normalized) return null;

  const token = env.MIXPANEL_TOKEN ?? env.VITE_MIXPANEL_TOKEN;
  if (!token) throw new AnalyticsStoreNotConfiguredError();

  const payload = buildMixpanelPayload(normalized, token);
  const data = Buffer.from(JSON.stringify(payload)).toString('base64');
  const url = `https://api-js.mixpanel.com/track/?verbose=1&data=${encodeURIComponent(data)}`;

  const response = await fetch(url);
  const body = (await response.json()) as MixpanelVerboseResponse;

  if (!response.ok || body.status !== 1) {
    throw new Error(`Mixpanel analytics request failed: ${body.error ?? response.status}`);
  }

  return { storage: 'mixpanel' };
}

export function buildMixpanelPayload(input: AnalyticsInput, token: string) {
  const normalized = normalizeAnalyticsInput(input);
  if (!normalized) return null;

  const distinctId = normalized.properties?.distinct_id;

  return {
    event: normalized.event,
    properties: {
      ...normalized.properties,
      token,
      distinct_id:
        typeof distinctId === 'string' && distinctId.trim()
          ? distinctId.trim()
          : 'carddamda-anonymous',
      time: Math.floor(Date.now() / 1000),
      source: 'server-proxy'
    }
  };
}

function normalizeProperties(properties: AnalyticsProperties): AnalyticsProperties {
  return Object.fromEntries(
    Object.entries(properties)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key.slice(0, 80), value])
      .slice(0, 50)
  );
}
