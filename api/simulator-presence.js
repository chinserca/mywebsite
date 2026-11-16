const {getCache}=require('@vercel/functions');
const cache=getCache({namespace:'mywebsite-simulator-presence-v1'});
const slotCount=16;
const cars=new Set([0,4]);
const lifetime=18;
const slots=Array.from({length:slotCount},(_,i)=>'player-'+i);
const collisionKey=({id,run})=>'collision-'+id+'-'+(run??0);

function validPosition(value){
 if(!value||typeof value.id!=='string'||!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(value.id))return false;
 const {x,y,z,yaw,vehicle}=value;
 return Number.isInteger(vehicle)&&vehicle>=-1&&vehicle<14&&[x,y,z,yaw].every(Number.isFinite)
  &&Math.abs(x)<=360&&Math.abs(z)<=360&&y>=0&&y<=48&&Math.abs(yaw)<=Math.PI;
}

module.exports=async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({error:'Use POST'});
 if(Number(req.headers['content-length'])>1024)return res.status(413).json({error:'Position too large'});
 let input;
 try{input=typeof req.body==='string'?JSON.parse(req.body):req.body;}catch{
  return res.status(400).json({error:'Invalid JSON'});
 }
 if(!validPosition(input))return res.status(400).json({error:'Invalid position'});
 const {id,x,y,z,yaw,vehicle}=input;
 const run=Number.isSafeInteger(input.run)&&input.run>=0?input.run:0;
 const player={id,x,y,z,yaw,vehicle,run,canCollide:input.canCollide===true,seen:Date.now()};
 try{
  const active=(await Promise.all(slots.map(key=>cache.get(key))))
   .map(value=>validPosition(value)&&Number.isFinite(value.seen)&&player.seen-value.seen<lifetime*1000&&value.vehicle>=0?value:null);
  let slot=active.findIndex(value=>value?.id===id);
  if(slot===-1&&vehicle>=0){
   const start=parseInt(id.slice(0,8),16)%slotCount;
   for(let offset=0;offset<slotCount;offset++){
    const i=(start+offset)%slotCount;
    if(!active[i]){slot=i;break;}
   }
  }
  if(slot===-1&&vehicle>=0)return res.status(503).json({error:'World is full'});
  if(slot>=0)await cache.set(slots[slot],player,{ttl:vehicle>=0?lifetime:1});
  const peers=active.filter(value=>value&&value.id!==id&&value.vehicle>=0)
   .map(({id,x,y,z,yaw,vehicle})=>({id,x,y,z,yaw,vehicle}));
  let collision=false;
  if(vehicle>=0&&!cars.has(vehicle)&&input.canCollide===true){
   collision=Boolean(await cache.get(collisionKey(player)));
   if(!collision){
    const other=active.find(peer=>peer&&peer.id!==id&&peer.canCollide&&!cars.has(peer.vehicle)
     &&player.seen-peer.seen<3500&&(y>.65||peer.y>.65)
     &&Math.hypot(x-peer.x,z-peer.z)<2&&Math.abs(y-peer.y)<.7);
    if(other){
     collision=true;
     await cache.set(collisionKey(other),true,{ttl:6});
    }
   }
  }
  return res.status(200).json({peers,collision});
 }catch{
  return res.status(503).json({error:'World unavailable'});
 }
};
