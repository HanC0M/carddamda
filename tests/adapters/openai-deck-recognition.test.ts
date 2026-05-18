import { afterEach, describe, expect, it, vi } from 'vitest';
import { recognizeDeckImageWithOpenAI } from '../../src/adapters/deck-recognition/openaiVision.js';

describe('openai deck recognition adapter', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends image input and parses structured output text', async () => {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body)) as {
        input: Array<{ content: Array<{ type: string; image_url?: string }> }>;
      };

      expect(body.input[0].content.some((item) => item.type === 'input_image')).toBe(true);
      expect(body.input[0].content.find((item) => item.type === 'input_image')?.image_url).toBe(
        'data:image/jpeg;base64,ZmFrZQ=='
      );

      return new Response(
        JSON.stringify({
          output_text: JSON.stringify({
            sourceTemplate: 'neuron',
            recognized: [
              {
                searchTerm: '하루 우라라',
                quantity: 3,
                confidence: 0.93,
                section: 'main',
                sourceName: 'Ash Blossom & Joyous Spring',
                note: null
              }
            ],
            unresolved: [],
            warnings: []
          })
        }),
        { status: 200 }
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await recognizeDeckImageWithOpenAI('data:image/jpeg;base64,ZmFrZQ==', 'neuron', {
      OPENAI_API_KEY: 'test-key',
      OPENAI_DECK_RECOGNITION_MODEL: 'test-model'
    });

    expect(result.sourceTemplate).toBe('neuron');
    expect(result.recognized[0].searchTerm).toBe('하루 우라라');
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
