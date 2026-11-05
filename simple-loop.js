(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const NS = 'http://www.w3.org/2000/svg';
  const data = window.SIMPLE_LOOP || {};
  const order = Object.keys(data).map(Number).sort((a, b) => a - b);

  const MIN_PROVEN = new Set([2, 3, 4, 5, 6, 7, 8, 9, 10]);

  let n = 11, D, black, cycle, edges, edgeIndex, cell;
  let selected, excluded, history, reveal = false, mode = 'line';
  const board = $('board');

  function svg(tag, attrs) {
    const node = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    return node;
  }
  const key = (a, b) => (a < b ? a + '-' + b : b + '-' + a);
  const rc = (id) => [Math.floor(id / n), id % n];
  const cx = (id) => (id % n + 0.5) * cell;
  const cy = (id) => (Math.floor(id / n) + 0.5) * cell;

  function build(nn) {
    n = nn; D = data[n];
    const N = n * n;
    black = new Set(D.black.map(([r, c]) => r * n + c));
    cycle = new Set();
    for (let i = 0; i < D.cycle.length; i++) {
      const a = D.cycle[i], b = D.cycle[(i + 1) % D.cycle.length];
      cycle.add(key(a[0] * n + a[1], b[0] * n + b[1]));
    }
    edges = []; edgeIndex = new Map();
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const a = r * n + c;
      if (black.has(a)) continue;
      if (c + 1 < n && !black.has(a + 1)) { edgeIndex.set(key(a, a + 1), edges.length); edges.push([a, a + 1]); }
      if (r + 1 < n && !black.has(a + n)) { edgeIndex.set(key(a, a + n), edges.length); edges.push([a, a + n]); }
    }
    selected = new Set(); excluded = new Set(); history = []; reveal = false;
    for (const b of document.querySelectorAll('[data-size]')) {
      b.setAttribute('aria-pressed', String(Number(b.dataset.size) === n));
    }
    $('board-title').textContent = `${n} × ${n} 点阵`;
    $('record-note').textContent = `${D.black.length} 个黑格 · ` +
      (MIN_PROVEN.has(n) ? (n === 2 ? '无需黑格即唯一' : '已确认最少') : '构造，最少性未定');
    $('coordinates').replaceChildren(...D.black.map(([r, c]) => {
      const li = document.createElement('li');
      li.textContent = `(${r}, ${c})`;
      return li;
    }));
    render();
  }

  function snapshot() { history.push({ s: new Set(selected), x: new Set(excluded) }); }

  function toggle(e) {
    if (reveal) return;
    snapshot();
    const k = key(edges[e][0], edges[e][1]);
    if (mode === 'cross') {
      selected.delete(k);
      if (excluded.has(k)) excluded.delete(k); else excluded.add(k);
    } else {
      excluded.delete(k);
      if (selected.has(k)) selected.delete(k); else selected.add(k);
    }
    render();
  }

  function components() {
    const N = n * n;
    const adj = Array.from({ length: N }, () => []);
    for (const k of selected) {
      const [a, b] = k.split('-').map(Number);
      adj[a].push(b); adj[b].push(a);
    }
    const seen = new Array(N).fill(false);
    const comps = [];
    for (let v = 0; v < N; v++) {
      if (seen[v] || black.has(v)) continue;
      const st = [v]; seen[v] = true; const comp = [];
      while (st.length) {
        const x = st.pop(); comp.push(x);
        for (const y of adj[x]) if (!seen[y]) { seen[y] = true; st.push(y); }
      }
      comps.push(comp);
    }
    return { adj, comps };
  }

  function status() {
    const el = $('status');
    el.classList.remove('success');
    if (reveal) { el.textContent = '已显示唯一解。收起答案后可继续。'; return; }
    const N = n * n;
    const { adj, comps } = components();
    const deg = (v) => adj[v].length;
    let white = 0, done = 0;
    for (let v = 0; v < N; v++) if (!black.has(v)) { white++; if (deg(v) === 2) done++; }
    for (let v = 0; v < N; v++) if (!black.has(v) && deg(v) > 2) {
      el.textContent = '有点连接了三条或更多线段：每个白格应恰好经过一次。'; return;
    }
    for (const comp of comps) {
      if (comp.length < white && comp.every((v) => deg(v) === 2)) {
        el.textContent = '出现了提前闭合的小圈：所有白格必须在同一条回路上。'; return;
      }
    }
    if (done === white) {
      el.textContent = `完成！${white} 个白格组成了唯一的一条回路。`;
      el.classList.add('success');
    } else {
      el.textContent = `已连 ${selected.size} 条线 · ${done} / ${white} 个白格接满两条线`;
    }
  }

  function render() {
    const frag = document.createDocumentFragment();
    const S = 1000;
    cell = S / n;

    const defs = svg('defs', {});
    const p = svg('pattern', {
      id: 'wall-hatch', width: cell / 3, height: cell / 3,
      patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)'
    });
    p.append(svg('rect', { width: cell / 3, height: cell / 3, class: 'wall-fill' }));
    p.append(svg('line', { x1: 0, y1: 0, x2: 0, y2: cell / 3, class: 'wall-stroke' }));
    defs.append(p);
    frag.append(defs);

    frag.append(svg('rect', { x: 0, y: 0, width: S, height: S, class: 'board-bg' }));

    for (const id of black) {
      const [r, c] = rc(id);
      frag.append(svg('rect', { x: c * cell, y: r * cell, width: cell, height: cell, class: 'wall' }));
    }

    for (let i = 1; i < n; i++) {
      frag.append(svg('line', { x1: i * cell, y1: 0, x2: i * cell, y2: S, class: 'grid' }));
      frag.append(svg('line', { x1: 0, y1: i * cell, x2: S, y2: i * cell, class: 'grid' }));
    }

    const visible = reveal ? cycle : selected;
    for (const k of visible) {
      const [a, b] = k.split('-').map(Number);
      frag.append(svg('line', {
        x1: cx(a), y1: cy(a), x2: cx(b), y2: cy(b),
        'stroke-width': (cell * 0.30).toFixed(2),
        class: 'edge ' + (reveal ? 'revealed' : 'drawn')
      }));
    }

    if (!reveal) for (const k of excluded) {
      const [a, b] = k.split('-').map(Number);
      const x = (cx(a) + cx(b)) / 2, y = (cy(a) + cy(b)) / 2, r = cell * 0.16;
      frag.append(svg('path', {
        d: `M${x - r},${y - r}L${x + r},${y + r}M${x - r},${y + r}L${x + r},${y - r}`,
        'stroke-width': (cell * 0.055).toFixed(2),
        class: 'cross'
      }));
    }

    if (!reveal) {
      for (let e = 0; e < edges.length; e++) {
        const [a, b] = edges[e];
        const hit = svg('line', {
          x1: cx(a), y1: cy(a), x2: cx(b), y2: cy(b),
          'stroke-width': (cell * 0.62).toFixed(2),
          class: 'hit' + (selected.has(key(a, b)) ? ' on' : ''),
          tabindex: '0', role: 'button',
          'aria-label': `第${Math.floor(a / n) + 1}行第${a % n + 1}列 至 第${Math.floor(b / n) + 1}行第${b % n + 1}列`,
          'aria-pressed': String(selected.has(key(a, b)))
        });
        hit.addEventListener('click', () => toggle(e));
        hit.addEventListener('keydown', (ev) => {
          if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); toggle(e); }
        });
        frag.append(hit);
      }
    }

    board.replaceChildren(frag);
    $('undo').disabled = reveal || !history.length;
    $('reset').disabled = reveal || (!selected.size && !excluded.size);
    $('solution').textContent = reveal ? '收起答案' : '查看唯一解';
    $('solution').setAttribute('aria-pressed', String(reveal));
    status();
  }

  const tabs = $('sizes');
  for (const nn of order) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.size = nn;
    b.setAttribute('aria-pressed', 'false');
    b.innerHTML = `${nn} × ${nn} <small>${data[nn].black.length} 黑格</small>`;
    b.addEventListener('click', () => build(nn));
    tabs.append(b);
  }

  $('undo').addEventListener('click', () => {
    if (!history.length) return;
    const h = history.pop(); selected = h.s; excluded = h.x; render();
  });
  $('reset').addEventListener('click', () => {
    if (reveal) return;
    snapshot(); selected = new Set(); excluded = new Set(); render();
  });
  $('solution').addEventListener('click', () => { reveal = !reveal; render(); });
  for (const b of document.querySelectorAll('[data-mode]')) {
    b.addEventListener('click', () => {
      mode = b.dataset.mode;
      for (const x of document.querySelectorAll('[data-mode]')) x.setAttribute('aria-pressed', String(x.dataset.mode === mode));
    });
  }

  build(11);
})();
