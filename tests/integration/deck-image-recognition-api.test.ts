import { describe, expect, it } from 'vitest';
import {
  buildDeckImageRecognitionConfig,
  buildDeckImageRecognitionResponse,
  mapDeckRecognitionError,
  parseDeckImageRecognitionRequest
} from '../../src/api/deckImageRecognition.js';
import { DeckRecognitionNotConfiguredError } from '../../src/adapters/deck-recognition/openaiVision.js';

const pngDataUrl = `data:image/png;base64,${Buffer.from('fake-png').toString('base64')}`;

describe('deck image recognition api contract', () => {
  it('accepts image data URLs and normalizes source hints', () => {
    const request = parseDeckImageRecognitionRequest({
      imageDataUrl: pngDataUrl,
      sourceHint: 'master_duel'
    });

    expect(request).toEqual({
      imageDataUrl: pngDataUrl,
      sourceHint: 'master_duel'
    });
  });

  it('rejects unsupported upload shapes before provider calls', () => {
    expect(() =>
      parseDeckImageRecognitionRequest({
        imageDataUrl: 'data:text/plain;base64,SGVsbG8=',
        sourceHint: 'neuron'
      })
    ).toThrow('jpg, png, webp');
  });

  it('returns a service unavailable error when recognition is not configured', async () => {
    await expect(
      buildDeckImageRecognitionResponse({ imageDataUrl: pngDataUrl }, {})
    ).rejects.toBeInstanceOf(DeckRecognitionNotConfiguredError);

    const mapped = mapDeckRecognitionError(new DeckRecognitionNotConfiguredError());
    expect(mapped.status).toBe(503);
    expect(mapped.body.error).toContain('설정');
  });

  it('exposes recognition configuration without leaking secrets', () => {
    expect(buildDeckImageRecognitionConfig({}).available).toBe(false);
    expect(
      buildDeckImageRecognitionConfig({
        OPENAI_API_KEY: 'secret-key',
        OPENAI_DECK_RECOGNITION_MODEL: 'custom-model'
      })
    ).toEqual({
      available: true,
      provider: 'openai',
      model: 'custom-model',
      acceptedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
      maxImageBytes: 3 * 1024 * 1024
    });
  });
});
