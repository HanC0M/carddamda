import {
  normalizeDeckRecognitionResponse
} from '../../domain/deck-image-recognition/normalizer.js';
import type {
  DeckImageRecognitionResponse,
  DeckImageSourceHint
} from '../../domain/deck-image-recognition/types.js';

export type DeckRecognitionEnv = {
  OPENAI_API_KEY?: string;
  OPENAI_DECK_RECOGNITION_MODEL?: string;
};

export class DeckRecognitionNotConfiguredError extends Error {
  constructor() {
    super('Deck image recognition is not configured');
    this.name = 'DeckRecognitionNotConfiguredError';
  }
}

export class DeckRecognitionProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DeckRecognitionProviderError';
  }
}

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_MODEL = 'gpt-5.2';

export async function recognizeDeckImageWithOpenAI(
  imageDataUrl: string,
  sourceHint: DeckImageSourceHint,
  env: DeckRecognitionEnv
): Promise<DeckImageRecognitionResponse> {
  if (!env.OPENAI_API_KEY) {
    throw new DeckRecognitionNotConfiguredError();
  }

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: env.OPENAI_DECK_RECOGNITION_MODEL ?? DEFAULT_MODEL,
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: buildPrompt(sourceHint)
            },
            {
              type: 'input_image',
              image_url: imageDataUrl,
              detail: 'high'
            }
          ]
        }
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'deck_image_recognition',
          strict: true,
          schema: recognitionSchema
        }
      }
    })
  });

  if (!response.ok) {
    const message = await response.text();
    throw new DeckRecognitionProviderError(
      `OpenAI deck recognition failed with ${response.status}: ${message.slice(0, 240)}`
    );
  }

  const payload = (await response.json()) as OpenAIResponsePayload;
  const outputText = extractOutputText(payload);

  if (!outputText) {
    throw new DeckRecognitionProviderError('OpenAI deck recognition returned no text output');
  }

  try {
    return normalizeDeckRecognitionResponse(JSON.parse(outputText) as Record<string, unknown>);
  } catch (error) {
    throw new DeckRecognitionProviderError(
      error instanceof Error ? error.message : 'OpenAI deck recognition returned invalid JSON'
    );
  }
}

function buildPrompt(sourceHint: DeckImageSourceHint) {
  return [
    'You are helping Carddamda import a Yu-Gi-Oh purchase list from a deck-list screenshot.',
    'The screenshot may be from Yu-Gi-Oh Master Duel or Yu-Gi-Oh NEURON.',
    `Source hint from the user interface: ${sourceHint}.`,
    'Identify visible cards as Korean search terms suitable for a Korean TCG shopping search.',
    'Count duplicate cards and quantity badges. Keep main/extra/side section if visible.',
    'Return only cards you can identify. Use unresolved entries for tiles that are visible but cannot be identified.',
    'Do not invent cards. If Korean names are uncertain, use the most likely Korean card name and add a warning.'
  ].join('\n');
}

type OpenAIResponsePayload = {
  output_text?: unknown;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

function extractOutputText(payload: OpenAIResponsePayload): string | null {
  if (typeof payload.output_text === 'string') return payload.output_text;

  for (const item of payload.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === 'output_text' && typeof content.text === 'string') {
        return content.text;
      }
    }
  }

  return null;
}

const recognitionSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    sourceTemplate: {
      type: 'string',
      enum: ['master_duel', 'neuron', 'unknown']
    },
    recognized: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          searchTerm: { type: 'string' },
          quantity: { type: 'integer', minimum: 1, maximum: 99 },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          section: {
            type: 'string',
            enum: ['main', 'extra', 'side', 'unknown']
          },
          sourceName: { type: ['string', 'null'] },
          note: { type: ['string', 'null'] }
        },
        required: ['searchTerm', 'quantity', 'confidence', 'section', 'sourceName', 'note']
      }
    },
    unresolved: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          quantity: { type: 'integer', minimum: 1, maximum: 99 },
          section: {
            type: 'string',
            enum: ['main', 'extra', 'side', 'unknown']
          },
          reason: { type: 'string' }
        },
        required: ['quantity', 'section', 'reason']
      }
    },
    warnings: {
      type: 'array',
      items: { type: 'string' }
    }
  },
  required: ['sourceTemplate', 'recognized', 'unresolved', 'warnings']
};
