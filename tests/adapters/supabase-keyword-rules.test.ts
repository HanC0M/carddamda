import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  loadApprovedKeywordRules,
  submitKeywordRuleSuggestion
} from '../../src/adapters/rules/supabaseKeywordRules.js';

const env = {
  SUPABASE_URL: 'https://carddamda.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key'
};

describe('supabase keyword rule adapter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns no approved rules when Supabase is not configured', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    await expect(loadApprovedKeywordRules({})).resolves.toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('loads approved rules from Supabase rows', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      jsonResponse([
        {
          id: 'rule-1',
          source_keyword: '체셔 캣',
          target_keyword: '체셔캣',
          normalized_source: '체셔 캣',
          normalized_target: '체셔캣',
          status: 'approved'
        }
      ])
    );

    await expect(loadApprovedKeywordRules(env)).resolves.toEqual([
      {
        id: 'rule-1',
        sourceKeyword: '체셔 캣',
        targetKeyword: '체셔캣'
      }
    ]);
  });

  it('stores valid suggestions as pending', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(
        jsonResponse([
          {
            id: 'suggestion-1',
            status: 'pending'
          }
        ])
      );

    await expect(
      submitKeywordRuleSuggestion(
        {
          sourceKeyword: ' 체셔   캣 ',
          targetKeyword: ' 체셔캣 '
        },
        env
      )
    ).resolves.toEqual({
      id: 'suggestion-1',
      status: 'pending',
      duplicate: false
    });
  });

  it('does not insert duplicate suggestions', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      jsonResponse([
        {
          id: 'existing-rule',
          status: 'approved'
        }
      ])
    );

    await expect(
      submitKeywordRuleSuggestion(
        {
          sourceKeyword: '체셔 캣',
          targetKeyword: '체셔캣'
        },
        env
      )
    ).resolves.toEqual({
      id: 'existing-rule',
      status: 'approved',
      duplicate: true
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

function jsonResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(body)
  } as Response;
}
