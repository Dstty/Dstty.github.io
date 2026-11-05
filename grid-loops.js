(() => {
'use strict';
const $ = id => document.getElementById(id);
const NS='http://www.w3.org/2000/svg';
let n=4, data, fixed, selected=new Set(), excluded=new Set(), history=[], reveal=false;
const board=$('board');
let mode='line';
function svg(tag,attrs){const el=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,v);return el;}
function xy(v){return [55+(v%n)*490/(n-1),55+Math.floor(v/n)*490/(n-1)];}
function line(edge,cls){const [a,b]=data.edges[edge], [x1,y1]=xy(a),[x2,y2]=xy(b);return svg('line',{x1,y1,x2,y2,class:cls});}
function edgeLabel(e){return data.edges[e].map(v=>`第${Math.floor(v/n)+1}行第${v%n+1}列`).join('至');}
function snapshot(){history.push({selected:new Set(selected),excluded:new Set(excluded)});}
function toggle(e){if(reveal||fixed.has(e))return;snapshot();if(mode==='cross'){selected.delete(e);if(excluded.has(e))excluded.delete(e);else excluded.add(e);}else{excluded.delete(e);if(selected.has(e))selected.delete(e);else selected.add(e);}render(e);}
function status(){
 const status=$('status');status.classList.remove('success');
 if(reveal){status.textContent='已显示唯一解。收起答案后可继续你的连线。';return;}
 const edges=new Set([...fixed,...selected]),deg=Array(n*n).fill(0),adj=Array.from({length:n*n},()=>[]);
 for(const e of edges){const [a,b]=data.edges[e];deg[a]++;deg[b]++;adj[a].push(b);adj[b].push(a);}
 if(deg.some(x=>x>2)){status.textContent='有点连接了三条或更多线段：每个点应恰好连接两条。';return;}
 const visited=new Set();let closedSmall=false;
 for(let v=0;v<n*n;v++){if(visited.has(v))continue;const comp=[v];visited.add(v);for(let i=0;i<comp.length;i++)for(const w of adj[comp[i]])if(!visited.has(w)){visited.add(w);comp.push(w);}if(comp.length<n*n&&comp.every(x=>deg[x]===2))closedSmall=true;}
 if(closedSmall){status.textContent='出现了提前闭合的小圈，需要把所有点连成同一个回路。';return;}
 const done=deg.filter(x=>x===2).length;
 if(done===n*n){status.textContent=`完成！${n*n} 个点组成了唯一的一条回路。`;status.classList.add('success');}
 else status.textContent=`已补 ${selected.size} 条线段 · ${done} / ${n*n} 个点接满两条线`;
}
function render(focusEdge){
 const fragment=document.createDocumentFragment();
 for(let e=0;e<data.edges.length;e++)fragment.append(line(e,'grid-guide'));
 const visible=reveal?new Set(data.cycle):new Set([...fixed,...selected]);
 for(const e of visible)fragment.append(line(e,`edge ${fixed.has(e)?'given':reveal?'revealed':'drawn'}`));
 if(!reveal)for(const e of excluded){const [a,b]=data.edges[e],[ax,ay]=xy(a),[bx,by]=xy(b),x=(ax+bx)/2,y=(ay+by)/2,r=6;fragment.append(svg('path',{d:`M${x-r},${y-r}L${x+r},${y+r}M${x-r},${y+r}L${x+r},${y-r}`,class:'no-line-mark',fill:'none',stroke:'var(--cv-ink)','stroke-width':'2','stroke-linecap':'round','vector-effect':'non-scaling-stroke','pointer-events':'none'}));}
 for(let e=0;e<data.edges.length;e++)if(!fixed.has(e)&&!reveal){const hit=line(e,`edge-hit${selected.has(e)?' selected':''}`);hit.setAttribute('tabindex','0');hit.setAttribute('role','button');hit.setAttribute('aria-label',edgeLabel(e));hit.setAttribute('aria-pressed',String(selected.has(e)));hit.dataset.edge=e;hit.addEventListener('click',()=>toggle(e));hit.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();toggle(e);}});fragment.append(hit);}
 for(let v=0;v<n*n;v++){const [cx,cy]=xy(v);fragment.append(svg('circle',{cx,cy,r:n<=6?4:3.5,class:'point'}));}
 for(let i=0;i<n;i++){for(const [x,y] of [[55+i*490/(n-1),29],[28,59+i*490/(n-1)]]){const t=svg('text',{x,y,'text-anchor':'middle',class:'board-label'});t.textContent=i+1;fragment.append(t);}}
 board.replaceChildren(fragment);board.setAttribute('aria-label',`${n}乘${n}点阵，${fixed.size}条预设线段`);
 $('undo').disabled=reveal||!history.length;$('reset').disabled=reveal||(!selected.size&&!excluded.size);$('solution').textContent=reveal?'收起答案':'查看唯一解';$('solution').setAttribute('aria-pressed',String(reveal));status();
 if(focusEdge!==undefined)board.querySelector(`[data-edge="${focusEdge}"]`)?.focus({preventScroll:true});
}
function choose(size){n=size;data=window.GRID_LOOP_PUZZLES[n];fixed=new Set(data.required);selected=new Set();excluded=new Set();history=[];reveal=false;
 for(const b of document.querySelectorAll('[data-size]'))b.setAttribute('aria-pressed',String(Number(b.dataset.size)===n));
 $('board-title').textContent=`${n} × ${n} 点阵`;$('record-note').textContent=n===4?'2 条预设 · 已确认最少':'已验证唯一解 · 提示数量尚未确认最少';
 $('coordinates').replaceChildren(...data.required.map(e=>{const li=document.createElement('li');li.textContent=data.edges[e].map(v=>`(${Math.floor(v/n)+1}, ${v%n+1})`).join(' — ');return li;}));render();
}
for(const b of document.querySelectorAll('[data-size]'))b.addEventListener('click',()=>choose(Number(b.dataset.size)));
for(const b of document.querySelectorAll('[data-mode]'))b.addEventListener('click',()=>{mode=b.dataset.mode;for(const button of document.querySelectorAll('[data-mode]'))button.setAttribute('aria-pressed',String(button.dataset.mode===mode));});
$('undo').addEventListener('click',()=>{if(history.length){const prev=history.pop();selected=prev.selected;excluded=prev.excluded;render();}});
$('reset').addEventListener('click',()=>{snapshot();selected.clear();excluded.clear();render();});
$('solution').addEventListener('click',()=>{window.alert('请在活动结束后查看答案');});
$('themeBtn').addEventListener('click',()=>{const t=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=t;try{localStorage.setItem('site-theme',t);}catch(e){}$('themeBtn').textContent=t==='dark'?'☀':'☾';});
$('themeBtn').textContent=document.documentElement.dataset.theme==='dark'?'☀':'☾';choose(4);
})();
