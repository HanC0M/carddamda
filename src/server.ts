import dotenv from 'dotenv';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSearchSessionResponse } from './api/searchSession';

dotenv.config({ path: '.env.local' });
dotenv.config();

const app = express();
const port = Number.parseInt(process.env.API_PORT ?? '5174', 10);

app.use(express.json({ limit: '128kb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'carddamda' });
});

app.post('/api/search', async (req, res) => {
  res.json(await buildSearchSessionResponse(req.body?.requests, process.env));
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
