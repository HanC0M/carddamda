type AnalyticsProperties = Record<string, string | number | boolean | null | undefined>;

export function trackEvent(name: string, properties: AnalyticsProperties = {}) {
  window.mixpanel?.track(name, normalizeProperties(properties));
}

function normalizeProperties(properties: AnalyticsProperties): AnalyticsProperties {
  return Object.fromEntries(Object.entries(properties).filter(([, value]) => value !== undefined));
}
