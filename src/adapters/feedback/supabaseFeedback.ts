export type FeedbackEnv = {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
};

export type FeedbackType = 'bug' | 'shop' | 'feature' | 'other';

export type FeedbackInput = {
  type: FeedbackType;
  content: string;
};

export type FeedbackSubmissionResult = {
  id: string | null;
  storage: 'supabase';
};

type SupabaseFeedbackRow = {
  id: string;
  feedback_type: FeedbackType;
  content: string;
};

export class FeedbackStoreNotConfiguredError extends Error {
  constructor() {
    super('Feedback store is not configured.');
    this.name = 'FeedbackStoreNotConfiguredError';
  }
}

export function normalizeFeedbackInput(input: FeedbackInput): FeedbackInput | null {
  const type = input.type;
  const content = input.content.trim().replace(/\s+/g, ' ');

  if (!isFeedbackType(type)) return null;
  if (!content || content.length > 2000) return null;

  return { type, content };
}

export async function submitFeedback(
  input: FeedbackInput,
  env: FeedbackEnv
): Promise<FeedbackSubmissionResult | null> {
  const normalized = normalizeFeedbackInput(input);
  if (!normalized) return null;

  const client = createSupabaseRestClient(env);
  if (!client) throw new FeedbackStoreNotConfiguredError();

  const inserted = await client.post<SupabaseFeedbackRow[]>('/user_feedback', {
    feedback_type: normalized.type,
    content: normalized.content,
    status: 'new'
  });

  return {
    id: inserted[0]?.id ?? null,
    storage: 'supabase'
  };
}

function isFeedbackType(value: string): value is FeedbackType {
  return value === 'bug' || value === 'shop' || value === 'feature' || value === 'other';
}

function createSupabaseRestClient(env: FeedbackEnv) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return null;

  const baseUrl = env.SUPABASE_URL.replace(/\/$/, '');
  const key = env.SUPABASE_SERVICE_ROLE_KEY;

  return {
    post: <T>(path: string, body: unknown) =>
      requestSupabase<T>(`${baseUrl}/rest/v1${path}`, key, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Prefer: 'return=representation'
        },
        body: JSON.stringify(body)
      })
  };
}

async function requestSupabase<T>(url: string, key: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      ...(init.headers ?? {})
    }
  });

  if (!response.ok) {
    throw new Error(`Supabase feedback request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}
