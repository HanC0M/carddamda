import dotenv from 'dotenv';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSearchSessionResponse } from './api/searchSession.js';
import {
  KeywordRuleStoreNotConfiguredError,
  submitKeywordRuleSuggestion
} from './adapters/rules/supabaseKeywordRules.js';
import {
  FeedbackStoreNotConfiguredError,
  submitFeedback,
  type FeedbackType
} from './adapters/feedback/supabaseFeedback.js';

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

app.post('/api/keyword-rules', async (req, res) => {
  try {
    const result = await submitKeywordRuleSuggestion(
      {
        sourceKeyword: String(req.body?.sourceKeyword ?? ''),
        targetKeyword: String(req.body?.targetKeyword ?? '')
      },
      process.env
    );

    if (!result) {
      res.status(400).json({ error: 'Invalid keyword rule suggestion' });
      return;
    }

    res.status(202).json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof KeywordRuleStoreNotConfiguredError) {
      res.status(503).json({ error: 'Keyword rule store is not configured' });
      return;
    }

    console.error('keyword_rule_suggestion_failed', error);
    res.status(500).json({ error: 'Keyword rule suggestion failed' });
  }
});

app.post('/api/feedback', async (req, res) => {
  try {
    const result = await submitFeedback(
      {
        type: String(req.body?.type ?? '') as FeedbackType,
        content: String(req.body?.content ?? '')
      },
      process.env
    );

    if (!result) {
      res.status(400).json({ error: 'Invalid feedback' });
      return;
    }

    res.status(202).json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof FeedbackStoreNotConfiguredError) {
      res.status(202).json({ ok: true, id: null, storage: 'analytics-only' });
      return;
    }

    console.error('feedback_submission_failed', error);
    res.status(202).json({ ok: true, id: null, storage: 'analytics-only' });
  }
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
