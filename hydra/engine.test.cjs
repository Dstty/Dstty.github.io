const assert=require('node:assert/strict');const E=require('./engine.js');
for(const [s,expected]of [['p1(p2(0))','p1(p1(p1(0)))'],['p1(p2(0)+p2(0))','p1(p2(0)+p1(p2(0)+p1(p2(0))))'],['p1(p2(p2(0)))','p1(p2(p1(p2(p1(p2(0))))))'],['p1(p2(0)+p1(0))','p1(p2(0))+p1(p2(0))+p1(p2(0))']]){
 const f=E.parseForest(s),b=E.expandForest(f,3).forest;assert.equal(E.formatForest(b),expected);assert.deepEqual(E.hExpand(E.forestToSeq(f),3),E.forestToSeq(b));assert.deepEqual(E.bmExpand(E.forestToMatrix(f),3),E.canonical(E.forestToMatrix(b)));assert.deepEqual(E.seqToForest(E.forestToSeq(f)),f);
}
assert.equal(E.formatForest(E.expandForest(E.parseForest('h(h(0)+h(0))'),3).forest,true),'h(h(0))+h(h(0))+h(h(0))');
assert.deepEqual(E.hExpand([1,4,6,6],3),[1,4,6,5,8,10,9,12,14]);
assert.deepEqual(E.yExpand([1,4,6,4],3),[1,4,6,3,7,10,6,11,15,10]);
assert.deepEqual(E.yExpand([1,4,6,3,7,9,7],3),[1,4,6,3,7,9,6,11,13,10,16,18,15]);
assert.throws(()=>E.parseForest('p1(p3(0))'));assert.throws(()=>E.parseForest('p1(0)<script>'));assert.throws(()=>E.yExpand([1,4],7));assert.throws(()=>E.mountain([2,3]));
let seen=new Set(),queue=[];for(let h=1;h<=5;h++)queue.push({a:[Array(h).fill(0),Array(h).fill(1)],d:0});let edges=0;
while(queue.length){const {a,d}=queue.shift(),key=JSON.stringify(a);if(seen.has(key))continue;seen.add(key);const s=E.toY(a);assert.deepEqual(E.fromY(s),E.canonical(a));if(d>=4)continue;for(let q=1;q<=4;q++){let b;try{b=E.bmExpand(a,q);}catch{continue;}if(b.length>25)continue;edges++;if(s.length&&s.at(-1)>1)assert.deepEqual(E.toY(b),E.yExpand(s,q).slice(0,-1));queue.push({a:b,d:d+1});}}
console.log(`Passed published examples, tree/HPrSS/BMS checks, ${seen.size} roundtrips and ${edges} sampled expansion edges.`);
