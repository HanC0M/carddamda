import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  normalizeFeedbackInput,
  submitFeedback
} from '../../src/adapters/feedback/supabaseFeedback.js';

const env = {
  SUPABASE_URL: 'https://carddamda.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key'
};

describe('supabase feedback adapter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('normalizes valid feedback and rejects invalid input', () => {
    expect(normalizeFeedbackInput({ type: 'bug', content: '  버튼이   안 눌려요 ' })).toEqual({
      type: 'bug',
      content: '버튼이 안 눌려요'
    });
    expect(normalizeFeedbackInput({ type: 'other', content: '' })).toBe(null);
    expect(normalizeFeedbackInput({ type: 'other', content: 'x'.repeat(2001) })).toBe(null);
  });

  it('stores valid feedback in Supabase', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      jsonResponse([
        {
          id: 'feedback-1',
          feedback_type: 'feature',
          content: '덱 저장 기능이 필요해요'
        }
      ])
    );

    await expect(
      submitFeedback({ type: 'feature', content: '덱 저장 기능이 필요해요' }, env)
    ).resolves.toEqual({
      id: 'feedback-1',
      storage: 'supabase'
    });
  });
});

function jsonResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(body)
  } as Response;
}
