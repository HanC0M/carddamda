import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AnalyticsStoreNotConfiguredError,
  buildMixpanelPayload,
  normalizeAnalyticsInput,
  submitAnalyticsEvent
} from '../../src/adapters/analytics/mixpanelServer.js';

describe('mixpanel server analytics adapter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('normalizes valid analytics input and rejects invalid events', () => {
    expect(
      normalizeAnalyticsInput({
        event: '  Search   Started ',
        properties: { queryCount: 3, ignored: undefined }
      })
    ).toEqual({
      event: 'Search Started',
      properties: { queryCount: 3 }
    });
    expect(normalizeAnalyticsInput({ event: '' })).toBe(null);
    expect(normalizeAnalyticsInput({ event: 'x'.repeat(121) })).toBe(null);
  });

  it('builds a server-proxy Mixpanel payload without allowing token override', () => {
    const payload = buildMixpanelPayload(
      {
        event: 'Search Completed',
        properties: {
          token: 'client-token',
          distinct_id: 'user-1',
          source: 'client',
          resultCount: 7
        }
      },
      'server-token'
    );

    expect(payload).toMatchObject({
      event: 'Search Completed',
      properties: {
        token: 'server-token',
        distinct_id: 'user-1',
        source: 'server-proxy',
        resultCount: 7
      }
    });
  });

  it('submits valid events to Mixpanel', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      jsonResponse({
        status: 1,
        error: null
      })
    );

    await expect(
      submitAnalyticsEvent(
        { event: 'Feedback Opened', properties: { placement: 'header' } },
        { MIXPANEL_TOKEN: 'server-token' }
      )
    ).resolves.toEqual({
      storage: 'mixpanel'
    });

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('https://api-js.mixpanel.com/track/'));
  });

  it('requires a Mixpanel token', async () => {
    await expect(submitAnalyticsEvent({ event: 'App Opened' }, {})).rejects.toBeInstanceOf(
      AnalyticsStoreNotConfiguredError
    );
  });
});

function jsonResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(body)
  } as Response;
}
