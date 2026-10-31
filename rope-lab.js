(function(){
'use strict';
const get=id=>document.getElementById('rope-'+id),q=RopeCore.parse,zero=q('0'),one=q('1'),two=q('2');
let target,time,ropes,log,history,finished=false,worker=null;
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
function save(){history.push({time:time.text(),ropes:ropes.map(r=>({...r,remaining:r.remaining.text()})),log:[...log],finished});}
function message(text,error=false){get('status').textContent=text;get('status').dataset.error=String(error);}
function rope(){return {remaining:one,left:false,right:false,used:false,done:false};}
function render(){
 get('clock').textContent=time.text()+' h';get('summary').textContent=target.text()+' h / '+ropes.filter(r=>r.used).length+' 根';get('ropes').replaceChildren();
 ropes.forEach((r,i)=>{
  const row=el('div','rope-game-row'),top=el('div','rope-game-top'),name=el('strong','','绳 '+(i+1)),label=el('span','rope-state',r.done?'已燃尽':r.used?'剩余 '+r.remaining.text()+' 小时单端燃烧量':'尚未点火');top.append(name,label);
  const controls=el('div','rope-game-ends'),l=el('button','','左端'+(r.left?' · 已点燃':'')),right=el('button','','右端'+(r.right?' · 已点燃':'')),track=el('div','rope-track'),fiber=el('span','rope-fiber');fiber.style.left='0';fiber.style.width=(r.done?0:r.remaining.number()*100)+'%';track.append(fiber);
  l.type=right.type='button';l.disabled=finished||r.done||r.left;right.disabled=finished||r.done||r.right;l.onclick=()=>light(i,'left');right.onclick=()=>light(i,'right');controls.append(l,track,right);
  const both=el('button','rope-both','两端同时点燃');both.type='button';both.disabled=finished||r.done||r.left||r.right;both.onclick=()=>light(i,'both');row.append(top,controls,both);get('ropes').append(row);
 });
 get('next').disabled=finished||!ropes.some(r=>!r.done&&(r.left||r.right));get('add').disabled=finished||ropes.length>=40;get('undo').disabled=!history.length;
 get('log').replaceChildren(...log.map(s=>el('li','',s)));
}
function light(i,side){const r=ropes[i];if(finished||r.done||side==='both'&&(r.left||r.right)||r[side])return;save();if(side==='both'){r.left=true;r.right=true;}else r[side]=true;r.used=true;log.push(time.text()+' h：点燃绳 '+(i+1)+(side==='both'?' 的两端':side==='left'?' 的左端':' 的右端'));message('端点已点燃。还可以在同一时刻点燃其他绳子，或等待下一次燃尽。');render();}
function next(){
 if(finished)return;let delta=null;
 for(const r of ropes){const count=Number(r.left)+Number(r.right);if(!r.done&&count){const d=r.remaining.div(count===2?two:one);if(delta===null||d.cmp(delta)<0)delta=d;}}
 if(!delta)return;save();const nextTime=time.add(delta);
 if(nextTime.cmp(target)>0){finished=true;log.push('下次燃尽会发生在 '+nextTime.text()+' h，已越过目标。');message('这次方案会越过目标：下一次燃尽在 '+nextTime.text()+' h。可以撤销这一步调整点火，或重新挑战。',true);render();return;}
 const burned=[];
 ropes.forEach((r,i)=>{const count=Number(r.left)+Number(r.right);if(!r.done&&count){r.remaining=r.remaining.sub(delta.mul(count===2?two:one));if(r.remaining.cmp(zero)===0){r.done=true;burned.push(i+1);}}});time=nextTime;
 log.push(time.text()+' h：绳 '+burned.join('、')+' 燃尽');
 if(time.cmp(target)===0){finished=true;message('命中目标！绳 '+burned.join('、')+' 在 '+target.text()+' 小时燃尽，共使用 '+ropes.filter(r=>r.used).length+' 根绳子。');}else message('现在是 '+time.text()+' h，绳 '+burned.join('、')+' 刚刚燃尽。你可以继续点火。');render();
}
function start(){try{const t=q(get('target').value);if(t.cmp(zero)<=0||t.cmp(q('3'))>0)throw Error('本挑战目标范围为大于 0、至多 3 小时');if(t.d&(t.d-1n))throw Error('目标须为二进有理数，有限次融合的分母只能是 2 的幂');if(t.cmp(q('1/2'))<0)throw Error('完整绳子最早半小时燃尽，请选择至少 1/2 小时的目标');target=t;time=zero;ropes=[rope(),rope(),rope()];log=['0 h：挑战开始'];history=[];finished=false;if(worker)worker.terminate();get('stage').hidden=false;get('answer').open=false;get('table').replaceChildren();get('answer-status').textContent='';get('solve').disabled=false;message('目标 '+target.text()+' h。由你决定点燃哪些端点；需要更多绳子时点击“添加一根绳子”。');render();}catch(e){message(e.message,true);}}
get('form').addEventListener('submit',e=>{e.preventDefault();start();});document.querySelectorAll('[data-target]').forEach(b=>b.addEventListener('click',()=>{get('target').value=b.dataset.target;start();}));
get('next').onclick=next;get('reset').onclick=()=>{get('target').value=target.text();start();};get('add').onclick=()=>{if(finished||ropes.length>=40)return;save();ropes.push(rope());render();};
get('undo').onclick=()=>{const s=history.pop();if(!s)return;time=q(s.time);ropes=s.ropes.map(r=>({...r,remaining:q(r.remaining)}));log=s.log;finished=s.finished;message('已撤销上一步。');render();};
get('solve').onclick=()=>{
 if(worker)worker.terminate();get('solve').disabled=true;get('answer-status').textContent='正在计算一种精确解答…';
 try{worker=new Worker('./rope-worker.js?v=20261031');worker.onmessage=e=>{get('solve').disabled=false;if(e.data.error){get('answer-status').textContent=e.data.error;return;}const p=e.data.plan;get('answer-status').textContent='一种可行方案：'+p.ropes.length+' 根绳子。在相同的时刻，先确认燃尽，再点燃指定端点。';const table=el('table'),head=el('thead'),tr=el('tr');for(const t of ['时刻 / 小时','事件','需要点燃']){const th=el('th','',t);th.scope='col';tr.append(th);}head.append(tr);const body=el('tbody');for(const ev of p.events){const tr=el('tr');for(const t of [ev.time,ev.burned.length?'绳 '+ev.burned.join('、')+' 燃尽':'起点',ev.lights.map(l=>'绳 '+l.rope+(l.side==='left'?' 左端':' 右端')).join('；')||'目标达成'])tr.append(el('td','',t));body.append(tr);}table.append(head,body);get('table').replaceChildren(table);};worker.onerror=()=>{get('solve').disabled=false;get('answer-status').textContent='解答模块加载失败，请刷新重试。';};worker.postMessage({expression:target.text()});}catch(e){get('solve').disabled=false;get('answer-status').textContent='解答计算模块未启动。';}
};
start();
})();
