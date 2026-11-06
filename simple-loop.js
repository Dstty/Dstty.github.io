(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const NS = 'http://www.w3.org/2000/svg';
  const data = window.SIMPLE_LOOP || {};
  const order = Object.keys(data).map(Number).sort((a, b) => a - b);
  const MIN_PROVEN = new Set([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);

  const board = $('board');
  let n = 11, D, black, cycle, edges, edgeIndex, cell;
  let selected, excluded, history, reveal = false;
  let lineEls = [], crossEls = [], hotEl = null;

  let painting = false, dragFrom = -1, strokeMode = null, paintKind = 'line';
  let pressTimer = null, downPt = null, movedFar = false, longPressed = false;

  const key = (a, b) => (a < b ? a + '-' + b : b + '-' + a);
  const cx = (id) => (id % n + 0.5) * cell;
  const cy = (id) => (Math.floor(id / n) + 0.5) * cell;

  function svg(tag, attrs) {
    const node = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    return node;
  }

  function build(nn) {
    n = nn; D = data[n];
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

  function render() {
    const S = 1000;
    cell = S / n;
    const frag = document.createDocumentFragment();

    frag.append(svg('rect', { x: 0, y: 0, width: S, height: S, class: 'board-bg' }));

    for (const id of black) {
      const r = Math.floor(id / n), c = id % n;
      frag.append(svg('rect', { x: c * cell, y: r * cell, width: cell, height: cell, class: 'wall' }));
    }

    for (let i = 1; i < n; i++) {
      frag.append(svg('line', { x1: i * cell, y1: 0, x2: i * cell, y2: S, class: 'grid' }));
      frag.append(svg('line', { x1: 0, y1: i * cell, x2: S, y2: i * cell, class: 'grid' }));
    }

    lineEls = new Array(edges.length);
    crossEls = new Array(edges.length);
    const edgeLayer = svg('g', { class: 'edges' });
    const crossLayer = svg('g', { class: 'crosses' });
    for (let e = 0; e < edges.length; e++) {
      const [a, b] = edges[e];
      const l = svg('line', {
        x1: cx(a), y1: cy(a), x2: cx(b), y2: cy(b),
        'stroke-width': (cell * 0.30).toFixed(2),
        class: 'edge'
      });
      lineEls[e] = l; edgeLayer.append(l);

      const mx = (cx(a) + cx(b)) / 2, my = (cy(a) + cy(b)) / 2, rr = cell * 0.16;
      const x = svg('path', {
        d: `M${mx - rr},${my - rr}L${mx + rr},${my + rr}M${mx - rr},${my + rr}L${mx + rr},${my - rr}`,
        'stroke-width': (cell * 0.055).toFixed(2),
        class: 'cross', style: 'display:none'
      });
      crossEls[e] = x; crossLayer.append(x);
    }
    frag.append(edgeLayer, crossLayer);

    hotEl = svg('circle', { cx: -999, cy: -999, r: Math.max(2, cell * 0.09), class: 'hot' });
    frag.append(hotEl);

    board.replaceChildren(frag);
    board.style.touchAction = 'none';
    sync();
  }

  function sync() {
    const vis = reveal ? cycle : selected;
    for (let e = 0; e < edges.length; e++) {
      const k = key(edges[e][0], edges[e][1]);
      lineEls[e].classList.toggle('drawn', vis.has(k));
      lineEls[e].classList.toggle('revealed', reveal && vis.has(k));
      crossEls[e].style.display = (!reveal && excluded.has(k)) ? '' : 'none';
    }
    $('undo').disabled = reveal || !history.length;
    $('reset').disabled = reveal || (!selected.size && !excluded.size);
    $('solution').textContent = reveal ? '收起答案' : '查看唯一解';
    $('solution').setAttribute('aria-pressed', String(reveal));
    status();
  }

  function status() {
    const el = $('status');
    el.classList.remove('success');
    if (reveal) { el.textContent = '已显示唯一解。收起答案后可继续。'; return; }
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
    let white = 0, done = 0;
    for (let v = 0; v < N; v++) if (!black.has(v)) { white++; if (adj[v].length === 2) done++; }
    for (let v = 0; v < N; v++) if (!black.has(v) && adj[v].length > 2) {
      el.textContent = '有点连接了三条或更多线段：每个白格应恰好经过一次。'; return;
    }
    for (const comp of comps) {
      if (comp.length < white && comp.every((v) => adj[v].length === 2)) {
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

  // ---------- geometry ----------
  function toLocal(ev) {
    const r = board.getBoundingClientRect();
    return { x: (ev.clientX - r.left) * 1000 / r.width, y: (ev.clientY - r.top) * 1000 / r.height };
  }
  function cellAt(pt) {
    const c = Math.floor(pt.x / cell), r = Math.floor(pt.y / cell);
    if (r < 0 || c < 0 || r >= n || c >= n) return -1;
    const id = r * n + c;
    return black.has(id) ? -1 : id;
  }
  function adjacent(a, b) {
    if (a < 0 || b < 0) return false;
    const ra = Math.floor(a / n), ca = a % n, rb = Math.floor(b / n), cb = b % n;
    return Math.abs(ra - rb) + Math.abs(ca - cb) === 1;
  }
  function segDist(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1, L2 = dx * dx + dy * dy;
    let t = L2 ? ((px - x1) * dx + (py - y1) * dy) / L2 : 0;
    if (t < 0) t = 0; else if (t > 1) t = 1;
    const qx = x1 + t * dx - px, qy = y1 + t * dy - py;
    return Math.sqrt(qx * qx + qy * qy);
  }
  function edgeNear(pt, thr) {
    let best = -1, bd = thr;
    for (let e = 0; e < edges.length; e++) {
      const [a, b] = edges[e];
      const d = segDist(pt.x, pt.y, cx(a), cy(a), cx(b), cy(b));
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }
  function hotAt(pt) {
    if (!hotEl) return;
    const id = cellAt(pt);
    if (id < 0) { hotEl.setAttribute('cx', -999); hotEl.setAttribute('cy', -999); return; }
    hotEl.setAttribute('cx', cx(id)); hotEl.setAttribute('cy', cy(id));
  }

  // ---------- actions ----------
  function snapshot() { history.push({ s: new Set(selected), x: new Set(excluded) }); }
  function setLine(e, on) {
    const k = key(edges[e][0], edges[e][1]);
    if (on) { selected.add(k); excluded.delete(k); } else selected.delete(k);
    sync();
  }
  function toggleCross(e) {
    const k = key(edges[e][0], edges[e][1]);
    if (excluded.has(k)) excluded.delete(k);
    else { excluded.add(k); selected.delete(k); }
    sync();
  }

  board.addEventListener('pointerdown', (ev) => {
    if (reveal) return;
    ev.preventDefault();
    const pt = toLocal(ev);
    if (board.setPointerCapture) { try { board.setPointerCapture(ev.pointerId); } catch (_) {} }
    if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
    painting = true; movedFar = false; longPressed = false; downPt = pt;
    paintKind = ev.button === 2 ? 'cross' : 'line';
    dragFrom = cellAt(pt); strokeMode = null;
    snapshot();
    if (paintKind === 'cross') {
      const e = edgeNear(pt, cell * 0.45);
      if (e >= 0) toggleCross(e);
      return;
    }
    if (ev.pointerType === 'touch') {
      pressTimer = setTimeout(() => {
        pressTimer = null; longPressed = true;
        const e = edgeNear(pt, cell * 0.45);
        if (e >= 0) toggleCross(e);
        if (navigator.vibrate) { try { navigator.vibrate(15); } catch (_) {} }
      }, 420);
    }
    hotAt(pt);
  }, { passive: false });

  board.addEventListener('pointermove', (ev) => {
    const pt = toLocal(ev);
    if (!painting) { hotAt(pt); return; }
    if (downPt && !movedFar && Math.abs(pt.x - downPt.x) + Math.abs(pt.y - downPt.y) > cell * 0.35) {
      movedFar = true;
      if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
    }
    if (paintKind === 'cross') {
      const e = edgeNear(pt, cell * 0.45);
      if (e >= 0) toggleCross(e);
      return;
    }
    const t = cellAt(pt);
    if (t < 0 || t === dragFrom) return;
    if (adjacent(dragFrom, t)) {
      const k = key(dragFrom, t);
      const e = edgeIndex.get(k);
      if (e !== undefined) {
        if (strokeMode === null) strokeMode = selected.has(k) ? 'erase' : 'paint';
        setLine(e, strokeMode === 'paint');
      }
    }
    dragFrom = t;
    hotAt(pt);
  }, { passive: true });

  function endPaint(ev) {
    if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
    if (painting && paintKind === 'line' && !longPressed && !movedFar && downPt) {
      const e = edgeNear(downPt, cell * 0.45);
      if (e >= 0) toggleCross(e);
    }
    painting = false; dragFrom = -1; strokeMode = null; downPt = null; paintKind = 'line';
    if (hotEl) { hotEl.setAttribute('cx', -999); hotEl.setAttribute('cy', -999); }
    if (ev && ev.pointerId !== undefined && board.releasePointerCapture) {
      try { board.releasePointerCapture(ev.pointerId); } catch (_) {}
    }
    sync();
  }
  board.addEventListener('pointerup', endPaint);
  board.addEventListener('pointercancel', endPaint);
  board.addEventListener('contextmenu', (ev) => ev.preventDefault());
  board.addEventListener('pointerleave', () => { if (hotEl) hotEl.setAttribute('cx', -999); });

  // ---------- chrome ----------
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
    const h = history.pop(); selected = h.s; excluded = h.x; sync();
  });
  $('reset').addEventListener('click', () => {
    if (reveal) return;
    snapshot(); selected = new Set(); excluded = new Set(); sync();
  });
  $('solution').addEventListener('click', () => { reveal = !reveal; sync(); });

  build(11);
})();
