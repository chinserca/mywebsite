const {getCache}=require('@vercel/functions');
const cache=getCache({namespace:'mywebsite-factory-presence-v2'});
const slotCount=16;
const lifetime=18;
const slots=Array.from({length:slotCount},(_,i)=>'player-'+i);

function validPosition(value){
 if(!value||typeof value.id!=='string'||!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(value.id))return false;
 const {x,z,yaw,zone}=value;
 if(![x,z,yaw].every(Number.isFinite)||Math.abs(yaw)>10)return false;
 if(zone==='lab')return Math.abs(x-1000)<=12&&Math.abs(z)<=11;
 return zone==='earth'&&Math.abs(x)<=135&&z>=-110&&z<=140;
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
 const {id,x,z,yaw,zone}=input;
 const skin=typeof input.skin==='string'&&input.skin.length<300&&/^https:\/\/[a-z0-9-]+\.rbxcdn\.com\//i.test(input.skin)?input.skin:'';
 const username=skin&&typeof input.username==='string'&&/^[a-zA-Z0-9_]{3,20}$/.test(input.username)?input.username:'';
 const player={id,x,z,yaw,zone,skin,username,seen:Date.now()};
 try{
  const active=(await Promise.all(slots.map(key=>cache.get(key))))
   .map(value=>validPosition(value)&&Number.isFinite(value.seen)&&player.seen-value.seen<lifetime*1000?value:null);
  let slot=active.findIndex(value=>value?.id===id);
  if(slot===-1){
   const start=parseInt(id.slice(0,8),16)%slotCount;
   for(let offset=0;offset<slotCount;offset++){
    const i=(start+offset)%slotCount;
    if(!active[i]){slot=i;break;}
   }
  }
  if(slot===-1)return res.status(503).json({error:'World is full'});
  await cache.set(slots[slot],player,{ttl:lifetime});
  const peers=active.filter(value=>value&&value.id!==id&&value.zone===zone)
   .map(({id,x,z,yaw,zone,skin,username})=>({id,x,z,yaw,zone,skin,username}));
  return res.status(200).json({peers});
 }catch{
  return res.status(503).json({error:'World unavailable'});
 }
};
