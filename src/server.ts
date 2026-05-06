import dotenv from 'dotenv';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PurchaseRequestInput } from './domain/search/types';
import { buildSearchResultGroup } from './domain/search/groupResults';
import {
  createPurchaseRequestRow,
  toValidPurchaseRequests,
  validatePurchaseRows
} from './domain/session/validation';
import { searchNaverShoppingProvider } from './adapters/providers/naver-shopping/provider';

dotenv.config({ path: '.env.local' });
dotenv.config();

const app = express();
const port = Number.parseInt(process.env.API_PORT ?? '5174', 10);

app.use(express.json({ limit: '128kb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'carddamda' });
});

app.post('/api/search', async (req, res) => {
  const rows = parseRequestRows(req.body?.requests);
  const validated = validatePurchaseRows(rows);
  const validRequests = toValidPurchaseRequests(validated);

  const groups = await Promise.all(
    validRequests.map(async (request) => {
      try {
        const results = await searchNaverShoppingProvider(request.searchTerm, {
          clientId: process.env.NAVER_CLIENT_ID,
          clientSecret: process.env.NAVER_CLIENT_SECRET,
          display: 40
        });

        return buildSearchResultGroup(request, { ok: true, results });
      } catch (error) {
        return buildSearchResultGroup(request, {
          ok: false,
          errorMessage: error instanceof Error ? error.message : 'Unknown provider error'
        });
      }
    })
  );

  res.json({ validatedRows: validated, groups });
});

const dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.resolve(dirname, '../dist');

app.use(express.static(distPath));
app.get(/.*/, (_req, res, next) => {
  const indexPath = path.join(distPath, 'index.html');
  res.sendFile(indexPath, (error) => {
    if (error) next();
  });
});

app.listen(port, () => {
  console.log(`Carddamda API listening on http://localhost:${port}`);
});

function parseRequestRows(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value.map((input: PurchaseRequestInput, index) =>
    createPurchaseRequestRow({
      id: String(input.id || `request-${index + 1}`),
      searchTerm: String(input.searchTerm ?? ''),
      quantity: Number(input.quantity)
    })
  );
}
