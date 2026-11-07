// World decoration and lightweight effects; gameplay rules stay in state.js.
export function buildAdventureWorld({THREE,scene,box,label,player}){
 const animated=[],bursts=[];
 const material=(color,glow=false)=>new THREE.MeshStandardMaterial({color,roughness:.65,emissive:glow?color:0x000000,emissiveIntensity:glow?.5:0});
 function mesh(geometry,color,x,y,z,glow=false){const m=new THREE.Mesh(geometry,material(color,glow));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;scene.add(m);return m;}
 function ring(x,z,r,color,y=.22){const m=mesh(new THREE.TorusGeometry(r,.08,6,48),color,x,y,z,true);m.rotation.x=-Math.PI/2;return m;}
 // Color-coded industrial campus with lit pathways, planters and loading bays.
 box(24,.07,.15,0,.27,-15.5,0x54eee0);box(24,.07,.15,0,.27,3.5,0xffd66b);
 for(const x of [-11.5,11.5])box(.15,.07,19,x,.27,-6,0x54eee0);
 for(let x=-10;x<=10;x+=2){box(1.1,.02,.28,x,.23,-14.6,0xf4d466);box(1.1,.02,.28,x,.23,2.6,0xf4d466);}
 for(const x of [-11.5,11.5])for(const z of [-13,-8,-3,2]){box(.12,1.5,.12,x,4.7,z,0x4de4de);}
 for(const [x,z,color] of [[-7,-11,0x58e5ff],[8,-12,0xdba5ff],[25,4,0x6cddff],[19,26,0x58ffce]])ring(x,z,2,color);
 box(3,1.1,1.7,-7,.7,-1,0xf19a51,true);box(3.3,.14,1.9,-7,1.35,-1,0xffce65);label('DELIVERY JOBS',-7,3,-1,'#ffe0a2',.7);
 for(const [x,z] of [[-9,-2],[-9,0],[-10,-1]]){box(.8,.8,.8,x,.65,z,0xba8151);box(.16,.81,.82,x,.65,z,0xf3cf86);}
 // Path stones lead from the factory to the yard, net stand and rocket.
 for(let z=6;z<=30;z+=2)for(const x of [-3.7,3.7])box(.24,.08,.8,x,.09,z,0xe8d1a2);
 for(let x=8;x<26;x+=2)box(1.6,.06,1.2,x,.05,6,0xb3bba5);
 for(const [x,z] of [[-9,12],[-6,18],[0,20],[6,18],[9,12],[14,20],[-14,20]]){const pad=mesh(new THREE.CylinderGeometry(1.5,1.5,.12,24),0xb9c7b4,x,.03,z);pad.receiveShadow=true;}
 for(const x of [-31,31])for(let z=-18;z<=30;z+=4){box(.18,1.2,.18,x,.6,z,0xdeb27f);box(.15,.12,4,x,.8,z+2,0xeed3aa);}
 for(let i=0;i<24;i++){const side=i%2?-1:1,x=side*(20+(i%4)*3),z=-17+Math.floor(i/4)*8;const crown=mesh(new THREE.IcosahedronGeometry(1.6+(i%3)*.3,0),[0x5c9a79,0x72b18a,0x4b8b73][i%3],x,2.8,z);box(.28,2,.28,x,1,z,0x886646);crown.rotation.y=i;}
 for(let i=0;i<40;i++){const x=(i%2?-1:1)*(13+(i*7%17)),z=8+(i*11%25);mesh(new THREE.IcosahedronGeometry(.18,0),[0xffd66b,0xf395b8,0x9edbff][i%3],x,.35,z);}
 for(const [x,z] of [[-4,8],[4,8],[-4,25],[4,25],[21,7],[28,7]]){box(.15,2.8,.15,x,1.4,z,0x405c68);mesh(new THREE.SphereGeometry(.26,10,8),0xffdf8b,x,2.9,z,true);}
 // Slow steam puffs make the factory feel alive.
 for(const x of [-9,9]){box(1.2,2,1.2,x,5,-15,0x3a5264);for(let i=0;i<3;i++){const puff=mesh(new THREE.IcosahedronGeometry(.7,1),0xffffff,x,7+i,-15);puff.material.transparent=true;puff.material.opacity=.4;animated.push({kind:'steam',m:puff,x,offset:i});}}
 // A sky full of small clouds, beyond the playable campus.
 for(let i=0;i<7;i++){const group=new THREE.Group();group.position.set(-38+i*13,17+i%3*2,-27-i%2*9);for(let j=0;j<3;j++){const cloud=new THREE.Mesh(new THREE.IcosahedronGeometry(2.4-j*.3,1),material(0xfff4e1));cloud.position.set(j*2.3,Math.sin(j)*.8,0);cloud.scale.set(1.6,.7,1);group.add(cloud);}scene.add(group);}
 // Space-lab glass, glowing floor strips, observation planet and stars.
 for(const x of [89,111])box(.12,.08,20,x,.22,0,0x6cf9d9);
 for(let z=-9;z<10;z+=3)box(21,.03,.06,100,.21,z,0x4e7e9c);
 for(const x of [92,108]){ring(x,-6,1.2,0x6bfbd7);const specimen=mesh(new THREE.IcosahedronGeometry(.65,1),x===92?0xc1a0ff:0x81ffc8,x,1.8,-6,true);animated.push({kind:'specimen',m:specimen});}
 const planet=mesh(new THREE.IcosahedronGeometry(5,3),0x327db5,100,9,-29);const land=mesh(new THREE.IcosahedronGeometry(5.04,1),0x6bc9a5,100,9,-29);land.scale.set(.6,1,.97);animated.push({kind:'planet',m:planet},{kind:'planet',m:land});
 const stars=new THREE.BufferGeometry();const starPositions=[];for(let i=0;i<170;i++){const a=i*2.399963,r=22+i%18;starPositions.push(100+Math.cos(a)*r,7+i%23,Math.sin(a)*r);}stars.setAttribute('position',new THREE.Float32BufferAttribute(starPositions,3));scene.add(new THREE.Points(stars,new THREE.PointsMaterial({color:0xc6f5ff,size:.14,sizeAttenuation:true})));
 const crystalPositions=[[-18,7,'earth'],[29,-12,'earth'],[-26,28,'earth'],[10,33,'earth'],[-29,-1,'earth'],[91,7,'lab'],[109,2,'lab'],[105,-8,'lab']];
 const crystals=crystalPositions.map(([x,z,region],id)=>{const m=mesh(new THREE.OctahedronGeometry(.55,0),region==='earth'?0x71ffe1:0xe4a7ff,x,1.1,z,true);const marker=ring(x,z,.8,region==='earth'?0x71ffe1:0xe4a7ff);return {id,x,z,region,m,marker};});
 // Companion's body and eyes follow the player; owned through the upgrade shop.
 const drone=new THREE.Group();scene.add(drone);for(const [geo,color,x,y,z] of [[new THREE.SphereGeometry(.4,12,8),0xffd364,0,0,0],[new THREE.BoxGeometry(.5,.2,.15),0x203b54,0,0,.35],[new THREE.BoxGeometry(.15,.1,.17),0x8bffeb,-.15,0,.44],[new THREE.BoxGeometry(.15,.1,.17),0x8bffeb,.15,0,.44]]){const m=new THREE.Mesh(geo,material(color));m.position.set(x,y,z);drone.add(m);}
 const propeller=new THREE.Mesh(new THREE.BoxGeometry(1.4,.05,.12),material(0x67eddf));propeller.position.y=.5;drone.add(propeller);drone.position.copy(player.position);drone.visible=false;
 function celebrate(position,color,time){for(let i=0;i<12;i++){const m=mesh(new THREE.IcosahedronGeometry(.1,0),color,position.x,position.y+1,position.z,true);bursts.push({m,start:time,velocity:new THREE.Vector3(Math.cos(i*2.4)*2,2+i%3,Math.sin(i*2.4)*2)});}}
 function update(now,dt,state,location){
  for(const c of crystals){c.m.visible=c.marker.visible=!state.crystals.includes(c.id);c.m.rotation.y=now*.001;c.m.position.y=1.1+Math.sin(now*.003+c.id)*.25;}
  for(const a of animated){if(a.kind==='steam'){const t=(now*.00035+a.offset/3)%1;a.m.position.set(a.x+t*.8,6+t*5,-15);a.m.scale.setScalar(.5+t);a.m.material.opacity=(1-t)*.35;}else if(a.kind==='specimen'){a.m.rotation.y=now*.001;a.m.position.y=1.8+Math.sin(now*.003)*.2;}else a.m.rotation.y=now*.00007;}
  drone.visible=!!state.upgrades.drone;if(drone.visible){const desired=player.position.clone().add(new THREE.Vector3(-1.5,2.7+Math.sin(now*.004)*.15,1));if(drone.position.distanceTo(desired)>25)drone.position.copy(desired);else drone.position.lerp(desired,1-Math.exp(-dt*5));drone.rotation.y=now*.0005;propeller.rotation.y=now*.045;}
  for(let i=bursts.length-1;i>=0;i--){const b=bursts[i];if(now-b.start>900){scene.remove(b.m);b.m.geometry.dispose();b.m.material.dispose();bursts.splice(i,1);}else{b.m.position.addScaledVector(b.velocity,dt);b.velocity.y-=dt*5;b.m.scale.multiplyScalar(Math.max(.01,1-dt*1.5));}}
 }
 return {crystals,update,celebrate};
}
