/* Ordinal expansion engine. q = total blocks/layers, 1..6. No network dependencies. */
(function(root){'use strict';
const MAX=240;
const clone=x=>JSON.parse(JSON.stringify(x));
function checkQ(q){if(!Number.isInteger(q)||q<1||q>6)throw Error('副本总数 q 应为 1 到 6。');}
function safe(v){if(!Number.isSafeInteger(v)||v<0||v>1000000)throw Error('数值超出本页显示范围。');return v;}
function budget(n){if(n>MAX)throw Error('展开结果超过 240 个节点／列，请减小 q 或撤销一步。');}
function parseForest(text){
 const s=text.replace(/\s/g,'');let i=0,count=0;
 function forest(){if(s[i]==='0'){i++;return [];}const out=[];while(i<s.length){let k;
 if(s[i]==='h'){k=1;i++;}else if(s[i]==='p'){i++;const m=s.slice(i).match(/^\d+/);if(!m)throw Error('p 后面需要正整数标签。');k=Number(m[0]);i+=m[0].length;}else throw Error('请使用 h(...) 或 p1(...) 形式。');
 if(!Number.isInteger(k)||k<1||k>10000)throw Error('节点标签应为 1 到 10000。');
 if(s[i++]!=='(')throw Error('节点后缺少左括号。');budget(++count);let children=[];if(s[i]!==')')children=forest();if(s[i++]!==')')throw Error('缺少右括号。');out.push({k,children});if(s[i]!=='+')break;i++;}
 return out;}
 if(!s)return [];const f=forest();if(i!==s.length)throw Error('括号或加号位置不正确。');validateForest(f);return f;
}
function validateForest(f){let count=0;function walk(a,max){for(const n of a){budget(++count);if(n.k>max)throw Error('顶层标签须为 1；子节点标签不能超过父标签加 1。');walk(n.children,n.k+1);}}walk(f,1);return f;}
function formatForest(f,kp=false){return f.length?f.map(n=>(kp?'h':'p'+n.k)+'('+formatForest(n.children,kp)+')').join('+'):'0';}
function forestToSeq(f){let out=[];for(const n of f)out.push(n.k,...forestToSeq(n.children).map(x=>safe(x+n.k)));return out;}
function forestToMatrix(f,d=0){let out=[];for(const n of f)out.push([d,n.k-1],...forestToMatrix(n.children,d+1));return out;}
function rightPath(f){const p=[];let a=f;while(a.length){const i=a.length-1;p.push(i);a=a[i].children;}return p;}
function at(f,path){let n;for(const i of path){n=f[i];f=n.children;}return n;}
function replace(f,path,rep){if(path.length===1)return [...f.slice(0,path[0]),...clone(rep),...f.slice(path[0]+1)];const out=clone(f);const i=path[0];out[i].children=replace(out[i].children,path.slice(1),rep);return out;}
function expandForest(f,q){checkQ(q);if(!f.length)return {forest:[],type:'zero',explanation:'空项表示 0，没有前驱或基本列。',leafPath:[],rootPath:[]};
 const path=rightPath(f),leaf=at(f,path);let out,rootPath,type,explanation;
 if(leaf.k===1){if(path.length===1){rootPath=[];out=f.slice(0,-1);type='successor';explanation='末叶标签为 1 且位于顶层：删除末叶，取得前驱。';}
 else{rootPath=path.slice(0,-1);const parent=clone(at(f,rootPath));parent.children.pop();out=replace(f,rootPath,Array.from({length:q},()=>clone(parent)));type='parallel';explanation='末叶标签为 1：删除它，把父节点及其剩余子树保留 '+q+' 份，并排放回原位置。';}}
 else{let j=path.length-2;while(j>=0&&at(f,path.slice(0,j+1)).k!==leaf.k-1)j--;if(j<0)throw Error('没有找到标签为 '+(leaf.k-1)+' 的外层参考节点。');rootPath=path.slice(0,j+1);const template=at(f,rootPath),rel=path.slice(j+1);let value=[];
 for(let t=0;t<q;t++)value=[{k:template.k,children:replace(template.children,rel,value)}];out=replace(f,rootPath,value);type='nested';explanation='末叶标签为 '+leaf.k+'：向外找到最近的标签 '+(leaf.k-1)+' 节点。保留其完整上下文 F，把该子树替换成 F 迭代 '+q+' 次作用于 0 的结果。';}
 validateForest(out);return {forest:out,rootPath,leafPath:path,type,explanation};
}
function seqToForest(s){if(!s.length)return [];if(s[0]!==1||s.some(x=>!Number.isInteger(x)||x<1))throw Error('序列应为以 1 开头的正整数序列。');budget(s.length);const roots=[],stack=[];for(const x of s){while(stack.length&&stack.at(-1).v>=x)stack.pop();const v=stack.length?stack.at(-1).v:0;const n={k:x-v,children:[]};(stack.length?stack.at(-1).n.children:roots).push(n);stack.push({v:x,n});}return roots;}
function hExpand(s,q){checkQ(q);if(!s.length)return [];if(s.at(-1)===1)return s.slice(0,-1);const p=[],d=[];for(let i=0;i<s.length;i++){let j=i-1;while(j>=0&&s[j]>=s[i])j--;p.push(j);d.push(s[i]-(j<0?0:s[j]));}let r=p.at(-1);if(d.at(-1)>1)while(r>=0&&d[r]>=d.at(-1))r=p[r];if(r<0)throw Error('未找到坏根。');const delta=s.at(-1)-s[r]-1,out=s.slice(0,r);budget(r+(s.length-r-1)*q);for(let t=0;t<q;t++)for(let i=r;i<s.length-1;i++)out.push(safe(s[i]+t*delta));return out;}
function canonical(a){if(!a.length)return [];let h=a[0].length;while(h>1&&a.every(c=>c[h-1]===0))h--;return a.map(c=>c.slice(0,h));}
function ancestors(p,x,include=true){let a=[];if(!include)x=p[x];while(x>=0){a.push(x);x=p[x];}return a;}
function parents(a,base=0){if(!a.length)return [];const h=a[0].length,w=a.length,p=Array.from({length:h},()=>Array(w).fill(-1));for(let y=0;y<h;y++)for(let x=0;x<w;x++){if(a[x][y]===base)continue;const cs=y?ancestors(p[y-1],x,false):Array.from({length:x},(_,i)=>x-1-i);for(const k of cs)if(a[k][y]<a[x][y]){p[y][x]=k;break;}}return p;}
function validateMatrix(a){budget(a.length);if(!a.length)return a;const h=a[0].length;if(h<1||h>16||a.some(c=>c.length!==h||c.some(x=>!Number.isInteger(x)||x<0||x>10000)))throw Error('矩阵各列须等长，元素为 0 到 10000，最多 16 行。');const p=parents(a);for(let y=0;y<h;y++)for(let x=0;x<a.length;x++)if(a[x][y]&&p[y][x]<0)throw Error('非零元素没有对应父项，请使用预设或有效矩阵。');return a;}
function bmExpand(a,q){checkQ(q);if(!a.length)return [];const p=parents(a),h=a[0].length,w=a.length;let t=-1;for(let y=0;y<h;y++)if(p[y][w-1]>=0)t=y;if(t<0)return canonical(a.slice(0,-1));const r=p[t][w-1],delta=a[w-1].map((v,y)=>y<t?v-a[r][y]:0),out=a.slice(0,r);budget(r+(w-r-1)*q);for(let k=0;k<q;k++)for(let x=r;x<w-1;x++)out.push(a[x].map((v,y)=>safe(v+k*delta[y]*(ancestors(p[y],x).includes(r)?1:0))));return canonical(out);}
function toY(a){if(!a.length)return [];const p=parents(a),h=a[0].length,w=a.length,e=Array.from({length:h+1},()=>Array(w).fill(1));for(let y=h-1;y>=0;y--)for(let x=0;x<w;x++)if(a[x][y]){if(p[y][x]<0)throw Error('非零元素没有父项。');e[y][x]=safe(e[y][p[y][x]]+e[y+1][x]);}return e[0];}
function mountain(s){if(!s.length)return {rows:[],ps:[]};budget(s.length);if(s[0]!==1||s.some(x=>!Number.isInteger(x)||x<1||x>10000))throw Error('0-Y 应为以 1 开头的正整数序列，每项不超过 10000。');const rows=[s.slice()],ps=[];while(true){const y=rows.length-1,row=rows[y],p=Array(s.length).fill(-1);if(y>32)throw Error('山脉超过 32 层，请选用较小表达式。');for(let x=0;x<row.length;x++){if(row[x]===1)continue;const cs=y?ancestors(ps[y-1],x,false):Array.from({length:x},(_,i)=>x-1-i);for(const k of cs)if(row[k]<row[x]){p[x]=k;break;}if(p[x]<0)throw Error('山脉中未找到父项。');}ps.push(p);if(row.every(x=>x===1))break;rows.push(row.map((v,x)=>p[x]<0?1:v-row[p[x]]));}return {rows,ps};}
function fromY(s){if(!s.length)return [];const {rows,ps}=mountain(s),h=rows.length,w=s.length,b=Array.from({length:h},()=>Array(w).fill(0));for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(ps[y][x]>=0)b[y][x]=b[y][ps[y][x]]+1;return canonical(Array.from({length:w},(_,x)=>b.map(r=>r[x])));}
function yExpand(s,q){checkQ(q);if(!s.length)return [];if(s.at(-1)===1)return s.slice(0,-1);const {rows,ps}=mountain(s),last=s.length-1;let t=0;while(rows[t][last]-rows[t][ps[t][last]]!==1)t++;const r=ps[t][last],width=last-r,outw=r+1+width*q;budget(outw);const out=Array.from({length:t+1},()=>Array(outw).fill(null));for(let y=0;y<=t;y++)for(let x=0;x<=r;x++)out[y][x]=rows[y][x];for(let block=0;block<q;block++)for(let orig=r+1;orig<=last;orig++)out[t][orig+block*width]=rows[t][orig]-(orig===last?1:0);for(let y=t-1;y>=0;y--)for(let block=0;block<q;block++)for(let orig=r+1;orig<=last;orig++){const x=orig+block*width,k=ps[y][orig];out[y][x]=k<0?out[y+1][x]:safe(out[y+1][x]+out[y][k<r?k:k+block*width]);}return out[0];}
const api={parseForest,validateForest,formatForest,expandForest,forestToSeq,forestToMatrix,seqToForest,hExpand,canonical,parents,ancestors,validateMatrix,bmExpand,toY,fromY,mountain,yExpand};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HydraEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this);
