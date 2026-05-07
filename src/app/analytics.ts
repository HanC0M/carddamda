type AnalyticsProperties = Record<string, string | number | boolean | null | undefined>;

export function trackEvent(name: string, properties: AnalyticsProperties = {}) {
  const body = JSON.stringify({
    event: name,
    properties: normalizeProperties(properties)
  });

  if (navigator.sendBeacon) {
    const sent = navigator.sendBeacon('/api/analytics', new Blob([body], { type: 'application/json' }));
    if (sent) return;
  }

  void fetch('/api/analytics', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body,
    keepalive: true
  });
}

function normalizeProperties(properties: AnalyticsProperties): AnalyticsProperties {
  return Object.fromEntries(Object.entries(properties).filter(([, value]) => value !== undefined));
}
