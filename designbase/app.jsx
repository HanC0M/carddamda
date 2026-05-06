/* global React, ReactDOM, TweaksPanel, useTweaks, TweakSection, TweakRadio, TweakColor */
const { useState, useMemo } = React;

/* ---------- Icons ---------- */
const Icon = {
  Plus: (p) => <svg viewBox="0 0 16 16" width="14" height="14" {...p}><path fill="currentColor" d="M7.25 2.5h1.5v4h4v1.5h-4v4h-1.5v-4h-4V6.5h4z"/></svg>,
  Trash: (p) => <svg viewBox="0 0 16 16" width="14" height="14" {...p}><path fill="currentColor" d="M6 2h4l.5 1H14v1.5H2V3h3.5zM3.5 5h9l-.7 8.2a1.6 1.6 0 0 1-1.6 1.5H5.8a1.6 1.6 0 0 1-1.6-1.5z"/></svg>,
  Search: (p) => <svg viewBox="0 0 16 16" width="14" height="14" {...p}><path fill="currentColor" fillRule="evenodd" d="M7 1a6 6 0 1 0 3.7 10.74l3.28 3.28 1.06-1.06-3.28-3.28A6 6 0 0 0 7 1m0 1.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9"/></svg>,
  ExternalLink: (p) => <svg viewBox="0 0 16 16" width="11" height="11" {...p}><path fill="currentColor" d="M9 2h5v5h-1.5V4.56L7.06 10 6 8.94 11.44 3.5H9zM3 4h4v1.5H4.5v6h6V9H12v4H3z"/></svg>,
  Refresh: (p) => <svg viewBox="0 0 16 16" width="13" height="13" {...p}><path fill="currentColor" d="M8 2.5a5.5 5.5 0 0 1 4.7 2.65l1-1V7.5h-3.6l1.4-1.4A4 4 0 1 0 12 8h1.5A5.5 5.5 0 1 1 8 2.5"/></svg>,
  Warn: (p) => <svg viewBox="0 0 16 16" width="11" height="11" {...p}><path fill="currentColor" d="M8 1.4 15 14H1zM7.25 6v3.5h1.5V6zm0 4.75v1.5h1.5v-1.5z"/></svg>,
  Chevron: (p) => <svg viewBox="0 0 16 16" width="12" height="12" {...p}><path fill="currentColor" d="m4.5 6 3.5 3.5L11.5 6l-1.06-1.06L8 7.38 5.56 4.94z"/></svg>,
};

/* ---------- Mock data ---------- */
const initialRows = [
  { id: 'r1', q: '피카츄 ex', n: 2 },
  { id: 'r2', q: '리자몽 VMAX', n: 1 },
  { id: 'r3', q: '나오하', n: 3 },
  { id: 'r4', q: '루기아 VSTAR', n: 1 },
  { id: 'r7', q: '미라이돈 ex', n: 2 },
  { id: 'r5', q: '', n: 1 },
  { id: 'r6', q: '피카츄 ex', n: 1 },
];

const productResults = {
  '피카츄 ex': {
    state: 'ok',
    items: [
      {
        id:'c1',
        name:'포켓몬 카드 게임 스칼렛&바이올렛 피카츄 ex SAR',
        offers:[
          { id:'o1a', store:'카드매니아',  price:48000 },
          { id:'o1b', store:'TCG라운지',   price:46500 },
          { id:'o1c', store:'덱빌더샵',    price:49900 },
        ],
      },
      {
        id:'c2',
        name:'피카츄 ex SR 151 한정판',
        offers:[
          { id:'o2a', store:'카드창고',     price:42500 },
          { id:'o2b', store:'레어샵코리아', price:41000 },
        ],
      },
      {
        id:'c3',
        name:'피카츄 ex 프로모 PROMO 089/SV-P',
        offers:[
          { id:'o3a', store:'덱빌더샵',  price:39000 },
        ],
      },
      {
        id:'c4',
        name:'피카츄 ex (SV1a) 일반 단일',
        offers:[
          { id:'o4a', store:'레어카드창고', price:18900 },
          { id:'o4b', store:'카드플리퍼',   price:17500 },
          { id:'o4c', store:'TCG마켓',     price:19800 },
        ],
      },
    ],
  },
  '리자몽 VMAX': {
    state: 'ok',
    items: [
      {
        id:'cc1',
        name:'리자몽 VMAX RRR 샤이니스타V',
        offers:[
          { id:'co1a', store:'카드매니아',   price:128000 },
          { id:'co1b', store:'TCG라운지',    price:124500 },
          { id:'co1c', store:'레어샵코리아', price:131000 },
        ],
      },
      {
        id:'cc2',
        name:'리자몽 VMAX HR 한국판',
        offers:[
          { id:'co2a', store:'카드창고',   price:89000 },
          { id:'co2b', store:'카드플리퍼', price:84500 },
        ],
      },
    ],
  },
  '나오하': { state:'empty', items:[] },
  '미라이돈 ex': { state:'loading', items:[] },
  '루기아 VSTAR': { state:'error', items:[], error:{ message:'스토어 응답 시간 초과' } },
};

/* ---------- Validation ---------- */
function validateRows(rows){
  const counts = {};
  rows.forEach(r => {
    const k = r.q.trim().toLowerCase();
    if (k) counts[k] = (counts[k]||0)+1;
  });
  return rows.map(r=>{
    const issues=[];
    if (!r.q.trim()) issues.push({type:'empty', msg:'검색어 없음'});
    if (!Number.isInteger(r.n) || r.n < 1) issues.push({type:'qty', msg:'수량 오류'});
    const k = r.q.trim().toLowerCase();
    if (k && counts[k] > 1) issues.push({type:'dup', msg:'중복'});
    return { ...r, issues };
  });
}

const krw = n => '₩' + n.toLocaleString('ko-KR');

/* ---------- App ---------- */
function App(){
  const [tweaks, setTweak] = useTweaks(/*EDITMODE-BEGIN*/{
    "accent": "#1ed760"
  }/*EDITMODE-END*/);

  const [rows, setRows] = useState(initialRows);
  const [sessionState, setSessionState] = useState('results');
  const [groups, setGroups] = useState(productResults);

  const validated = useMemo(()=>validateRows(rows), [rows]);
  const validRows = validated.filter(r => r.issues.length === 0);

  const updateRow = (id, patch) => setRows(rs => rs.map(r => r.id===id ? {...r, ...patch} : r));
  const deleteRow = (id) => setRows(rs => rs.filter(r => r.id !== id));
  const addRow = () => {
    const id = 'r' + Math.random().toString(36).slice(2,7);
    setRows(rs => [...rs, { id, q:'', n:1 }]);
    setTimeout(()=>{
      const el = document.querySelector(`[data-row="${id}"] input[name="q"]`);
      if (el) el.focus();
    }, 30);
  };

  const onRowKeyDown = (e, idx, id) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (idx === rows.length - 1) addRow();
      else {
        const next = rows[idx+1];
        const el = document.querySelector(`[data-row="${next.id}"] input[name="q"]`);
        el && el.focus();
      }
    } else if (e.key === 'Backspace' && e.target.value === '' && rows.length > 1) {
      e.preventDefault();
      const prev = rows[idx-1];
      deleteRow(id);
      if (prev) setTimeout(()=>{
        const el = document.querySelector(`[data-row="${prev.id}"] input[name="q"]`);
        el && el.focus();
      },20);
    }
  };

  const runSearch = () => {
    setSessionState('searching');
    setTimeout(()=>setSessionState('results'), 800);
  };

  const retryGroup = (key) => {
    setGroups(g => ({ ...g, [key]: { ...g[key], state:'loading' } }));
    setTimeout(()=>{
      setGroups(g => ({
        ...g,
        [key]: {
          state:'ok',
          items: [
            { id:'rt1', name:`${key} SR 단일`, offers:[
              { id:'rt1a', store:'카드창고', price:62000 },
              { id:'rt1b', store:'TCG마켓', price:64500 },
            ]},
          ]
        }
      }));
    }, 1000);
  };

  return (
    <>
      <Styles accent={tweaks.accent} />
      <div className="sc-shell">
        <CommandRow
          sessionState={sessionState}
          rowCount={validRows.length}
          onSearch={runSearch}
        />
        <main className="sc-body">
          <SessionPanel
            rows={validated}
            onUpdate={updateRow}
            onDelete={deleteRow}
            onAdd={addRow}
            onRowKeyDown={onRowKeyDown}
          />
          <ResultsWorkspace
            rows={validRows}
            groups={groups}
            sessionState={sessionState}
            retryGroup={retryGroup}
          />
        </main>
      </div>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Theme">
          <TweakColor
            label="Accent"
            value={tweaks.accent}
            onChange={(v)=>setTweak('accent', v)}
            options={['#1ed760','#539df5','#ffa42b','#f3727f']}
          />
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

/* ---------- Command Row ---------- */
function CommandRow({ sessionState, rowCount, onSearch }){
  return (
    <header className="sc-cmd">
      <div className="sc-brand">
        <div className="sc-brand-mark">CD</div>
        <div className="sc-brand-name">카드담다</div>
      </div>
      <button className="sc-btn sc-btn-primary" onClick={onSearch} disabled={rowCount===0 || sessionState==='searching'}>
        <Icon.Search/>
        <span>{sessionState==='searching' ? 'SEARCHING' : 'SEARCH'}</span>
      </button>
    </header>
  );
}

/* ---------- Session Panel ---------- */
function SessionPanel({ rows, onUpdate, onDelete, onAdd, onRowKeyDown }){
  return (
    <aside className="sc-panel">
      <div className="sc-panel-head">
        <h2>구매 요청</h2>
        <span className="sc-panel-count">{rows.filter(r=>r.issues.length===0).length}장</span>
      </div>

      <div className="sc-rows">
        {rows.map((r, i) => (
          <RequestRow
            key={r.id}
            row={r}
            onUpdate={(patch)=>onUpdate(r.id, patch)}
            onDelete={()=>onDelete(r.id)}
            onKeyDown={(e)=>onRowKeyDown(e,i,r.id)}
          />
        ))}
      </div>

      <button className="sc-add-row" onClick={onAdd}>
        <Icon.Plus/> 행 추가
      </button>
    </aside>
  );
}

function RequestRow({ row, onUpdate, onDelete, onKeyDown }){
  const issue = row.issues[0];
  return (
    <div className={"sc-row " + (issue?"has-issue":"")} data-row={row.id}>
      <div className="sc-row-q">
        <input
          name="q"
          value={row.q}
          placeholder="카드 이름"
          onChange={(e)=>onUpdate({q:e.target.value})}
          onKeyDown={onKeyDown}
          spellCheck={false}
          autoComplete="off"
        />
        {issue && <span className={"sc-row-issue is-"+issue.type}><Icon.Warn/>{issue.msg}</span>}
      </div>
      <input
        name="n"
        type="number"
        min="1"
        max="99"
        value={row.n}
        onChange={(e)=>onUpdate({n: parseInt(e.target.value||'0',10)})}
        className="sc-row-qty"
      />
      <button className="sc-row-del" onClick={onDelete} title="삭제"><Icon.Trash/></button>
    </div>
  );
}

/* ---------- Results ---------- */
function ResultsWorkspace({ rows, groups, sessionState, retryGroup }){
  if (sessionState === 'idle') {
    return (
      <section className="sc-results sc-idle">
        <div className="sc-idle-card">
          <Icon.Search/>
          <p>왼쪽에서 카드를 추가하고 검색을 실행하세요</p>
        </div>
      </section>
    );
  }

  return (
    <section className="sc-results">
      <header className="sc-results-head">
        <h2>검색 결과</h2>
        <span className="sc-results-count">{rows.length} 그룹</span>
      </header>
      {rows.map(r => {
        const g = groups[r.q] || { state:'loading', items:[] };
        return (
          <ResultGroup
            key={r.id}
            cardName={r.q}
            qty={r.n}
            group={g}
            onRetry={()=>retryGroup(r.q)}
          />
        );
      })}
    </section>
  );
}

/* ---------- Group ---------- */
function ResultGroup({ cardName, qty, group, onRetry }){
  const totalOffers = (group.items||[]).reduce((a,it)=>a+(it.offers?.length||0),0);
  const stateLabel = {
    ok: `${group.items.length}건`,
    loading: '검색 중',
    empty: '결과 없음',
    error: '오류',
  }[group.state];

  return (
    <article className={"sc-group is-"+group.state}>
      <header className="sc-group-head">
        <h3 className="sc-group-title">
          {cardName} <span className="sc-group-qty">×{qty}</span>
        </h3>
        <span className={"sc-group-state is-"+group.state}>
          {group.state==='loading' && <span className="sc-spin"/>}
          {stateLabel}
        </span>
        {group.state==='error' && (
          <button className="sc-btn sc-btn-pill" onClick={onRetry}>
            <Icon.Refresh/> 재시도
          </button>
        )}
      </header>

      <div className="sc-group-body">
          {group.state==='ok' && group.items.map(it => <ProductRow key={it.id} item={it}/>)}
          {group.state==='loading' && <LoadingRows/>}
          {group.state==='empty' && (
            <div className="sc-empty">"{cardName}" 결과가 없습니다</div>
          )}
          {group.state==='error' && (
            <div className="sc-error">{group.error?.message || '알 수 없는 오류'}</div>
          )}
        </div>
    </article>
  );
}

/* ---------- Product (one card, multiple stores) ---------- */
function ProductRow({ item }){
  const offers = [...(item.offers||[])].sort((a,b)=>a.price-b.price);
  return (
    <div className="sc-prod">
      <div className="sc-prod-thumb" aria-hidden="true">
        {item.image
          ? <img src={item.image} alt=""/>
          : <span className="sc-prod-thumb-placeholder">이미지</span>}
      </div>
      <div className="sc-prod-body">
      <div className="sc-prod-name">{item.name}</div>
      <div className="sc-offers">
        {offers.map((o,i) => (
          <a
            key={o.id}
            className={"sc-offer " + (i===0?"is-best":"")}
            href="#"
            onClick={(e)=>e.preventDefault()}
          >
            <span className="sc-offer-store">{o.store}</span>
            <span className="sc-offer-price">{krw(o.price)}</span>
            <Icon.ExternalLink/>
          </a>
        ))}
      </div>
      </div>
    </div>
  );
}

function LoadingRows(){
  return (
    <div className="sc-loading">
      <div className="sc-skel sc-skel-line"/>
      <div className="sc-skel sc-skel-line w60"/>
    </div>
  );
}

/* ---------- Styles ---------- */
function Styles({ accent }){
  return <style>{`
    :root { --accent:${accent}; }

    .sc-shell{display:flex;flex-direction:column;min-height:100vh;background:#0e0e0e}

    /* Command row */
    .sc-cmd{
      display:flex;align-items:center;justify-content:space-between;
      padding:12px 24px;
      background:#0e0e0e;
      border-bottom:1px solid #1c1c1c;
      position:sticky;top:0;z-index:30;
    }
    .sc-brand{display:flex;align-items:center;gap:10px}
    .sc-brand-mark{
      width:28px;height:28px;border-radius:7px;
      background:var(--accent);color:#000;
      display:grid;place-items:center;
      font-weight:700;font-size:11px;letter-spacing:.4px;
    }
    .sc-brand-name{font-weight:700;font-size:15px;letter-spacing:-.1px}

    /* Body */
    .sc-body{
      display:grid;
      grid-template-columns:340px 1fr;
      flex:1;min-height:0;
    }

    /* Panel */
    .sc-panel{
      background:#121212;
      border-right:1px solid #1c1c1c;
      padding:20px;
      overflow-y:auto;
      max-height:calc(100vh - 53px);
      position:sticky;top:53px;
    }
    .sc-panel-head{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:14px}
    .sc-panel-head h2{margin:0;font-size:16px;font-weight:700;letter-spacing:-.1px}
    .sc-panel-count{font-size:12px;color:var(--text-3,#b3b3b3)}

    .sc-rows{display:flex;flex-direction:column;gap:4px}
    .sc-row{
      display:grid;
      grid-template-columns:1fr 56px 24px;
      gap:6px;align-items:center;
      padding:6px;border-radius:6px;
      background:#181818;
    }
    .sc-row:hover{background:#1c1c1c}
    .sc-row.has-issue{box-shadow:inset 0 0 0 1px rgba(255,164,43,0.4)}
    .sc-row-q{display:flex;flex-direction:column;gap:2px;min-width:0}
    .sc-row-q input{
      background:transparent;border:0;outline:0;
      color:#fff;font-size:14px;font-family:inherit;
      padding:6px 8px;width:100%;
    }
    .sc-row-q input::placeholder{color:#5a5a5a}
    .sc-row-issue{
      display:inline-flex;align-items:center;gap:5px;
      padding:0 8px 4px;
      font-size:11px;color:#ffa42b;font-weight:600;
    }
    .sc-row-issue.is-empty{color:#f3727f}
    .sc-row-issue.is-dup{color:#539df5}
    .sc-row-qty{
      background:#1f1f1f;border:0;outline:0;border-radius:5px;
      color:#fff;font-size:13px;font-family:inherit;
      text-align:center;padding:7px 4px;
      font-variant-numeric:tabular-nums;font-weight:600;
      -moz-appearance:textfield;
    }
    .sc-row-qty::-webkit-outer-spin-button,
    .sc-row-qty::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
    .sc-row-del{
      width:24px;height:24px;border-radius:5px;
      color:#5a5a5a;display:grid;place-items:center;
      transition:all .1s;
    }
    .sc-row-del:hover{color:#f3727f;background:#1f1f1f}

    .sc-add-row{
      display:flex;align-items:center;justify-content:center;gap:6px;
      width:100%;margin-top:8px;
      padding:9px;border-radius:6px;
      background:transparent;color:#b3b3b3;
      box-shadow:inset 0 0 0 1px #2a2a2a;
      font-weight:600;font-size:12.5px;
    }
    .sc-add-row:hover{color:#fff;box-shadow:inset 0 0 0 1px #4d4d4d}

    /* Buttons */
    .sc-btn{
      display:inline-flex;align-items:center;gap:8px;
      padding:8px 16px;border-radius:9999px;
      background:#1f1f1f;color:#fff;
      font-size:11.5px;font-weight:700;letter-spacing:1.4px;
      text-transform:uppercase;line-height:1;
      transition:all .12s;font-family:inherit;
    }
    .sc-btn:hover{background:#272727}
    .sc-btn-primary{background:var(--accent);color:#000;padding:10px 20px}
    .sc-btn-primary:hover{background:#22e767}
    .sc-btn-primary:disabled{background:#1f1f1f;color:#5a5a5a;cursor:not-allowed}
    .sc-btn-pill{padding:5px 12px;font-size:10.5px;letter-spacing:1.2px}

    /* Results */
    .sc-results{
      padding:20px 24px 60px;
      overflow-y:auto;
      max-height:calc(100vh - 53px);
      display:flex;flex-direction:column;gap:8px;
    }
    .sc-results-head{
      display:flex;align-items:baseline;justify-content:space-between;
      padding:0 2px 6px;margin-bottom:4px;
    }
    .sc-results-head h2{margin:0;font-size:16px;font-weight:700;letter-spacing:-.1px}
    .sc-results-count{font-size:12px;color:#b3b3b3}

    /* Group */
    .sc-group{
      background:#181818;border-radius:8px;
      border:1px solid #1c1c1c;
    }
    .sc-group-body{overflow:hidden;border-radius:0 0 7px 7px}
    .sc-group.is-error{border-color:rgba(243,114,127,0.25)}
    .sc-group-head{
      display:grid;
      grid-template-columns:1fr auto auto;
      gap:12px;align-items:center;
      padding:12px 16px;
    }
    .sc-group-title{margin:0;font-size:14.5px;font-weight:700;letter-spacing:-.1px}
    .sc-group-qty{
      color:var(--accent);
      font-variant-numeric:tabular-nums;
      font-weight:700;
      margin-left:6px;
    }
    .sc-group-state{
      display:inline-flex;align-items:center;gap:7px;
      font-size:11px;color:#b3b3b3;font-weight:600;
      font-variant-numeric:tabular-nums;
    }
    .sc-group.is-error .sc-group-state{color:#f3727f}
    .sc-group.is-empty .sc-group-state{color:#7c7c7c}

    .sc-group-body{border-top:1px solid #1c1c1c;background:#161616}

    /* Product */
    .sc-prod{
      display:grid;
      grid-template-columns:64px 1fr;
      gap:14px;
      padding:14px 16px;
      border-bottom:1px solid #1a1a1a;
    }
    .sc-prod:last-child{border-bottom:0}
    .sc-prod-thumb{
      width:64px;height:88px;border-radius:5px;overflow:hidden;
      background:#0f0f0f;box-shadow:inset 0 0 0 1px #232323;
      display:grid;place-items:center;
    }
    .sc-prod-thumb img{width:100%;height:100%;object-fit:cover;display:block}
    .sc-prod-thumb-placeholder{
      font-size:10px;letter-spacing:.6px;
      color:#3a3a3a;font-weight:600;
    }
    .sc-prod-body{min-width:0}
    .sc-prod-name{
      color:#fff;font-weight:600;font-size:13px;
      margin-bottom:8px;line-height:1.35;
    }
    .sc-offers{display:flex;flex-direction:column;gap:2px}
    .sc-offer{
      display:grid;
      grid-template-columns:1fr auto 12px;
      gap:14px;align-items:center;
      padding:9px 12px;
      border-radius:5px;
      background:transparent;
      color:#cbcbcb;
      font-size:13px;
      text-decoration:none;
      transition:background .1s;
    }
    .sc-offer:hover{background:#1f1f1f;color:#fff}
    .sc-offer-store{font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .sc-offer.is-best .sc-offer-store::before{
      content:"";display:inline-block;
      width:6px;height:6px;border-radius:50%;
      background:var(--accent);margin-right:8px;vertical-align:1px;
    }
    .sc-offer-price{font-weight:700;color:#fff;font-variant-numeric:tabular-nums}
    .sc-offer svg{color:#7c7c7c;transition:color .1s}
    .sc-offer:hover svg{color:#fff}

    /* Loading */
    .sc-loading{padding:14px 16px;display:flex;flex-direction:column;gap:8px}
    .sc-skel{background:linear-gradient(90deg,#1c1c1c 0%,#252525 50%,#1c1c1c 100%);background-size:200% 100%;animation:skel 1.4s linear infinite;border-radius:4px}
    .sc-skel-line{height:10px;width:100%}
    .sc-skel-line.w60{width:60%}
    @keyframes skel{0%{background-position:200% 0}100%{background-position:-200% 0}}
    .sc-spin{
      width:10px;height:10px;border-radius:50%;
      border:2px solid #ffa42b;border-top-color:transparent;
      animation:spin .8s linear infinite;display:inline-block;
    }
    @keyframes spin{to{transform:rotate(360deg)}}

    /* Empty / Error */
    .sc-empty, .sc-error{
      padding:18px 16px;
      color:#b3b3b3;font-size:13px;
    }
    .sc-error{color:#f3727f}

    /* Idle */
    .sc-idle{display:grid;place-items:center;padding:80px 24px}
    .sc-idle-card{text-align:center;color:#7c7c7c}
    .sc-idle-card svg{margin-bottom:10px}
    .sc-idle-card p{margin:0;font-size:13px}

    /* Responsive */
    @media (max-width: 800px){
      .sc-body{grid-template-columns:1fr}
      .sc-panel{
        position:static;max-height:none;
        border-right:0;border-bottom:1px solid #1c1c1c;
      }
      .sc-results{max-height:none;padding:16px}
      .sc-offer{padding:11px 12px;font-size:14px}
      .sc-prod{grid-template-columns:48px 1fr;gap:10px}
      .sc-prod-thumb{width:48px;height:66px}
    }
  `}</style>;
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
