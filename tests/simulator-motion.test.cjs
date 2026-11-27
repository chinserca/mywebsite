const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../simulater/peer-motion.js'),'utf8');
const motion=import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));

function player(sequence,x,extra={}){
 return {sequence,seen:sequence*250,x,y:10,z:0,yaw:0,...extra};
}
function peer(){
 return {sequence:0,seen:-1,snapshots:[]};
}
test('duplicate and older updates cannot rewind a moving peer',async()=>{
 const {receiveSnapshot,sampleMotion}=await motion;
 const remote=peer();
 receiveSnapshot(remote,player(1,0),0);
 receiveSnapshot(remote,player(2,10),250);
 assert.equal(sampleMotion(remote.snapshots,600).x,10);
 assert.equal(receiveSnapshot(remote,player(2,10),700),false);
 assert.equal(receiveSnapshot(remote,player(1,0),750),false);
 assert.equal(sampleMotion(remote.snapshots,900).x,10);
 receiveSnapshot(remote,player(3,20),1000);
 let previous=10;
 for(let time=900;time<=1500;time+=10){
  const pose=sampleMotion(remote.snapshots,time);
  assert(pose.x>=previous);
  assert(pose.x<=20);
  previous=pose.x;
 }
});
test('a stopped vehicle stays at its last actual position',async()=>{
 const {receiveSnapshot,sampleMotion}=await motion;
 const remote=peer();
 receiveSnapshot(remote,player(1,0),0);
 receiveSnapshot(remote,player(2,10),250);
 for(const time of [600,1000,2000])assert.equal(sampleMotion(remote.snapshots,time).x,10);
});
test('turning across the angle boundary takes the short path',async()=>{
 const {receiveSnapshot,sampleMotion}=await motion;
 const remote=peer();
 receiveSnapshot(remote,player(1,0,{yaw:3.1}),0);
 receiveSnapshot(remote,player(2,0,{yaw:-3.1}),250);
 const pose=sampleMotion(remote.snapshots,475);
 assert(Math.abs(pose.yaw-Math.PI)<.001);
});
test('older clients can be ordered by server timestamps',async()=>{
 const {receiveSnapshot}=await motion;
 const remote=peer();
 assert(receiveSnapshot(remote,{...player(0,1),seen:500},0));
 assert.equal(receiveSnapshot(remote,{...player(0,0),seen:250},500),false);
});
