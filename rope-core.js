/* Exact event-driven rope plans. All scheduling arithmetic uses BigInt. */
(function(root){
'use strict';
function gcd(a,b){a=a<0n?-a:a;while(b){const t=a%b;a=b;b=t;}return a;}
class Q{
 constructor(n,d=1n){if(!d)throw Error('分母应当非零');if(d<0n){n=-n;d=-d;}const g=gcd(n,d)||1n;this.n=n/g;this.d=d/g;if(this.n.toString(2).length>4096||this.d.toString(2).length>4096)throw Error('数值超过实验的位数预算');}
 add(b){return new Q(this.n*b.d+b.n*this.d,this.d*b.d);} sub(b){return new Q(this.n*b.d-b.n*this.d,this.d*b.d);} mul(b){return new Q(this.n*b.n,this.d*b.d);} div(b){return new Q(this.n*b.d,this.d*b.n);} cmp(b){const v=this.n*b.d-b.n*this.d;return v<0n?-1:v>0n?1:0;} text(){return this.d===1n?''+this.n:this.n+'/'+this.d;} number(){return Number(this.n)/Number(this.d);}
}
const zero=new Q(0n),one=new Q(1n),two=new Q(2n);
function parse(src){
 if(typeof src!=='string'||src.length>160)throw Error('请输入 160 字符以内的时刻算式');
 const tokens=src.match(/\d+(?:\.\d+)?|\.\d+|[^\s]/g)||[];let p=0,depth=0;
 function atom(){if(++depth>24)throw Error('括号层数过多');let t=tokens[p++],v;if(t==='+'||t==='-'){v=atom();if(t==='-')v=zero.sub(v);}else if(t==='('){v=sum();if(tokens[p++]!==')')throw Error('括号未配对');}else if(t&&/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(t)){const parts=t.split('.');const d=10n**BigInt((parts[1]||'').length);v=new Q(BigInt((parts[0]||'0')+(parts[1]||'')),d);}else throw Error('支持数字、小数、加减乘除和括号');depth--;return v;}
 function product(){let v=atom();while(tokens[p]==='*'||tokens[p]==='/'){const t=tokens[p++],b=atom();v=t==='*'?v.mul(b):v.div(b);}return v;}
 function sum(){let v=product();while(tokens[p]==='+'||tokens[p]==='-'){const t=tokens[p++],b=product();v=t==='+'?v.add(b):v.sub(b);}return v;}
 const v=sum();if(p!==tokens.length)throw Error('算式含有未识别的内容');return v;
}
function plan(expression,options={}){
 const target=parse(expression),maxSteps=options.maxSteps||160000,maxRopes=options.maxRopes||500;
 if(target.cmp(zero)<=0)throw Error('目标应大于 0 小时');
 if(target.cmp(new Q(3n))>0)throw Error('当前实验支持 0 到 3 小时；更高时刻的方案可能极大');
 if(target.d&(target.d-1n))throw Error('这个时刻不是二进有理数：有限次融合产生的分母只能是 2 的幂');
 if(target.cmp(new Q(1n,2n))<0)throw Error('第一根绳子最早在半小时燃尽；该目标早于首次事件');
 const cache=new Map(),nodes=new Map();let steps=0;
 function succ(input){
  const stack=[{x:input,stage:0}];
  while(stack.length){
   if(++steps>maxSteps)throw Error('方案搜索达到计算预算；这不表示目标不可计时');
   const f=stack[stack.length-1],key=f.x.text();
   if(cache.has(key)){stack.pop();continue;}
   if(f.x.cmp(zero)<0){cache.set(key,zero);stack.pop();continue;}
   if(f.stage===0){f.stage=1;stack.push({x:f.x.sub(one),stage:0});}
   else if(f.stage===1){f.a=cache.get(f.x.sub(one).text());f.u=f.x.mul(two).sub(f.a).sub(one);f.stage=2;stack.push({x:f.u,stage:0});}
   else{const b=cache.get(f.u.text()),end=f.a.add(b).add(one).div(two);cache.set(key,end);if(!nodes.has(end.text()))nodes.set(end.text(),{a:f.a,b,end});stack.pop();}
  }
  return cache.get(input.text());
 }
 let found=false;
 for(let k=1;k<=48;k++){
  const t=succ(target.sub(new Q(1n,1n<<BigInt(k))));
  if(t.cmp(target)===0){found=true;break;}
  if(t.cmp(target)>0)throw Error('该时刻不在本文的驯服集合中；这项实验不据此判定它是否属于全体燃烧数');
 }
 if(!found)throw Error('尚未在精度预算内找到构造；这不表示目标不可计时');
 const required=new Map(),pending=[target];
 while(pending.length){const t=pending.pop();if(!t.n||required.has(t.text()))continue;const n=nodes.get(t.text());if(!n)throw Error('点火依赖缺失');required.set(t.text(),n);pending.push(n.a,n.b);if(required.size>maxRopes)throw Error('方案超过 '+maxRopes+' 根绳子的展示预算');}
 const sorted=[...required.values()].sort((a,b)=>a.end.cmp(b.end));
 const ids=new Map(sorted.map((n,i)=>[n.end.text(),i+1]));
 const ropes=sorted.map((n,i)=>({id:i+1,a:n.a.text(),b:n.b.text(),end:n.end.text(),aValue:n.a.number(),bValue:n.b.number(),endValue:n.end.number(),leftTrigger:ids.get(n.a.text())||null,rightTrigger:ids.get(n.b.text())||null}));
 const eventMap=new Map();
 function event(q){const key=q.text();if(!eventMap.has(key))eventMap.set(key,{time:key,value:q.number(),burned:[],lights:[]});return eventMap.get(key);}
 for(const n of sorted){const id=ids.get(n.end.text());event(n.a).lights.push({rope:id,side:'left'});event(n.b).lights.push({rope:id,side:'right'});event(n.end).burned.push(id);}
 return {target:target.text(),targetValue:target.number(),ropes,events:[...eventMap.values()].sort((a,b)=>parse(a.time).cmp(parse(b.time))),steps};
}
const api={plan,parse};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.RopeCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
