import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { appendRecognizedCardsToRows } from '../domain/deck-image-recognition/normalizer.js';
import type { DeckImageRecognitionResponse } from '../domain/deck-image-recognition/types.js';
import type { SearchResultGroup } from '../domain/search/types.js';
import {
  createPurchaseRequestRow,
  toValidPurchaseRequests,
  validatePurchaseRows,
  type PurchaseRequestRow,
  type ValidatedPurchaseRequestRow
} from '../domain/session/validation.js';
import { trackEvent } from './analytics.js';
import './styles.css';

const initialRows: PurchaseRequestRow[] = [];
const DEFAULT_EXPANDED_RESULT_GROUPS = 3;

type SessionState = 'idle' | 'searching' | 'results';
type FeedbackType = 'bug' | 'shop' | 'feature' | 'other';
type DeckImportState = {
  status: 'idle' | 'reading' | 'recognizing' | 'success' | 'error';
  message: string | null;
  warnings: string[];
};

const MAX_DECK_SOURCE_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_DECK_UPLOAD_BYTES = 3 * 1024 * 1024;
const MAX_DECK_IMAGE_DIMENSION = 1600;
const initialDeckImportState: DeckImportState = {
  status: 'idle',
  message: null,
  warnings: []
};

function App() {
  const [rows, setRows] = useState<PurchaseRequestRow[]>(initialRows);
  const [groups, setGroups] = useState<SearchResultGroup[]>([]);
  const [sessionState, setSessionState] = useState<SessionState>('idle');
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => new Set());
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [deckImport, setDeckImport] = useState<DeckImportState>(initialDeckImportState);

  const validated = useMemo(() => validatePurchaseRows(rows), [rows]);
  const validRequests = useMemo(() => toValidPurchaseRequests(validated), [validated]);

  useEffect(() => {
    trackEvent('App Opened');
  }, []);

  const runSearch = async () => {
    if (validRequests.length === 0) return;

    setSessionState('searching');
    setSessionError(null);
    trackEvent('Search Started', {
      requestCount: validRequests.length,
      totalQuantity: validRequests.reduce((sum, request) => sum + request.quantity, 0)
    });

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: validRequests })
      });

      if (!response.ok) {
        throw new Error(`Search failed with ${response.status}`);
      }

      const data = (await response.json()) as { groups: SearchResultGroup[] };
      setGroups(data.groups);
      setCollapsedGroups(buildDefaultCollapsedGroups(data.groups));
      setSessionState('results');
      trackEvent('Search Completed', {
        requestCount: validRequests.length,
        emptyGroupCount: data.groups.filter((group) => group.status === 'empty').length
      });
    } catch (error) {
      setSessionError(error instanceof Error ? error.message : '검색 요청에 실패했습니다.');
      setGroups(
        validRequests.map((request) => ({
          requestId: request.id,
          searchTerm: request.searchTerm,
          quantity: request.quantity,
          status: 'failed',
          results: [],
          auxiliaryActions: [],
          errorMessage: '검색 서버에 연결할 수 없습니다.'
        }))
      );
      setCollapsedGroups(
        new Set(validRequests.slice(DEFAULT_EXPANDED_RESULT_GROUPS).map((request) => request.id))
      );
      setSessionState('results');
      trackEvent('Search Failed', { requestCount: validRequests.length });
    }
  };

  const importDeckImage = async (file: File) => {
    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      setDeckImport({
        status: 'error',
        message: 'jpg, png, webp 이미지만 업로드할 수 있습니다.',
        warnings: []
      });
      return;
    }

    if (file.size > MAX_DECK_SOURCE_IMAGE_BYTES) {
      setDeckImport({
        status: 'error',
        message: '원본 이미지는 12MB 이하로 업로드해주세요.',
        warnings: []
      });
      return;
    }

    try {
      setDeckImport({ status: 'reading', message: '이미지를 준비하는 중입니다.', warnings: [] });
      const imageDataUrl = await prepareDeckImageDataUrl(file);

      setDeckImport({ status: 'recognizing', message: '덱 이미지를 인식하는 중입니다.', warnings: [] });
      trackEvent('Deck Image Import Started', {
        size: file.size,
        type: file.type
      });

      const response = await fetch('/api/deck-image-recognition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageDataUrl, sourceHint: 'unknown' })
      });
      const data = (await response.json()) as DeckImageRecognitionResponse | { error?: string };

      if (!response.ok) {
        throw new Error('error' in data ? data.error : '덱 이미지 인식에 실패했습니다.');
      }

      const recognition = data as DeckImageRecognitionResponse;
      setRows((current) => appendRecognizedCardsToRows(current, recognition.recognized));
      setDeckImport({
        status: 'success',
        message:
          recognition.recognized.length > 0
            ? `${recognition.recognized.length}개 카드를 구매 요청에 추가했습니다.`
            : '인식된 카드가 없습니다.',
        warnings: buildDeckImportWarnings(recognition)
      });
      trackEvent('Deck Image Import Completed', {
        recognizedCount: recognition.recognized.length,
        unresolvedCount: recognition.unresolved.length,
        warningCount: recognition.warnings.length,
        sourceTemplate: recognition.sourceTemplate
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '덱 이미지 인식에 실패했습니다.';
      setDeckImport({ status: 'error', message, warnings: [] });
      trackEvent('Deck Image Import Failed', { message });
    }
  };

  const toggleGroup = (requestId: string) => {
    setCollapsedGroups((current) => {
      const next = new Set(current);
      if (next.has(requestId)) {
        next.delete(requestId);
      } else {
        next.add(requestId);
      }
      trackEvent('Result Group Toggled', {
        requestId,
        collapsed: next.has(requestId)
      });
      return next;
    });
  };

  const retryGroup = async (requestId: string) => {
    const request = validRequests.find((item) => item.id === requestId);
    if (!request) return;

    setGroups((current) =>
      current.map((group) =>
        group.requestId === requestId ? { ...group, status: 'loading', errorMessage: null } : group
      )
    );

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [request] })
      });

      if (!response.ok) throw new Error(`Retry failed with ${response.status}`);
      const data = (await response.json()) as { groups: SearchResultGroup[] };
      const nextGroup = data.groups[0];

      setGroups((current) =>
        current.map((group) => (group.requestId === requestId ? nextGroup : group))
      );
      trackEvent('Result Group Retried', {
        searchTerm: request.searchTerm,
        resultCount: nextGroup.results.length,
        status: nextGroup.status
      });
    } catch (error) {
      setGroups((current) =>
        current.map((group) =>
          group.requestId === requestId
            ? {
                ...group,
                status: 'failed',
                errorMessage: error instanceof Error ? error.message : '재시도에 실패했습니다.'
              }
            : group
        )
      );
    }
  };

  const suggestKeywordRule = async (sourceKeyword: string, targetKeyword: string) => {
    try {
      const response = await fetch('/api/keyword-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceKeyword, targetKeyword })
      });

      if (!response.ok) {
        throw new Error(`Keyword rule suggestion failed with ${response.status}`);
      }

      const result = (await response.json()) as { status?: string; duplicate?: boolean };
      trackEvent('Keyword Rule Suggested', {
        sourceKeyword,
        targetKeyword,
        status: result.status ?? 'pending',
        duplicate: Boolean(result.duplicate)
      });
      return true;
    } catch (error) {
      trackEvent('Keyword Rule Suggestion Failed', {
        sourceKeyword,
        targetKeyword,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  };

  const submitFeedbackRequest = async (type: FeedbackType, content: string) => {
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, content })
      });

      if (!response.ok) {
        throw new Error(`Feedback submission failed with ${response.status}`);
      }

      const result = (await response.json()) as { storage?: string };
      trackEvent('Feedback Submitted', {
        type,
        storage: result.storage ?? 'unknown'
      });
      return true;
    } catch (error) {
      trackEvent('Feedback Submission Failed', {
        type,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  };

  const updateRow = (id: string, patch: Partial<PurchaseRequestRow>) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const deleteRow = (id: string) => {
    setRows((current) => current.filter((row) => row.id !== id));
    trackEvent('Purchase Row Deleted', { rowCount: Math.max(rows.length - 1, 0) });
  };

  const addRow = () => {
    const next = createPurchaseRequestRow();
    setRows((current) => [...current, next]);
    trackEvent('Purchase Row Added', { rowCount: rows.length + 1 });
    window.setTimeout(() => {
      document.querySelector<HTMLInputElement>(`[data-row="${next.id}"] input[name="searchTerm"]`)?.focus();
    }, 20);
  };

  const openFeedback = () => {
    setFeedbackOpen(true);
    trackEvent('Feedback Opened');
  };

  const closeFeedback = () => {
    setFeedbackOpen(false);
    trackEvent('Feedback Closed');
  };

  const trackOutboundClick = (kind: string, merchantName?: string) => {
    trackEvent('Outbound Link Clicked', {
      kind,
      merchantName: merchantName ?? null
    });
  };

  const onRowKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
    index: number,
    id: string
  ) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (index === rows.length - 1) {
        addRow();
      } else {
        const next = rows[index + 1];
        document
          .querySelector<HTMLInputElement>(`[data-row="${next.id}"] input[name="searchTerm"]`)
          ?.focus();
      }
    }

    if (event.key === 'Backspace' && event.currentTarget.value === '' && rows.length > 1) {
      event.preventDefault();
      const previous = rows[index - 1];
      deleteRow(id);
      window.setTimeout(() => {
        if (previous) {
          document
            .querySelector<HTMLInputElement>(`[data-row="${previous.id}"] input[name="searchTerm"]`)
            ?.focus();
        }
      }, 20);
    }
  };

  return (
    <div className="sc-shell">
      <CommandRow onOpenFeedback={openFeedback} />
      <main className="sc-body">
        <SessionPanel
          rows={validated}
          validCount={validRequests.length}
          sessionState={sessionState}
          onAdd={addRow}
          onDelete={deleteRow}
          onUpdate={updateRow}
          onRowKeyDown={onRowKeyDown}
          onSearch={runSearch}
          deckImport={deckImport}
          onDeckImageSelected={importDeckImage}
        />
        <ResultsWorkspace
          groups={groups}
          rows={validated}
          sessionState={sessionState}
          sessionError={sessionError}
          onRetry={retryGroup}
          onSuggestKeywordRule={suggestKeywordRule}
          collapsedGroups={collapsedGroups}
          onToggleGroup={toggleGroup}
          onOutboundClick={trackOutboundClick}
        />
      </main>
      <AppFooter />
      <FeedbackDialog
        open={feedbackOpen}
        onClose={closeFeedback}
        onSubmit={submitFeedbackRequest}
      />
    </div>
  );
}

async function prepareDeckImageDataUrl(file: File): Promise<string> {
  const image = await loadImage(file);
  const scale = Math.min(1, MAX_DECK_IMAGE_DIMENSION / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('이미지를 처리할 수 없습니다.');
  }

  context.drawImage(image, 0, 0, width, height);

  for (const quality of [0.86, 0.74, 0.62]) {
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    if (estimateDataUrlBytes(dataUrl) <= MAX_DECK_UPLOAD_BYTES) {
      return dataUrl;
    }
  }

  throw new Error('이미지 용량을 줄일 수 없습니다. 더 작은 스크린샷을 업로드해주세요.');
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('이미지를 읽을 수 없습니다.'));
    };
    image.src = url;
  });
}

function estimateDataUrlBytes(dataUrl: string) {
  const base64 = dataUrl.split(',')[1] ?? '';
  return Math.floor((base64.length * 3) / 4);
}

function buildDeckImportWarnings(recognition: DeckImageRecognitionResponse) {
  const warnings = [...recognition.warnings];
  if (recognition.unresolved.length > 0) {
    warnings.push(`${recognition.unresolved.length}개 카드는 인식하지 못했습니다.`);
  }
  return warnings;
}

function buildDefaultCollapsedGroups(groups: SearchResultGroup[]) {
  return new Set(
    groups.slice(DEFAULT_EXPANDED_RESULT_GROUPS).map((group) => group.requestId)
  );
}

function CommandRow({
  onOpenFeedback
}: {
  onOpenFeedback: () => void;
}) {
  return (
    <header className="sc-cmd">
      <div className="sc-brand">
        <div className="sc-brand-mark">CD</div>
        <div>
          <div className="sc-brand-name">카드담다</div>
          <div className="sc-brand-sub">purchase session accelerator</div>
        </div>
      </div>
      <button className="sc-btn sc-btn-secondary" onClick={onOpenFeedback}>
        건의 및 요청하기
      </button>
    </header>
  );
}

function SessionPanel({
  rows,
  validCount,
  sessionState,
  onAdd,
  onDelete,
  onUpdate,
  onRowKeyDown,
  onSearch,
  deckImport,
  onDeckImageSelected
}: {
  rows: ValidatedPurchaseRequestRow[];
  validCount: number;
  sessionState: SessionState;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, patch: Partial<PurchaseRequestRow>) => void;
  onRowKeyDown: (event: React.KeyboardEvent<HTMLInputElement>, index: number, id: string) => void;
  onSearch: () => void;
  deckImport: DeckImportState;
  onDeckImageSelected: (file: File) => void;
}) {
  const importBusy = deckImport.status === 'reading' || deckImport.status === 'recognizing';

  return (
    <aside className="sc-panel">
      <div className="sc-panel-head">
        <h2>구매 요청</h2>
        <span className="sc-panel-count">{validCount}개 검색어</span>
      </div>
      <div className="sc-rows">
        {rows.map((row, index) => (
          <RequestRow
            key={row.id}
            row={row}
            onDelete={() => onDelete(row.id)}
            onUpdate={(patch) => onUpdate(row.id, patch)}
            onKeyDown={(event) => onRowKeyDown(event, index, row.id)}
          />
        ))}
      </div>
      {rows.length === 0 ? (
        <div className="sc-panel-empty">
          <IconSearch />
          <strong>구매할 카드를 추가하세요</strong>
          <p>카드명과 수량을 행 단위로 넣으면 결과가 요청 카드별로 묶여 표시됩니다.</p>
        </div>
      ) : null}
      <button className="sc-add-row" onClick={onAdd}>
        <IconPlus /> 행 추가
      </button>
      <DeckImageImportControl
        busy={importBusy}
        state={deckImport}
        onDeckImageSelected={onDeckImageSelected}
      />
      <button
        className="sc-btn sc-btn-primary sc-panel-search"
        onClick={onSearch}
        disabled={validCount === 0 || sessionState === 'searching'}
      >
        <IconSearch />
        <span>{sessionState === 'searching' ? '검색 중' : '검색'}</span>
      </button>
    </aside>
  );
}

function DeckImageImportControl({
  busy,
  state,
  onDeckImageSelected
}: {
  busy: boolean;
  state: DeckImportState;
  onDeckImageSelected: (file: File) => void;
}) {
  return (
    <div className={`sc-deck-import is-${state.status}`}>
      <label className={`sc-deck-import-trigger ${busy ? 'is-disabled' : ''}`}>
        <IconImage />
        <span>{busy ? '이미지 인식 중' : '뉴런/마듀 덱 이미지 등록'}</span>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={busy}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = '';
            if (file) onDeckImageSelected(file);
          }}
        />
      </label>
      {state.message ? <div className="sc-deck-import-message">{state.message}</div> : null}
      {state.warnings.length > 0 ? (
        <ul className="sc-deck-import-warnings">
          {state.warnings.slice(0, 3).map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function AppFooter() {
  return (
    <footer className="sc-footer">
      <div className="sc-footer-meta">
        <span>개발자 기멘무 (@gimenmu)</span>
        <a
          href="mailto:duelmatch2026@gmail.com"
          onClick={() => trackEvent('Developer Contact Clicked')}
        >
          duelmatch2026@gmail.com
        </a>
      </div>
      <nav className="sc-footer-links" aria-label="서비스 문서">
        <a
          href="/terms.html"
          target="_blank"
          rel="noreferrer"
          onClick={() => trackEvent('Legal Link Clicked', { document: 'terms' })}
        >
          이용약관
        </a>
        <a
          href="/privacy.html"
          target="_blank"
          rel="noreferrer"
          onClick={() => trackEvent('Legal Link Clicked', { document: 'privacy' })}
        >
          개인정보 처리방침
        </a>
      </nav>
    </footer>
  );
}

function RequestRow({
  row,
  onDelete,
  onUpdate,
  onKeyDown
}: {
  row: ValidatedPurchaseRequestRow;
  onDelete: () => void;
  onUpdate: (patch: Partial<PurchaseRequestRow>) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
}) {
  const issue = row.issues[0];

  return (
    <div className={`sc-row ${issue ? 'has-issue' : ''}`} data-row={row.id}>
      <div className="sc-row-q">
        <input
          name="searchTerm"
          value={row.searchTerm}
          placeholder="카드 이름"
          onChange={(event) => onUpdate({ searchTerm: event.target.value })}
          onKeyDown={onKeyDown}
          spellCheck={false}
          autoComplete="off"
        />
        {issue ? (
          <span className={`sc-row-issue is-${issue.type}`}>
            <IconWarn />
            {issue.message}
          </span>
        ) : null}
      </div>
      <input
        name="quantity"
        type="number"
        min="1"
        max="99"
        value={row.quantity}
        onChange={(event) => onUpdate({ quantity: Number.parseInt(event.target.value || '0', 10) })}
        className="sc-row-qty"
        aria-label={`${row.searchTerm || '새 카드'} 수량`}
      />
      <button className="sc-row-del" onClick={onDelete} title="삭제" aria-label="행 삭제">
        <IconTrash />
      </button>
    </div>
  );
}

function ResultsWorkspace({
  groups,
  rows,
  sessionState,
  sessionError,
  onRetry,
  onSuggestKeywordRule,
  collapsedGroups,
  onToggleGroup,
  onOutboundClick
}: {
  groups: SearchResultGroup[];
  rows: ValidatedPurchaseRequestRow[];
  sessionState: SessionState;
  sessionError: string | null;
  onRetry: (requestId: string) => void;
  onSuggestKeywordRule: (
    sourceKeyword: string,
    targetKeyword: string
  ) => Promise<boolean>;
  collapsedGroups: Set<string>;
  onToggleGroup: (requestId: string) => void;
  onOutboundClick: (kind: string, merchantName?: string) => void;
}) {
  if (sessionState === 'idle') {
    return (
      <section className="sc-results sc-idle">
        <div className="sc-idle-card">
          <IconSearch />
          <p>왼쪽에서 카드를 추가하고 검색을 실행하세요</p>
        </div>
      </section>
    );
  }

  const validRows = rows.filter((row) => row.issues.length === 0);

  return (
    <section className="sc-results">
      <header className="sc-results-head">
        <h2>검색 결과</h2>
        <span className="sc-results-count">{validRows.length} 그룹</span>
      </header>
      {sessionError ? <div className="sc-session-error">{sessionError}</div> : null}
      {sessionState === 'searching'
        ? validRows.map((row) => (
            <ResultGroup
              key={row.id}
              group={{
                requestId: row.id,
                searchTerm: row.searchTerm,
                quantity: row.quantity,
                status: 'loading',
                results: [],
                auxiliaryActions: [],
                errorMessage: null
              }}
              onRetry={onRetry}
              onSuggestKeywordRule={onSuggestKeywordRule}
              collapsed={false}
              onToggle={onToggleGroup}
              onOutboundClick={onOutboundClick}
            />
          ))
        : groups.map((group) => (
            <ResultGroup
              key={group.requestId}
              group={group}
              onRetry={onRetry}
              onSuggestKeywordRule={onSuggestKeywordRule}
              collapsed={collapsedGroups.has(group.requestId)}
              onToggle={onToggleGroup}
              onOutboundClick={onOutboundClick}
            />
          ))}
    </section>
  );
}

function ResultGroup({
  group,
  onRetry,
  onSuggestKeywordRule,
  collapsed,
  onToggle,
  onOutboundClick
}: {
  group: SearchResultGroup;
  onRetry: (requestId: string) => void;
  onSuggestKeywordRule: (
    sourceKeyword: string,
    targetKeyword: string
  ) => Promise<boolean>;
  collapsed: boolean;
  onToggle: (requestId: string) => void;
  onOutboundClick: (kind: string, merchantName?: string) => void;
}) {
  const statusLabel = {
    idle: '대기',
    loading: '검색 중',
    success: `${group.results.length}건`,
    empty: '결과 없음',
    partial: `부분 실패 · ${group.results.length}건`,
    failed: '오류'
  }[group.status];

  return (
    <article className={`sc-group is-${group.status}`}>
      <header className="sc-group-head">
        <button
          className="sc-group-toggle"
          onClick={() => onToggle(group.requestId)}
          aria-expanded={!collapsed}
        >
          <IconChevron collapsed={collapsed} />
          <span className="sc-group-title">
            {group.searchTerm} <span className="sc-group-qty">×{group.quantity}</span>
          </span>
        </button>
        <span className={`sc-group-state is-${group.status}`}>
          {group.status === 'loading' ? <span className="sc-spin" /> : null}
          {statusLabel}
        </span>
        {group.status === 'failed' || group.status === 'partial' ? (
          <button className="sc-btn sc-btn-pill" onClick={() => onRetry(group.requestId)}>
            <IconRefresh /> 재시도
          </button>
        ) : null}
      </header>
      <div className="sc-group-body" hidden={collapsed}>
        {group.status === 'loading' ? <LoadingRows /> : null}
        {group.status === 'success' || group.status === 'partial'
          ? group.results.map((result) => (
              <ProductRow
                key={result.productId}
                result={result}
                onOutboundClick={onOutboundClick}
              />
            ))
          : null}
        {group.status === 'empty' ? (
          <EmptyGroup
            group={group}
            message={`"${group.searchTerm}" 결과가 없습니다`}
            onSuggestKeywordRule={onSuggestKeywordRule}
            onRetry={onRetry}
            onOutboundClick={onOutboundClick}
          />
        ) : null}
        {group.status === 'failed' ? (
          <EmptyGroup
            group={group}
            message={group.errorMessage ?? '검색 중 오류가 발생했습니다'}
            onSuggestKeywordRule={onSuggestKeywordRule}
            onRetry={onRetry}
            onOutboundClick={onOutboundClick}
            error
          />
        ) : null}
      </div>
    </article>
  );
}

function ProductRow({
  result,
  onOutboundClick
}: {
  result: SearchResultGroup['results'][number];
  onOutboundClick: (kind: string, merchantName?: string) => void;
}) {
  return (
    <div className="sc-prod">
      <div className="sc-prod-thumb" aria-hidden="true">
        {result.imageUrl ? <img src={result.imageUrl} alt="" /> : <span>이미지</span>}
      </div>
      <div className="sc-prod-body">
        <div className="sc-prod-name">{result.title}</div>
        <a
          className="sc-offer"
          href={result.externalUrl}
          target="_blank"
          rel="noreferrer"
          onClick={() => onOutboundClick('product', result.merchantName)}
        >
          <span className="sc-offer-store">
            {result.sourceTags.includes('tcgshop-via-naver') ? (
              <span className="sc-provider-badge">TCGShop</span>
            ) : null}
            {result.merchantName}
          </span>
          <span className="sc-offer-price">{formatKrw(result.price)}</span>
          <IconExternalLink />
        </a>
      </div>
    </div>
  );
}

function EmptyGroup({
  group,
  message,
  onSuggestKeywordRule,
  onRetry,
  onOutboundClick,
  error = false
}: {
  group: SearchResultGroup;
  message: string;
  onSuggestKeywordRule: (
    sourceKeyword: string,
    targetKeyword: string
  ) => Promise<boolean>;
  onRetry: (requestId: string) => void;
  onOutboundClick: (kind: string, merchantName?: string) => void;
  error?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [sourceKeyword, setSourceKeyword] = useState(group.searchTerm);
  const [targetKeyword, setTargetKeyword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const canSubmit =
    sourceKeyword.trim().length > 0 &&
    targetKeyword.trim().length > 0 &&
    sourceKeyword.trim() !== targetKeyword.trim();

  const saveRule = async () => {
    if (!canSubmit || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitMessage(null);
    const ok = await onSuggestKeywordRule(sourceKeyword, targetKeyword);
    setIsSubmitting(false);

    if (ok) {
      setTargetKeyword('');
      setSubmitMessage('검색 개선에 함께 해주셔서 감사합니다.');
      return;
    }

    setSubmitMessage('접수에 실패했습니다. 잠시 후 다시 시도해주세요.');
  };

  return (
    <div className={error ? 'sc-error' : 'sc-empty'}>
      <div className="sc-empty-main">
        <span>{message}</span>
        {!error ? (
          <button
            className="sc-empty-help"
            onClick={() => {
              const nextOpen = !isOpen;
              setIsOpen(nextOpen);
              trackEvent('Keyword Suggestion Form Toggled', { open: nextOpen });
            }}
          >
            검색 결과가 나타나지 않나요?
          </button>
        ) : null}
        {isOpen ? (
          <div className="sc-keyword-rule">
            <p>다른 이름으로 등록된 카드라면 함께 검색할 키워드를 알려주세요. 확인 후 반영됩니다.</p>
            <label>
              <span>찾고 싶은 키워드</span>
              <input
                value={sourceKeyword}
                onChange={(event) => setSourceKeyword(event.target.value)}
                placeholder="예: 체셔 캣"
              />
            </label>
            <label>
              <span>같이 검색할 키워드</span>
              <input
                value={targetKeyword}
                onChange={(event) => setTargetKeyword(event.target.value)}
                placeholder="카드명을 가능한 정확하게 입력해주세요."
              />
            </label>
            <button onClick={saveRule} disabled={!canSubmit || isSubmitting}>
              {isSubmitting ? '보내는 중' : '제안 보내기'}
            </button>
            {submitMessage ? <div className="sc-keyword-rule-message">{submitMessage}</div> : null}
          </div>
        ) : null}
      </div>
      <div className="sc-empty-actions">
        {group.auxiliaryActions.map((action) => (
          <a
            key={action.id}
            href={action.externalUrl}
            target="_blank"
            rel="noreferrer"
            onClick={() => onOutboundClick('auxiliary-action')}
          >
            {action.label}
          </a>
        ))}
      </div>
    </div>
  );
}

function FeedbackDialog({
  open,
  onClose,
  onSubmit
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (type: FeedbackType, content: string) => Promise<boolean>;
}) {
  const [type, setType] = useState<FeedbackType>('bug');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const canSubmit = content.trim().length > 0 && content.trim().length <= 2000;

  if (!open) return null;

  const submit = async () => {
    if (!canSubmit || submitting) return;

    setSubmitting(true);
    setMessage(null);
    const ok = await onSubmit(type, content);
    setSubmitting(false);

    if (ok) {
      setContent('');
      setType('bug');
      setMessage('건의가 접수되었습니다.');
      window.setTimeout(onClose, 700);
      return;
    }

    setMessage('접수에 실패했습니다. 잠시 후 다시 시도해주세요.');
  };

  return (
    <div className="sc-feedback-overlay" role="presentation" onMouseDown={onClose}>
      <section
        className="sc-feedback-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="sc-feedback-head">
          <h2 id="feedback-title">건의 및 요청하기</h2>
          <button onClick={onClose} aria-label="닫기">
            <IconClose />
          </button>
        </header>
        <div className="sc-feedback-form">
          <label>
            <span>건의 유형</span>
            <select value={type} onChange={(event) => setType(event.target.value as FeedbackType)}>
              <option value="bug">버그 제보</option>
              <option value="shop">샵 추가 건의</option>
              <option value="feature">기능 추가 건의</option>
              <option value="other">기타</option>
            </select>
          </label>
          <label>
            <span>내용</span>
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="불편한 점이나 필요한 기능을 적어주세요."
              maxLength={2000}
              rows={7}
            />
          </label>
          <div className="sc-feedback-foot">
            {message ? <span>{message}</span> : <span>{content.trim().length}/2000</span>}
            <button className="sc-btn sc-btn-primary" onClick={submit} disabled={!canSubmit || submitting}>
              {submitting ? '보내는 중' : '보내기'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="sc-loading">
      <div className="sc-skel sc-skel-line" />
      <div className="sc-skel sc-skel-line w60" />
    </div>
  );
}

function formatKrw(value: number | null) {
  if (value === null) return '가격 정보 없음';
  return `₩${value.toLocaleString('ko-KR')}`;
}

function IconPlus() {
  return <svg viewBox="0 0 16 16"><path fill="currentColor" d="M7.25 2.5h1.5v4h4v1.5h-4v4h-1.5v-4h-4V6.5h4z" /></svg>;
}

function IconTrash() {
  return <svg viewBox="0 0 16 16"><path fill="currentColor" d="M6 2h4l.5 1H14v1.5H2V3h3.5zM3.5 5h9l-.7 8.2a1.6 1.6 0 0 1-1.6 1.5H5.8a1.6 1.6 0 0 1-1.6-1.5z" /></svg>;
}

function IconSearch() {
  return <svg viewBox="0 0 16 16"><path fill="currentColor" fillRule="evenodd" d="M7 1a6 6 0 1 0 3.7 10.74l3.28 3.28 1.06-1.06-3.28-3.28A6 6 0 0 0 7 1m0 1.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9" /></svg>;
}

function IconImage() {
  return <svg viewBox="0 0 16 16"><path fill="currentColor" d="M2.5 3A1.5 1.5 0 0 1 4 1.5h8A1.5 1.5 0 0 1 13.5 3v10A1.5 1.5 0 0 1 12 14.5H4A1.5 1.5 0 0 1 2.5 13zm1.5 0v6.4l2.1-2.1 2.1 2.1 3.8-3.8V3zm0 10h8V7.72l-3.8 3.8-2.1-2.1L4 11.52zm2.25-8.25a1.25 1.25 0 1 1 2.5 0 1.25 1.25 0 0 1-2.5 0" /></svg>;
}

function IconExternalLink() {
  return <svg viewBox="0 0 16 16"><path fill="currentColor" d="M9 2h5v5h-1.5V4.56L7.06 10 6 8.94 11.44 3.5H9zM3 4h4v1.5H4.5v6h6V9H12v4H3z" /></svg>;
}

function IconRefresh() {
  return <svg viewBox="0 0 16 16"><path fill="currentColor" d="M8 2.5a5.5 5.5 0 0 1 4.7 2.65l1-1V7.5h-3.6l1.4-1.4A4 4 0 1 0 12 8h1.5A5.5 5.5 0 1 1 8 2.5" /></svg>;
}

function IconWarn() {
  return <svg viewBox="0 0 16 16"><path fill="currentColor" d="M8 1.4 15 14H1zM7.25 6v3.5h1.5V6zm0 4.75v1.5h1.5v-1.5z" /></svg>;
}

function IconChevron({ collapsed }: { collapsed: boolean }) {
  return (
    <svg className={collapsed ? 'is-collapsed' : ''} viewBox="0 0 16 16">
      <path fill="currentColor" d="m4.5 6 3.5 3.5L11.5 6l-1.06-1.06L8 7.38 5.56 4.94z" />
    </svg>
  );
}

function IconClose() {
  return <svg viewBox="0 0 16 16"><path fill="currentColor" d="m3.22 4.28 1.06-1.06L8 6.94l3.72-3.72 1.06 1.06L9.06 8l3.72 3.72-1.06 1.06L8 9.06l-3.72 3.72-1.06-1.06L6.94 8z" /></svg>;
}

createRoot(document.getElementById('root')!).render(<App />);
