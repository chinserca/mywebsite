const interpolationDelay=350;

export function isNewerSnapshot(peer,player){
 const sequence=player.sequence??0;
 if(sequence>0&&peer.sequence>0&&sequence<=peer.sequence)return false;
 if(!(sequence>0&&peer.sequence>0)&&player.seen<=peer.seen)return false;
 return true;
}

export function receiveSnapshot(peer,player,now){
 const sequence=player.sequence??0;
 if(!isNewerSnapshot(peer,player))return false;
 peer.sequence=sequence;
 peer.seen=player.seen;
 peer.received=now;
 peer.snapshots.push({
  time:now,x:player.x,y:player.y,z:player.z,
  yaw:player.yaw,pitch:player.pitch??0,roll:player.roll??0
 });
 if(peer.snapshots.length>20)peer.snapshots.shift();
 return true;
}

function angleBetween(start,end,mix){
 const difference=Math.atan2(Math.sin(end-start),Math.cos(end-start));
 return start+difference*mix;
}

export function sampleMotion(snapshots,now){
 const time=now-interpolationDelay;
 while(snapshots.length>2&&snapshots[1].time<=time)snapshots.shift();
 const first=snapshots[0];
 const next=snapshots[1]??first;
 const mix=next.time===first.time?0:Math.max(0,Math.min(1,(time-first.time)/(next.time-first.time)));
 return {
  x:first.x+(next.x-first.x)*mix,
  y:first.y+(next.y-first.y)*mix,
  z:first.z+(next.z-first.z)*mix,
  yaw:angleBetween(first.yaw,next.yaw,mix),
  pitch:angleBetween(first.pitch,next.pitch,mix),
  roll:angleBetween(first.roll,next.roll,mix)
 };
}
