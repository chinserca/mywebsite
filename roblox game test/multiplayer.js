const playerId = crypto.randomUUID();
const expiryMs = 12000;

export function connectWorld({THREE,scene,label,status,readPosition,labX,bounds}){
 const peers=new Map();
 let online=false,pending=false,lastSent=-5000,lastPosition=null,attempted=false;
 const geometry=new THREE.BoxGeometry(1,1,1);
 const suit=new THREE.MeshStandardMaterial({color:0x8756ec});
 const skin=new THREE.MeshStandardMaterial({color:0xffdbb3});
 const boots=new THREE.MeshStandardMaterial({color:0x24465c});
 function remove(id){
  const peer=peers.get(id);
  if(!peer)return;
  scene.remove(peer.avatar,peer.sign);
  peer.sign.material.map.dispose();
  peer.sign.material.dispose();
  peers.delete(id);
 }
 function receive({payload}){
  if(!payload)return;
  const {id,zone,x,z,yaw}=payload;
  if(typeof id!=='string'||!/^[a-f0-9-]{36}$/.test(id)||id===playerId)return;
  if(![x,z,yaw].every(Number.isFinite)||Math.abs(yaw)>10)return;
  if(zone==='earth'){
   if(x<bounds.minX||x>bounds.maxX||z<bounds.minZ||z>bounds.maxZ)return;
  }else if(zone!=='lab'||Math.abs(x-labX)>12||Math.abs(z)>11)return;
  let peer=peers.get(id);
  if(!peer){
   if(peers.size>=32)return;
   const avatar=new THREE.Group();
   for(const [w,h,d,px,py,material] of [[.85,.95,.5,0,1.3,suit],[.66,.65,.66,0,2.1,skin],[.32,.72,.35,-.23,.42,boots],[.32,.72,.35,.23,.42,boots]]){
    const mesh=new THREE.Mesh(geometry,material);
    mesh.scale.set(w,h,d);mesh.position.set(px,py,0);avatar.add(mesh);
   }
   scene.add(avatar);
   peer={avatar,sign:label('PLAYER '+id.slice(0,4).toUpperCase(),x,2.95,z,'#dfd3ff',.46),zone};
   avatar.position.set(x,0,z);
   peers.set(id,peer);
  }
  if(peer.zone!==zone||Math.hypot(x-peer.avatar.position.x,z-peer.avatar.position.z)>16)peer.avatar.position.set(x,0,z);
  Object.assign(peer,{x,z,yaw,zone,seen:performance.now()});
 }
 async function sync(local){
  pending=true;
  try{
   const response=await fetch('/api/factory-presence',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({id:playerId,...local}),signal:AbortSignal.timeout(5000)
   });
   if(!response.ok)throw new Error('World unavailable');
   const {peers:players}=await response.json();
   if(!Array.isArray(players))throw new Error('Invalid world response');
   online=true;
   for(const payload of players)receive({payload});
  }catch{
   online=false;
  }finally{
   attempted=true;
   pending=false;
  }
 }
 return (now,dt)=>{
  const local=readPosition();
  let nearby=0;
  for(const [id,peer] of peers){
   if(now-peer.seen>expiryMs){remove(id);continue;}
   const visible=peer.zone===local.zone;
   peer.avatar.visible=peer.sign.visible=visible;
   if(!visible)continue;
   nearby++;
   const mix=1-Math.exp(-dt*15);
   peer.avatar.position.x+=(peer.x-peer.avatar.position.x)*mix;
   peer.avatar.position.z+=(peer.z-peer.avatar.position.z)*mix;
   peer.avatar.rotation.y=peer.yaw;
   peer.sign.position.set(peer.avatar.position.x,2.95,peer.avatar.position.z);
  }
  const text=online?'Online · '+(nearby+1)+' in this area':attempted?'Solo · Connection unavailable':'Solo · Connecting…';
  if(status.textContent!==text)status.textContent=text;
  if(pending||document.hidden)return;
  const changed=!lastPosition||local.zone!==lastPosition.zone||Math.hypot(local.x-lastPosition.x,local.z-lastPosition.z)>.12||Math.abs(local.yaw-lastPosition.yaw)>.1;
  const interval=!online?5000:changed?1250:4500;
  if(now-lastSent<interval)return;
  lastSent=now;
  lastPosition=local;
  void sync(local);
 };
}
