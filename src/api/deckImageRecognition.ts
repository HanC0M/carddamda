import {
  DeckRecognitionNotConfiguredError,
  DeckRecognitionProviderError,
  recognizeDeckImageWithOpenAI,
  type DeckRecognitionEnv
} from '../adapters/deck-recognition/openaiVision.js';
import type {
  DeckImageRecognitionRequest,
  DeckImageSourceHint
} from '../domain/deck-image-recognition/types.js';

export class InvalidDeckImageRequestError extends Error {
  statusCode = 400;

  constructor(message: string) {
    super(message);
    this.name = 'InvalidDeckImageRequestError';
  }
}

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const DATA_URL_PATTERN = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;

export async function buildDeckImageRecognitionResponse(
  input: unknown,
  env: DeckRecognitionEnv
) {
  const request = parseDeckImageRecognitionRequest(input);
  return recognizeDeckImageWithOpenAI(request.imageDataUrl, request.sourceHint ?? 'unknown', env);
}

export function parseDeckImageRecognitionRequest(
  input: unknown
): DeckImageRecognitionRequest {
  if (!isRecord(input)) {
    throw new InvalidDeckImageRequestError('요청 형식이 올바르지 않습니다.');
  }

  const imageDataUrl = String(input.imageDataUrl ?? '');
  const sourceHint = normalizeSourceHint(input.sourceHint);
  validateImageDataUrl(imageDataUrl);

  return { imageDataUrl, sourceHint };
}

export function mapDeckRecognitionError(error: unknown) {
  if (error instanceof InvalidDeckImageRequestError) {
    return { status: error.statusCode, body: { error: error.message } };
  }

  if (error instanceof DeckRecognitionNotConfiguredError) {
    return {
      status: 503,
      body: { error: '덱 이미지 인식 설정이 아직 연결되지 않았습니다.' }
    };
  }

  if (error instanceof DeckRecognitionProviderError) {
    return {
      status: 502,
      body: { error: '덱 이미지 인식 중 오류가 발생했습니다.' }
    };
  }

  return {
    status: 500,
    body: { error: '덱 이미지 인식 요청에 실패했습니다.' }
  };
}

function validateImageDataUrl(imageDataUrl: string) {
  const match = DATA_URL_PATTERN.exec(imageDataUrl);

  if (!match) {
    throw new InvalidDeckImageRequestError('jpg, png, webp 이미지만 업로드할 수 있습니다.');
  }

  const mimeType = match[1];
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new InvalidDeckImageRequestError('지원하지 않는 이미지 형식입니다.');
  }

  const byteLength = Buffer.byteLength(match[2], 'base64');
  if (byteLength > MAX_IMAGE_BYTES) {
    throw new InvalidDeckImageRequestError('이미지는 3MB 이하로 업로드해주세요.');
  }
}

function normalizeSourceHint(value: unknown): DeckImageSourceHint {
  if (value === 'master_duel' || value === 'neuron') return value;
  return 'unknown';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
