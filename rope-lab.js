(function(){
'use strict';
const get=id=>document.getElementById('rope-'+id),q=RopeCore.parse,zero=q('0'),one=q('1'),two=q('2');
let target=null,time=zero,ropes=[],log=[],history=[],finished=false,worker=null,animation=null,raf=0,visuals=[];
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
function save(){history.push({time:time.text(),ropes:ropes.map(r=>({...r,remaining:r.remaining.text(),leftBurn:r.leftBurn.text(),rightBurn:r.rightBurn.text()})),log:[...log],finished});}
function message(text,error=false){get('status').textContent=text;get('status').dataset.error=String(error);}
let nextId=1;
function rope(){return {id:nextId++,remaining:one,leftBurn:zero,rightBurn:zero,left:false,right:false,used:false,done:false};}
function short(v){return Number(v.toFixed(8)).toString();}
function radixText(value,base){
 const b=BigInt(base);let whole=value.n/value.d,remainder=value.n%value.d;
 if(!remainder)return whole.toString(base)+'.0';
 let digits='';while(remainder){remainder*=b;digits+=(remainder/value.d).toString(base);remainder%=value.d;}
 return whole.toString(base)+'.'+digits;
}
function paint(progress=0){
 const dt=animation?animation.delta.number()*progress:0;
 visuals.forEach(({r,fiber,left,right,label})=>{
  const l=r.leftBurn.number()+(!r.done&&r.left?dt:0),rr=r.rightBurn.number()+(!r.done&&r.right?dt:0),remaining=Math.max(0,1-l-rr);
  fiber.style.left=(l*100)+'%';fiber.style.width=(remaining*100)+'%';left.style.left=(l*100)+'%';right.style.left=((1-rr)*100)+'%';
  left.hidden=r.done||!r.left||remaining<1e-12;right.hidden=r.done||!r.right||remaining<1e-12;
  label.textContent=r.done?'已燃尽':animation&&r.used?'剩余约 '+short(remaining*100)+'% 燃烧量':r.used?'剩余 '+r.remaining.text()+' 小时单端燃烧量':'尚未点火';
 });
 const now=time.number()+dt;
 get('clock').textContent=animation?'≈ '+short(now)+' h':radixText(time,10)+' h';
 const binary=animation?now.toString(2):radixText(time,2);
 const dot=binary.indexOf('.'),limit=dot<0?binary.length:dot+17;
 get('clock-binary').textContent=(animation?'≈ '+binary.slice(0,limit)+(binary.length>limit?'…':''):binary)+'₂ h';
 get('clock-label').textContent=animation?'时间流动中 · 到事件时停下':'当前已知时刻';
}
function render(){
 const busy=!!animation;visuals=[];
 get('summary').textContent=(target?'挑战 '+target.text()+' h':'自由模式')+' / '+ropes.length+' 根（已用 '+ropes.filter(r=>r.used).length+'）';get('ropes').replaceChildren();
 ropes.forEach((r,i)=>{
  const row=el('div','rope-game-row'),top=el('div','rope-game-top'),name=el('strong','','绳 '+r.id),label=el('span','rope-state');row.dataset.burning=String(!r.done&&(r.left||r.right));top.append(name,label);
  const controls=el('div','rope-game-ends'),l=el('button','','左端'+(r.left?' · 已点燃':'')),rightButton=el('button','','右端'+(r.right?' · 已点燃':'')),track=el('div','rope-track'),fiber=el('span','rope-fiber'),left=el('span','rope-flame'),right=el('span','rope-flame');track.setAttribute('aria-hidden','true');track.append(fiber,left,right);
  l.type=rightButton.type='button';l.disabled=busy||finished||r.done||r.left;rightButton.disabled=busy||finished||r.done||r.right;l.onclick=()=>light(i,'left');rightButton.onclick=()=>light(i,'right');controls.append(l,track,rightButton);
  const both=el('button','rope-both','两端同时点燃');both.type='button';both.disabled=busy||finished||r.done||r.left||r.right;both.onclick=()=>light(i,'both');const remove=el('button','rope-remove','移除绳子');remove.type='button';remove.disabled=busy||finished||r.used;remove.title=r.used?'已点燃的绳子保留在实验记录中':'移除这根尚未点燃的绳子';remove.onclick=()=>{if(animation||finished||r.used)return;save();ropes.splice(i,1);message('已移除绳 '+r.id+'；可撤销恢复。');render();};row.append(top,controls,both,remove);get('ropes').append(row);visuals.push({r,fiber,left,right,label});
 });
 get('next').disabled=busy||finished||!ropes.some(r=>!r.done&&(r.left||r.right));get('skip').hidden=!busy;get('add').disabled=busy||finished||ropes.length>=40;get('undo').disabled=busy||!history.length;
 get('start-challenge').disabled=busy;document.querySelectorAll('[data-target]').forEach(b=>b.disabled=busy);get('free').disabled=busy||!target;
 get('answer').hidden=!target;get('log').replaceChildren(...log.map(s=>el('li','',s)));paint();
}
function light(i,side){const r=ropes[i];if(animation||finished||r.done||side==='both'&&(r.left||r.right)||r[side])return;save();if(side==='both'){r.left=true;r.right=true;}else r[side]=true;r.used=true;log.push(time.text()+' h：点燃绳 '+r.id+(side==='both'?' 的两端':side==='left'?' 的左端':' 的右端'));message('已点火。可以继续点燃其他端点，或让时间流向下一次燃尽。');render();}
function commit(){
 if(!animation)return;cancelAnimationFrame(raf);const {delta}=animation;animation=null;const burned=[];
 ropes.forEach((r,i)=>{if(r.done)return;if(r.left)r.leftBurn=r.leftBurn.add(delta);if(r.right)r.rightBurn=r.rightBurn.add(delta);r.remaining=one.sub(r.leftBurn).sub(r.rightBurn);if((r.left||r.right)&&r.remaining.cmp(zero)===0){r.done=true;burned.push(r.id);}});time=time.add(delta);log.push(time.text()+' h：绳 '+burned.join('、')+' 燃尽');
 if(target&&time.cmp(target)===0){finished=true;message('命中目标！绳 '+burned.join('、')+' 在 '+target.text()+' 小时燃尽。可返回自由模式继续探索。');}
 else if(target&&time.cmp(target)>0){finished=true;message('当前事件 '+time.text()+' h 已越过目标。可撤销，或返回自由模式继续。',true);}
 else message('现在是 '+time.text()+' h，绳 '+burned.join('、')+' 燃尽。可以在这个时刻继续点火。');render();
}
function tick(stamp){if(!animation)return;const a=animation;if(a.last!==null){const elapsed=Math.min(100,Math.max(0,stamp-a.last));a.progress=Math.min(1,a.progress+elapsed/2600*Number(get('speed').value||1));}a.last=stamp;paint(a.progress);if(a.progress===1)commit();else raf=requestAnimationFrame(tick);}
function next(){if(animation||finished)return;let delta=null;for(const r of ropes){const count=Number(r.left)+Number(r.right);if(!r.done&&count){const d=r.remaining.div(count===2?two:one);if(delta===null||d.cmp(delta)<0)delta=d;}}if(!delta)return;save();animation={delta,progress:0,last:null};message('正在燃烧到下一次事件。动画结束前端点暂时锁定。');render();if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)commit();else raf=requestAnimationFrame(tick);}
function reset(){cancelAnimationFrame(raf);animation=null;time=zero;nextId=1;ropes=[rope(),rope(),rope()];log=['0 h：'+(target?'挑战开始':'自由实验开始')];history=[];finished=false;if(worker)worker.terminate();get('answer').open=false;get('table').replaceChildren();get('answer-status').textContent='';get('solve').disabled=false;message(target?'挑战目标 '+target.text()+' h。由你决定怎样点火。':'自由模式：点击任意端点点火，不设目标，也不限制实验的结束时刻。');render();}
function startChallenge(){if(animation)return;try{const t=q(get('target').value);if(t.cmp(q('1/2'))<0||t.cmp(q('3'))>0)throw Error('挑战目标范围为 1/2 到 3 小时；自由实验不受此目标范围限制');if(t.d&(t.d-1n))throw Error('目标须为二进有理数，有限次融合的分母只能是 2 的幂');target=t;reset();}catch(e){message(e.message,true);}}
get('form').addEventListener('submit',e=>{e.preventDefault();startChallenge();});document.querySelectorAll('[data-target]').forEach(b=>b.addEventListener('click',()=>{get('target').value=b.dataset.target;startChallenge();}));
get('next').onclick=next;get('skip').onclick=commit;get('reset').onclick=reset;get('add').onclick=()=>{if(animation||finished||ropes.length>=40)return;save();ropes.push(rope());render();};
get('undo').onclick=()=>{if(animation)return;const s=history.pop();if(!s)return;time=q(s.time);ropes=s.ropes.map(r=>({...r,remaining:q(r.remaining),leftBurn:q(r.leftBurn),rightBurn:q(r.rightBurn)}));log=s.log;finished=s.finished;message('已撤销上一步。');render();};
get('free').onclick=()=>{if(animation||!target)return;target=null;finished=false;history=[];if(worker)worker.terminate();log.push(time.text()+' h：保留状态，返回自由模式');message('已返回自由模式，绳子与当前时刻均已保留。');render();};
get('solve').onclick=()=>{
 if(!target)return;if(worker)worker.terminate();get('solve').disabled=true;get('answer-status').textContent='正在计算一种精确解答…';
 try{worker=new Worker('./rope-worker.js?v=20261031');worker.onmessage=e=>{get('solve').disabled=false;if(e.data.error){get('answer-status').textContent=e.data.error;return;}const p=e.data.plan;get('answer-status').textContent='一种可行方案：'+p.ropes.length+' 根绳子。';const table=el('table'),head=el('thead'),tr=el('tr');for(const t of ['时刻 / 小时','事件','需要点燃']){const th=el('th','',t);th.scope='col';tr.append(th);}head.append(tr);const body=el('tbody');for(const ev of p.events){const tr=el('tr');for(const t of [ev.time,ev.burned.length?'绳 '+ev.burned.join('、')+' 燃尽':'起点',ev.lights.map(l=>'绳 '+l.rope+(l.side==='left'?' 左端':' 右端')).join('；')||'目标达成'])tr.append(el('td','',t));body.append(tr);}table.append(head,body);get('table').replaceChildren(table);};worker.onerror=()=>{get('solve').disabled=false;get('answer-status').textContent='解答模块加载失败，请刷新重试。';};worker.postMessage({expression:target.text()});}catch(e){get('solve').disabled=false;get('answer-status').textContent='解答计算模块未启动。';}
};
document.addEventListener('visibilitychange',()=>{if(animation)animation.last=null;});reset();
})();
