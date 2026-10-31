(function(root){
'use strict';
const parse=typeof module==='object'?require('./rope-core.js').parse:root.RopeCore.parse;
const zero=parse('0'),one=parse('1');
class Experiment{
 constructor(k=2){if(!Number.isInteger(k)||k<1||k>12)throw Error('每箱龙头数应为 1 至 12 的整数');this.k=k;this.time=zero;this.tanks=[];this.nextId=1;this.history=[];this.log=['0 h：自由实验开始'];for(let i=0;i<3;i++)this.tanks.push(this.fresh());}
 fresh(){return {id:this.nextId++,fill:zero,taps:Array(this.k).fill(false),full:false};}
 save(){this.history.push({time:this.time,tanks:this.tanks.map(t=>({...t,taps:[...t.taps]})),log:[...this.log]});}
 undo(){const s=this.history.pop();if(s){this.time=s.time;this.tanks=s.tanks;this.log=s.log;}}
 add(){if(this.tanks.length>=40)throw Error('最多展示 40 个水箱');this.save();this.tanks.push(this.fresh());}
 remove(id){const i=this.tanks.findIndex(t=>t.id===id);if(i<0||this.tanks[i].taps.some(Boolean))return;this.save();this.tanks.splice(i,1);}
 open(id,index){const t=this.tanks.find(t=>t.id===id);if(!t||t.full)return;const chosen=index===null?t.taps.map((v,i)=>v?-1:i).filter(i=>i>=0):[index];if(!chosen.length||chosen.some(i=>i<0||i>=this.k||t.taps[i]))return;this.save();for(const i of chosen)t.taps[i]=true;this.log.push(this.time.text()+' h：水箱 '+id+' 开启龙头 '+chosen.map(i=>i+1).join('、'));}
 delta(){let result=null;for(const t of this.tanks){const n=t.taps.filter(Boolean).length;if(!t.full&&n){const d=one.sub(t.fill).div(parse(''+n));if(result===null||d.cmp(result)<0)result=d;}}return result;}
 advance(){const d=this.delta();if(!d)return null;this.save();const full=[];for(const t of this.tanks){if(t.full)continue;const n=t.taps.filter(Boolean).length;t.fill=t.fill.add(d.mul(parse(''+n)));if(t.fill.cmp(one)===0){t.full=true;full.push(t.id);}}this.time=this.time.add(d);this.log.push(this.time.text()+' h：水箱 '+full.join('、')+' 注满');return {delta:d,full,time:this.time};}
}
function decimal(q,limit=16){let r=q.n%q.d,s=(q.n/q.d).toString()+'.';if(!r)return s+'0';for(let i=0;i<limit&&r;i++){r*=10n;s+=(r/q.d).toString();r%=q.d;}return (r?'≈ ':'')+s+(r?'…':'');}
const api={Experiment,decimal};if(typeof module==='object')module.exports=api;else root.TankCore=api;
})(typeof globalThis==='object'?globalThis:this);
