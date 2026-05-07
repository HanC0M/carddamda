import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { SearchResultGroup } from '../domain/search/types';
import type { ValidKeywordSearchRule } from '../domain/search/keywordRules';
import {
  createPurchaseRequestRow,
  toValidPurchaseRequests,
  validatePurchaseRows,
  type PurchaseRequestRow,
  type ValidatedPurchaseRequestRow
} from '../domain/session/validation';
import { trackEvent } from './analytics';
import { loadKeywordRules, saveKeywordRules, upsertKeywordRule } from './keywordRuleStorage';
import './styles.css';

const initialRows: PurchaseRequestRow[] = [];
const DEFAULT_EXPANDED_RESULT_GROUPS = 3;

type SessionState = 'idle' | 'searching' | 'results';

function App() {
  const [rows, setRows] = useState<PurchaseRequestRow[]>(initialRows);
  const [groups, setGroups] = useState<SearchResultGroup[]>([]);
  const [sessionState, setSessionState] = useState<SessionState>('idle');
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => new Set());
  const [keywordRules, setKeywordRules] = useState<ValidKeywordSearchRule[]>(() =>
    typeof window === 'undefined' ? [] : loadKeywordRules()
  );

  const validated = useMemo(() => validatePurchaseRows(rows), [rows]);
  const validRequests = useMemo(() => toValidPurchaseRequests(validated), [validated]);

  const runSearch = async () => {
    if (validRequests.length === 0) return;

    setSessionState('searching');
    setSessionError(null);

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: validRequests, keywordRules })
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
        keywordRuleCount: keywordRules.length,
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

  const toggleGroup = (requestId: string) => {
    setCollapsedGroups((current) => {
      const next = new Set(current);
      if (next.has(requestId)) {
        next.delete(requestId);
      } else {
        next.add(requestId);
      }
      return next;
    });
  };

  const retryGroup = async (
    requestId: string,
    keywordRulesOverride: ValidKeywordSearchRule[] = keywordRules
  ) => {
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
        body: JSON.stringify({ requests: [request], keywordRules: keywordRulesOverride })
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

  const addKeywordRule = (sourceKeyword: string, targetKeyword: string) => {
    const nextRules = upsertKeywordRule(keywordRules, { sourceKeyword, targetKeyword });
    if (nextRules === keywordRules) return null;

    setKeywordRules(nextRules);
    saveKeywordRules(nextRules);
    trackEvent('Keyword Rule Added', {
      sourceKeyword: nextRules[0]?.sourceKeyword ?? null,
      targetKeyword: nextRules[0]?.targetKeyword ?? null,
      keywordRuleCount: nextRules.length
    });
    return nextRules;
  };

  const updateRow = (id: string, patch: Partial<PurchaseRequestRow>) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const deleteRow = (id: string) => {
    setRows((current) => current.filter((row) => row.id !== id));
  };

  const addRow = () => {
    const next = createPurchaseRequestRow();
    setRows((current) => [...current, next]);
    window.setTimeout(() => {
      document.querySelector<HTMLInputElement>(`[data-row="${next.id}"] input[name="searchTerm"]`)?.focus();
    }, 20);
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
      <CommandRow
        validCount={validRequests.length}
        sessionState={sessionState}
        onSearch={runSearch}
      />
      <main className="sc-body">
        <SessionPanel
          rows={validated}
          onAdd={addRow}
          onDelete={deleteRow}
          onUpdate={updateRow}
          onRowKeyDown={onRowKeyDown}
        />
        <ResultsWorkspace
          groups={groups}
          rows={validated}
          sessionState={sessionState}
          sessionError={sessionError}
          onRetry={retryGroup}
          onAddKeywordRule={addKeywordRule}
          collapsedGroups={collapsedGroups}
          onToggleGroup={toggleGroup}
        />
      </main>
    </div>
  );
}

function buildDefaultCollapsedGroups(groups: SearchResultGroup[]) {
  return new Set(
    groups.slice(DEFAULT_EXPANDED_RESULT_GROUPS).map((group) => group.requestId)
  );
}

function CommandRow({
  validCount,
  sessionState,
  onSearch
}: {
  validCount: number;
  sessionState: SessionState;
  onSearch: () => void;
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
      <button
        className="sc-btn sc-btn-primary"
        onClick={onSearch}
        disabled={validCount === 0 || sessionState === 'searching'}
      >
        <IconSearch />
        <span>{sessionState === 'searching' ? 'SEARCHING' : 'SEARCH'}</span>
      </button>
    </header>
  );
}

function SessionPanel({
  rows,
  onAdd,
  onDelete,
  onUpdate,
  onRowKeyDown
}: {
  rows: ValidatedPurchaseRequestRow[];
  onAdd: () => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, patch: Partial<PurchaseRequestRow>) => void;
  onRowKeyDown: (event: React.KeyboardEvent<HTMLInputElement>, index: number, id: string) => void;
}) {
  const validCount = rows.filter((row) => row.issues.length === 0).length;

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
    </aside>
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
  onAddKeywordRule,
  collapsedGroups,
  onToggleGroup
}: {
  groups: SearchResultGroup[];
  rows: ValidatedPurchaseRequestRow[];
  sessionState: SessionState;
  sessionError: string | null;
  onRetry: (requestId: string, keywordRulesOverride?: ValidKeywordSearchRule[]) => void;
  onAddKeywordRule: (
    sourceKeyword: string,
    targetKeyword: string
  ) => ValidKeywordSearchRule[] | null;
  collapsedGroups: Set<string>;
  onToggleGroup: (requestId: string) => void;
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
              onAddKeywordRule={onAddKeywordRule}
              collapsed={false}
              onToggle={onToggleGroup}
            />
          ))
        : groups.map((group) => (
            <ResultGroup
              key={group.requestId}
              group={group}
              onRetry={onRetry}
              onAddKeywordRule={onAddKeywordRule}
              collapsed={collapsedGroups.has(group.requestId)}
              onToggle={onToggleGroup}
            />
          ))}
    </section>
  );
}

function ResultGroup({
  group,
  onRetry,
  onAddKeywordRule,
  collapsed,
  onToggle
}: {
  group: SearchResultGroup;
  onRetry: (requestId: string, keywordRulesOverride?: ValidKeywordSearchRule[]) => void;
  onAddKeywordRule: (
    sourceKeyword: string,
    targetKeyword: string
  ) => ValidKeywordSearchRule[] | null;
  collapsed: boolean;
  onToggle: (requestId: string) => void;
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
          ? group.results.map((result) => <ProductRow key={result.productId} result={result} />)
          : null}
        {group.status === 'empty' ? (
          <EmptyGroup
            group={group}
            message={`"${group.searchTerm}" 결과가 없습니다`}
            onAddKeywordRule={onAddKeywordRule}
            onRetry={onRetry}
          />
        ) : null}
        {group.status === 'failed' ? (
          <EmptyGroup
            group={group}
            message={group.errorMessage ?? '검색 중 오류가 발생했습니다'}
            onAddKeywordRule={onAddKeywordRule}
            onRetry={onRetry}
            error
          />
        ) : null}
      </div>
    </article>
  );
}

function ProductRow({ result }: { result: SearchResultGroup['results'][number] }) {
  return (
    <div className="sc-prod">
      <div className="sc-prod-thumb" aria-hidden="true">
        {result.imageUrl ? <img src={result.imageUrl} alt="" /> : <span>이미지</span>}
      </div>
      <div className="sc-prod-body">
        <div className="sc-prod-name">{result.title}</div>
        <a className="sc-offer" href={result.externalUrl} target="_blank" rel="noreferrer">
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
  onAddKeywordRule,
  onRetry,
  error = false
}: {
  group: SearchResultGroup;
  message: string;
  onAddKeywordRule: (
    sourceKeyword: string,
    targetKeyword: string
  ) => ValidKeywordSearchRule[] | null;
  onRetry: (requestId: string, keywordRulesOverride?: ValidKeywordSearchRule[]) => void;
  error?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [sourceKeyword, setSourceKeyword] = useState(group.searchTerm);
  const [targetKeyword, setTargetKeyword] = useState('');
  const canSubmit =
    sourceKeyword.trim().length > 0 &&
    targetKeyword.trim().length > 0 &&
    sourceKeyword.trim() !== targetKeyword.trim();

  const saveRule = () => {
    if (!canSubmit) return;

    const nextRules = onAddKeywordRule(sourceKeyword, targetKeyword);
    if (!nextRules) return;

    setIsOpen(false);
    setTargetKeyword('');
    onRetry(group.requestId, nextRules);
  };

  return (
    <div className={error ? 'sc-error' : 'sc-empty'}>
      <div className="sc-empty-main">
        <span>{message}</span>
        {!error ? (
          <button className="sc-empty-help" onClick={() => setIsOpen((value) => !value)}>
            검색 결과가 나타나지 않나요?
          </button>
        ) : null}
        {isOpen ? (
          <div className="sc-keyword-rule">
            <p>다른 이름으로 등록된 카드라면 함께 검색할 키워드를 알려주세요.</p>
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
                placeholder="예: 체셔캣"
              />
            </label>
            <button onClick={saveRule} disabled={!canSubmit}>
              저장하고 다시 검색
            </button>
          </div>
        ) : null}
      </div>
      <div className="sc-empty-actions">
        {group.auxiliaryActions.map((action) => (
          <a key={action.id} href={action.externalUrl} target="_blank" rel="noreferrer">
            {action.label}
          </a>
        ))}
      </div>
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

createRoot(document.getElementById('root')!).render(<App />);
