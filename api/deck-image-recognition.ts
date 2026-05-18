import {
  buildDeckImageRecognitionConfig,
  buildDeckImageRecognitionResponse,
  mapDeckRecognitionError
} from '../src/api/deckImageRecognition.js';

type VercelRequestLike = {
  method?: string;
  body?: unknown;
};

type VercelResponseLike = {
  status: (code: number) => VercelResponseLike;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

export default async function handler(req: VercelRequestLike, res: VercelResponseLike) {
  try {
    if (req.method === 'GET') {
      res.status(200).json(buildDeckImageRecognitionConfig(process.env));
      return;
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST');
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const body = parseBody(req.body);
    const payload = await buildDeckImageRecognitionResponse(body, process.env);

    res.status(200).json(payload);
  } catch (error) {
    console.error('deck_image_recognition_handler_failed', error);
    const mapped = mapDeckRecognitionError(error);
    res.status(mapped.status).json(mapped.body);
  }
}

function parseBody(body: unknown): unknown {
  if (typeof body !== 'string') return body;

  try {
    return JSON.parse(body) as unknown;
  } catch {
    return null;
  }
}
