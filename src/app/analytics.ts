import type mixpanelType from 'mixpanel-browser';

type AnalyticsProperties = Record<string, string | number | boolean | null | undefined>;

const token = import.meta.env.VITE_MIXPANEL_TOKEN as string | undefined;
let mixpanel: typeof mixpanelType | null = null;
let loadPromise: Promise<typeof mixpanelType | null> | null = null;

void loadMixpanel();

export function trackEvent(name: string, properties: AnalyticsProperties = {}) {
  if (!token) return;

  if (mixpanel) {
    mixpanel.track(name, properties);
    return;
  }

  void loadMixpanel().then((client) => {
    client?.track(name, properties);
  });
}

async function loadMixpanel() {
  if (!token) return null;
  if (mixpanel) return mixpanel;
  if (loadPromise) return loadPromise;

  loadPromise = import('mixpanel-browser').then((module) => {
    const client = module.default;
    client.init(token, {
      debug: import.meta.env.DEV,
      persistence: 'localStorage',
      track_pageview: true
    });
    mixpanel = client;
    return client;
  });

  return loadPromise;
}
