import { createPurchaseRequestRow, normalizeSearchTerm, type PurchaseRequestRow } from '../session/validation.js';
import type {
  DeckImageRecognitionResponse,
  DeckImageSourceHint,
  DeckSection,
  RecognizedDeckCard,
  UnresolvedDeckCard
} from './types.js';

type RawRecognizedDeckCard = {
  searchTerm?: unknown;
  quantity?: unknown;
  confidence?: unknown;
  section?: unknown;
  sourceName?: unknown;
  note?: unknown;
};

type RawUnresolvedDeckCard = {
  quantity?: unknown;
  section?: unknown;
  reason?: unknown;
};

type RawDeckRecognitionResponse = {
  sourceTemplate?: unknown;
  recognized?: unknown;
  unresolved?: unknown;
  warnings?: unknown;
};

const VALID_SOURCE_HINTS = new Set<DeckImageSourceHint>(['master_duel', 'neuron', 'unknown']);
const VALID_SECTIONS = new Set<DeckSection>(['main', 'extra', 'side', 'unknown']);

export function normalizeDeckRecognitionResponse(
  raw: RawDeckRecognitionResponse
): DeckImageRecognitionResponse {
  const warnings = normalizeWarnings(raw.warnings);
  const unresolved = normalizeUnresolvedCards(raw.unresolved);
  const recognized = normalizeRecognizedCards(raw.recognized, unresolved, warnings);

  return {
    sourceTemplate: normalizeSourceHint(raw.sourceTemplate),
    recognized,
    unresolved,
    warnings
  };
}

export function appendRecognizedCardsToRows(
  currentRows: PurchaseRequestRow[],
  recognized: RecognizedDeckCard[]
): PurchaseRequestRow[] {
  const rowsByTerm = new Map<string, PurchaseRequestRow>();
  const orderedRows = currentRows.map((row) => {
    const nextRow = { ...row };
    const key = normalizeSearchTerm(nextRow.searchTerm);
    if (key) rowsByTerm.set(key, nextRow);
    return nextRow;
  });

  for (const card of recognized) {
    const key = normalizeSearchTerm(card.searchTerm);
    const existing = rowsByTerm.get(key);

    if (existing) {
      existing.quantity = clampQuantity(existing.quantity + card.quantity);
      continue;
    }

    const next = createPurchaseRequestRow({
      searchTerm: card.searchTerm,
      quantity: card.quantity
    });
    rowsByTerm.set(key, next);
    orderedRows.push(next);
  }

  return orderedRows;
}

const AUTO_ADD_CONFIDENCE_THRESHOLD = 0.6;

function normalizeRecognizedCards(
  value: unknown,
  unresolved: UnresolvedDeckCard[],
  warnings: string[]
) {
  if (!Array.isArray(value)) return [];

  const byTerm = new Map<string, RecognizedDeckCard>();
  const bySourceName = new Map<string, string>();

  for (const item of value) {
    if (!isRecord(item)) continue;

    const searchTerm = String(item.searchTerm ?? '').trim();
    if (!searchTerm) continue;

    const quantity = clampQuantity(toInteger(item.quantity, 1));
    const confidence = clampConfidence(toNumber(item.confidence, 0));
    const key = normalizeSearchTerm(searchTerm);
    const sourceName = nullableString(item.sourceName);
    const sourceKey = sourceName ? normalizeSearchTerm(sourceName) : '';

    if (confidence > 0 && confidence < AUTO_ADD_CONFIDENCE_THRESHOLD) {
      warnings.push(`낮은 확신도로 자동 추가하지 않은 카드가 있습니다: ${searchTerm}`);
      unresolved.push({
        quantity,
        section: normalizeSection(item.section),
        reason: `낮은 확신도(${Math.round(confidence * 100)}%): ${sourceName ?? searchTerm}`
      });
      continue;
    }

    const existingSourceTermKey = sourceKey ? bySourceName.get(sourceKey) : undefined;
    if (existingSourceTermKey && existingSourceTermKey !== key) {
      const existingBySource = byTerm.get(existingSourceTermKey);
      if (!existingBySource || confidence > existingBySource.confidence) {
        if (existingBySource) {
          byTerm.delete(existingSourceTermKey);
          warnings.push(
            `같은 원문 카드명에서 서로 다른 검색어가 나와 더 높은 확신도 항목만 사용했습니다: ${sourceName}`
          );
        }
        bySourceName.set(sourceKey, key);
      } else {
        warnings.push(
          `같은 원문 카드명에서 나온 낮은 확신도 검색어를 제외했습니다: ${searchTerm}`
        );
        continue;
      }
    }

    const existing = byTerm.get(key);

    if (existing) {
      existing.quantity = clampQuantity(existing.quantity + quantity);
      existing.confidence = Math.max(existing.confidence, confidence);
      if (existing.section !== normalizeSection(item.section)) {
        existing.section = 'unknown';
      }
      continue;
    }

    if (confidence > 0 && confidence < 0.75) {
      warnings.push(`낮은 확신도로 인식된 카드가 있습니다: ${searchTerm}`);
    }

    if (sourceKey) bySourceName.set(sourceKey, key);

    byTerm.set(key, {
      searchTerm,
      quantity,
      confidence,
      section: normalizeSection(item.section),
      sourceName,
      note: nullableString(item.note)
    });
  }

  return [...byTerm.values()];
}

function normalizeUnresolvedCards(value: unknown): UnresolvedDeckCard[] {
  if (!Array.isArray(value)) return [];

  return value.filter(isRecord).map((item) => ({
    quantity: clampQuantity(toInteger(item.quantity, 1)),
    section: normalizeSection(item.section),
    reason: String(item.reason ?? '인식되지 않은 카드').trim() || '인식되지 않은 카드'
  }));
}

function normalizeWarnings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => String(item ?? '').trim())
    .filter(Boolean)
    .slice(0, 12);
}

function normalizeSourceHint(value: unknown): DeckImageSourceHint {
  const hint = String(value ?? 'unknown') as DeckImageSourceHint;
  return VALID_SOURCE_HINTS.has(hint) ? hint : 'unknown';
}

function normalizeSection(value: unknown): DeckSection {
  const section = String(value ?? 'unknown') as DeckSection;
  return VALID_SECTIONS.has(section) ? section : 'unknown';
}

function nullableString(value: unknown) {
  const text = String(value ?? '').trim();
  return text.length > 0 ? text : null;
}

function toInteger(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isInteger(number) ? number : fallback;
}

function toNumber(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clampQuantity(value: number) {
  return Math.min(Math.max(value, 1), 99);
}

function clampConfidence(value: number) {
  return Math.min(Math.max(value, 0), 1);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
