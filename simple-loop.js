(() => {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const data = window.SIMPLE_LOOP || {};
  const order = Object.keys(data).map(Number).sort((a, b) => a - b);
  const boards = document.getElementById('boards');
  const coords = document.getElementById('sl-coords');

  function el(tag, attrs) {
    const node = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    return node;
  }

  for (const n of order) {
    const d = data[n];
    const k = d.black.length;
    const S = 100;
    const cell = S / n;

    const card = document.createElement('article');
    card.className = 'sl-card';

    const svg = el('svg', {
      viewBox: `0 0 ${S} ${S}`,
      role: 'img',
      'aria-label': `${n} 乘 ${n} 点阵，${k} 个黑格`
    });
    svg.append(el('rect', { x: 0, y: 0, width: S, height: S, class: 'sl-bg' }));

    for (const [r, c] of d.black) {
      svg.append(el('rect', { x: c * cell, y: r * cell, width: cell, height: cell, class: 'sl-black' }));
    }
    for (let i = 1; i < n; i++) {
      svg.append(el('line', { x1: i * cell, y1: 0, x2: i * cell, y2: S, class: 'sl-grid-line' }));
      svg.append(el('line', { x1: 0, y1: i * cell, x2: S, y2: i * cell, class: 'sl-grid-line' }));
    }
    svg.append(el('rect', { x: 0.5, y: 0.5, width: S - 1, height: S - 1, class: 'sl-outline' }));

    card.append(svg);

    const cap = document.createElement('div');
    cap.className = 'sl-cap';
    const t = document.createElement('b');
    t.textContent = `${n} × ${n}`;
    const s = document.createElement('span');
    s.textContent = `${k} 个黑格`;
    cap.append(t, s);
    card.append(cap);

    boards.append(card);

    const line = document.createElement('p');
    line.innerHTML = `<b>${n}×${n}</b>　` +
      (k ? d.black.map(([r, c]) => `(${r},${c})`).join(' ') : '无（整张都白）');
    coords.append(line);
  }
})();
