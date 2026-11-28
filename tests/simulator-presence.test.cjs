const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
function server(){
 const rows=new Map();let writes=0;const mod={exports:{}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../api/simulator-presence.js'),'utf8'),{
  module:mod,require:()=>({getCache:()=>({get:async key=>rows.get(key),set:async(key,value)=>{rows.set(key,structuredClone(value));writes++}})}),Date,JSON,Number,Math,Set,Array,Promise
 });
 return {
  get writes(){return writes},
  async send(body){const res={setHeader(){},status(value){this.code=value;return this},json(value){this.body=value;return this}};await mod.exports({method:'POST',headers:{},body},res);assert.equal(res.code,200);return res.body;}
 };
}
const first={id:'12345678-1234-1234-1234-123456789012',x:0,y:.42,z:0,yaw:0,vehicle:2,sequence:1};
const observer={...first,id:'23456789-1234-1234-1234-123456789012'};
test('leaving a simulator releases the player without waiting for the heartbeat timeout',async()=>{
 const api=server();await api.send(first);
 assert.equal((await api.send(observer)).peers.length,1);
 await api.send({...first,vehicle:-1,sequence:2});
 assert.equal((await api.send(observer)).peers.length,0);
});
test('stationary sequence updates do not generate extra cache writes',async()=>{
 const api=server();await api.send(first);const count=api.writes;
 for(let sequence=2;sequence<20;sequence++)await api.send({...first,sequence});
 assert.equal(api.writes,count);
});
test('custom drones retain their name, camera and base identity in multiplayer',async()=>{
 const api=server();await api.send({...first,custom:{name:'Workshop Drone',paint:0x32b8a5,fpv:true,bladeGuards:true}});
 const peer=(await api.send(observer)).peers[0];
 assert.equal(peer.vehicle,2);assert.equal(peer.custom.name,'Workshop Drone');assert.equal(peer.custom.fpv,true);assert.equal(peer.custom.paint,0x32b8a5);
});
