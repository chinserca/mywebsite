import {setupGenetics} from './genetics.js?v=fieldwork';
import {setupGameAudio} from './audio.js';
import {connectWorld} from './multiplayer.js?v=orbital';
import * as THREE from 'three';
import {buildAdventureWorld, LAB_X, EARTH_BOUNDS, surveySites, blueprintRoller, stationRelays, cargoLaunch, cargoDestinations, stationBounds, orbitLimit, stationHangar, recorderSites, recorderTerminal, telescopeSites} from './world.js?v=fieldwork';
import {setupMouseLock} from './mouse-lock.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {materials,newState,validState,act,materialValue,capacity,shopItems,alienTypes,hybridTypes,orders,orderValue,blueprintPrice,blueprintTiers,rollBlueprint,repairRelay,buildShip,loadCargo,deliverCargo} from './state.js?v=filament';
const $=id=>document.getElementById(id),saveKey='the-factory-v1';let state=newState();
try{const saved=JSON.parse(localStorage.getItem(saveKey));if(validState(saved))state={...newState(),...saved,upgrades:{...newState().upgrades,...saved.upgrades},studied:saved.studied??materials.map(()=>false)};}catch{}
const playSound=setupGameAudio({button:$('soundToggle'),music:$('factoryMusic'),help:$('instructions'),pause:$('pauseMenu')});
const scene=new THREE.Scene();scene.background=new THREE.Color(0xa9d7ee);scene.fog=new THREE.Fog(0xa9d7ee,45,110);
const camera=new THREE.PerspectiveCamera(48,innerWidth/innerHeight,.1,180);let renderer;
try{renderer=new THREE.WebGLRenderer({antialias:true});}catch{$('toast').textContent='This game needs WebGL. Try an up-to-date Chrome or Edge browser.';throw Error('WebGL unavailable');}
renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;$('world').append(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xe8f5ff,0x60724d,2.5));const sun=new THREE.DirectionalLight(0xfff5d9,3);sun.position.set(-12,30,15);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-35,right:35,top:35,bottom:-35,far:80});scene.add(sun);
const orbit=new OrbitControls(camera,renderer.domElement);
orbit.mouseButtons.LEFT = null;
orbit.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
orbit.enableDamping=true;orbit.enablePan=false;orbit.minDistance=7;orbit.maxDistance=38;orbit.minPolarAngle=.2;orbit.maxPolarAngle=Math.PI/2-.15;orbit.target.set(0,1,9);camera.position.set(0,18,28);orbit.update();
const colliders=[];
function box(w,h,d,x,y,z,color,solid=false){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:.75}));mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);if(solid)colliders.push({x,z,w,d});return mesh;}
function label(text,x,y,z,color='#ffffff',size=1){const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=160;const ctx=canvas.getContext('2d');ctx.fillStyle='#172c40';ctx.beginPath();ctx.roundRect(0,0,1024,160,22);ctx.fill();ctx.fillStyle=color;ctx.font='bold 65px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,512,83);const map=new THREE.CanvasTexture(canvas);const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map,depthTest:true}));sprite.position.set(x,y,z);sprite.scale.set(6.4*size,1*size,1);scene.add(sprite);return sprite;}
const ground=box(280,.3,260,0,-.2,15,0x7fa36a);
const groundTexture=document.createElement('canvas');
groundTexture.width=groundTexture.height=128;
const groundInk=groundTexture.getContext('2d');
groundInk.fillStyle='#d0d2c7';groundInk.fillRect(0,0,128,128);
for(let i=0;i<1800;i++){
 groundInk.fillStyle=i%3===0?'#a5ad93':'#e2e0d0';
 groundInk.fillRect(i*43%128,(i*i*17+i*31)%128,1+i%3,1+i%2);
}
ground.material.map=new THREE.CanvasTexture(groundTexture);
ground.material.map.colorSpace=THREE.SRGBColorSpace;
ground.material.map.wrapS=ground.material.map.wrapT=THREE.RepeatWrapping;
ground.material.map.repeat.set(45,43);
box(24,.3,20,0,.05,-6,0xc1c9cc);box(8,.08,20,0,.02,15,0xaaa89e);
// Open front entrance; walls keep the player within the factory footprint.
box(24,4,.5,0,2,-16,0x6e8899,true);box(.5,4,20,-12,2,-6,0x6e8899,true);box(.5,4,20,12,2,-6,0x6e8899,true);box(7,3.5,.5,-8.5,1.75,4,0x6e8899,true);box(7,3.5,.5,8.5,1.75,4,0x6e8899,true);
for(const x of [-11.7,11.7])for(const z of [-15,3])box(.8,6,.8,x,3,z,0x344f63);
label('THE FACTORY',0,6,-15,'#ffce55',1.5);label('MATERIAL YARD',0,3,23,'#88e7fb');
const claim=box(4,.16,3,0,.3,1,0xffd32e);const claimLabel=label('CLAIM FACTORY',0,1.4,1,'#ffe47b',.65);
const purchase=box(3,.16,3,-6,.3,-4,0x74ef8b);const purchaseLabel=label('CONVEYOR · $500',-6,1.3,-4,'#a9ffb5',.65);
const conveyor=new THREE.Group();scene.add(conveyor);function machineBox(w,h,d,x,y,z,color){const m=box(w,h,d,x,y,z,color,true);conveyor.attach(m);return m;}
machineBox(3,.4,9,3,1,-7,0x273c50);machineBox(.2,.5,9,1.4,1.2,-7,0xe0b552);machineBox(.2,.5,9,4.6,1.2,-7,0xe0b552);
for(const x of [2,4])for(const z of [-10,-4])machineBox(.25,1,.25,x,.5,z,0x60707e);
const rollers=[];for(let z=-10.8;z<-2.6;z+=.6){const m=box(2.6,.1,.13,3,1.25,z,0x748597);conveyor.attach(m);rollers.push(m);}
const funnel=new THREE.Mesh(new THREE.CylinderGeometry(1.1,.3,1.4,4,1,true),new THREE.MeshStandardMaterial({color:0xf3a743,side:THREE.DoubleSide}));funnel.position.set(0,1.7,-3);funnel.rotation.y=Math.PI/4;scene.add(funnel);conveyor.attach(funnel);colliders.push({x:0,z:-3,w:1.8,d:1.8});const funnelLabel=label('MATERIAL FUNNEL',0,3,-3,'#ffd383',.65);conveyor.attach(funnelLabel);
const filamentMachine=new THREE.Group();
scene.add(filamentMachine);
filamentMachine.attach(box(1.5,1.4,1.3,-3.5,.9,-4.9,0x376d88));
filamentMachine.attach(box(.95,.48,.1,-3.5,1.14,-4.23,0x8debd4));
filamentMachine.attach(label('FILAMENT MACHINE',-3.5,2.75,-4.9,'#a4f9e3',.66));
const feedStart=new THREE.Vector3(-3.5,1.65,-4.9);
const feedEnd=new THREE.Vector3(0,2.4,-3);
const pipe=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,feedStart.distanceTo(feedEnd),16),
 new THREE.MeshStandardMaterial({color:0x67a5ba}));
pipe.position.copy(feedStart).lerp(feedEnd,.5);
pipe.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),feedEnd.clone().sub(feedStart).normalize());
filamentMachine.add(pipe);
let filamentElapsed=0;
const filamentCycle=12;
const depositPad=box(2,.12,1,0,.29,-1.1,0x4cc9dc);conveyor.attach(depositPad);
box(3,1.1,1.6,-7,.65,-11,0x347fba,true);box(1.2,.9,.15,-7,1.7,-11.4,0x24445e);box(.9,.6,.17,-7,1.7,-11.3,0x72e4fd);label('RESEARCH · +50% VALUE',-7,3,-11,'#87e9ff',.75);
box(2.8,1.2,1.5,8,.7,-12,0x8356b7,true);box(2.5,.2,1.7,8,1.4,-12,0xffcf59);label('UPGRADE SHOP',8,3,-12,'#e2b4ff',.7);
label('FINISHED GOODS',3,2.5,-12,'#a9ffb5',.55);const spools=[];const positions=[[-9,12],[-6,18],[0,20],[6,18],[9,12],[14,20],[-14,20]];
materials.forEach((type,i)=>{const [x,z]=positions[i];const group=new THREE.Group();group.position.set(x,.8,z);scene.add(group);for(const offset of [-.42,.42]){const disk=new THREE.Mesh(new THREE.CylinderGeometry(.65,.65,.13,40),new THREE.MeshStandardMaterial({color:0x27394d}));disk.position.y=offset;group.add(disk);}const core=new THREE.Mesh(new THREE.CylinderGeometry(.5,.5,.8,40),new THREE.MeshStandardMaterial({color:type.color}));group.add(core);label(type.name,x,2,z,'#ffffff',.5);spools.push({group,x,z,available:true,next:0});});
for(const [x,z] of [[-22,-10],[23,-8],[-25,20],[26,24],[-18,31],[20,33]]){box(.8,3,.8,x,1.5,z,0x765b3f,true);const tree=new THREE.Mesh(new THREE.ConeGeometry(3,6,20),new THREE.MeshStandardMaterial({color:0x397458}));tree.position.set(x,5,z);scene.add(tree);}
// Rocket launch site and a separate walkable orbital laboratory.
box(7,.25,7,25,.1,4,0x384b66);
const rocketPurchaseLabel=label('ROCKET · $1,000',25,7,4,'#aeefff',.9);
const rocketLaunchLabel=label('ROCKET · STEP ON TO LAUNCH',25,7,4,'#aeefff',.9);
const rocket=new THREE.Group();rocket.position.set(25,0,4);scene.add(rocket);
function rocketPart(geometry,color,y){const m=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color,metalness:.4,roughness:.4}));m.position.y=y;m.castShadow=true;rocket.add(m);return m;}
rocketPart(new THREE.CylinderGeometry(1,1,4,48),0xe8f1fa,3);rocketPart(new THREE.ConeGeometry(1,2,48),0xff735d,6);rocketPart(new THREE.CylinderGeometry(1.3,1.3,.35,48),0x4188cc,1);const flame=rocketPart(new THREE.ConeGeometry(.65,2,32),0xffb13d,-.1);flame.rotation.z=Math.PI;flame.visible=false;
for(const x of [-1,1]){const fin=rocketPart(new THREE.BoxGeometry(.25,1.8,1.8),0x4188cc,1.5);fin.position.x=x;}
const netStand=box(2,.2,2,19,.15,26,0x43b1bd);const netSign=label('FREE ALIEN NET',19,2,26,'#9fffee',.65);
const aliens=[];alienTypes.forEach((type,i)=>{const group=new THREE.Group();const x=[-18,4,18][i],z=[28,29,17][i];group.position.set(x,.8,z);scene.add(group);const body=new THREE.Mesh(new THREE.SphereGeometry(.6,32,24),new THREE.MeshStandardMaterial({color:type.color}));body.scale.y=1.2;group.add(body);for(const eyeX of [-.22,.22]){const eye=new THREE.Mesh(new THREE.SphereGeometry(.16,24,16),new THREE.MeshStandardMaterial({color:0x182738}));eye.position.set(eyeX,.2,.5);group.add(eye);}const sign=label(type.name,x,2.3,z,'#d5ffde',.5);aliens.push({group,body,sign,x,z,homeX:x,homeZ:z,available:true,next:0,windup:0,attackReady:0,stunnedUntil:0});});
box(44,.3,34,LAB_X,0,1,0x9caec5);
const modelCenterZ=-38;
const advancedTable={x:LAB_X-17.93,z:modelCenterZ-15.62};
const fusionTable={x:LAB_X-17.83,z:modelCenterZ-5.71};
const displayEntrance={x:LAB_X,z:modelCenterZ+8};
label('ADVANCED STUDY',advancedTable.x,4.1,advancedTable.z,'#c2f3ff',.8);
label('CELL FUSION',fusionTable.x,4.1,fusionTable.z,'#dfb7ff',.75);
label('ALIEN DISPLAY',displayEntrance.x,3.7,displayEntrance.z,'#afffe7',.85);
const displayModels=[...alienTypes,...hybridTypes].map((type,index)=>{
 const specimen=new THREE.Group();
 specimen.position.set(LAB_X+(index%3-1)*2.7,1.8+Math.floor(index/3)*2.3,modelCenterZ+4.1);
 const body=new THREE.Mesh(new THREE.SphereGeometry(.7,24,16),new THREE.MeshStandardMaterial({
  color:type.color,emissive:type.color,emissiveIntensity:.2
 }));
 body.scale.y=1.2;
 specimen.add(body);
 for(const x of [-.24,.24]){
  const eye=new THREE.Mesh(new THREE.SphereGeometry(.15,12,8),new THREE.MeshBasicMaterial({color:0x17233d}));
  eye.position.set(x,.22,.64);
  specimen.add(eye);
 }
 scene.add(specimen);
 return specimen;
});
const annexDeck=box(44,.3,44,LAB_X,-.02,modelCenterZ,0x9caec5);
for(const x of [LAB_X-22,LAB_X+22])box(.5,2,78,x,1,-21,0x35435f,true);
box(44,2,.5,LAB_X,1,stationBounds.minZ,0x35435f,true);
label('STATION CORE',LAB_X,3,-22,'#c2f3ff',.8);
for(const x of [LAB_X-10,LAB_X+10])box(.14,.05,41,x,.18,modelCenterZ,0x78dcff);
new GLTFLoader().load('./3d%20files/spaistaison.glb',({scene:model})=>{
 // The Fusion export is already Y-up. Undo the exporter’s Z-up conversion.
 model.rotation.x=Math.PI/2;
 model.scale.setScalar(.44);
 model.position.set(LAB_X,-.29,modelCenterZ);
 model.traverse(part=>{
  if(!part.isMesh)return;
  const deck=part.name==='deck'||part.parent?.name==='deck';
  part.material=new THREE.MeshStandardMaterial({
   color:deck?0x93a7bc:0x58788c,roughness:.75,metalness:.1
  });
  const tower=part.name==='tower'||part.parent?.name==='tower';
  if(tower){
   part.material.color.setHex(0x8edcdd);
   part.material.transparent=true;
   part.material.opacity=.25;
   part.material.depthWrite=false;
  }
  part.castShadow=!deck&&!tower;
  part.receiveShadow=deck;
 });
 scene.add(model);
 annexDeck.visible=false;
 colliders.push({x:LAB_X,z:modelCenterZ,radius:16*.44});
 colliders.push(
  {x:LAB_X-40.75*.44,z:modelCenterZ-35.5*.44,w:12.5*.44,d:25*.44},
  {x:LAB_X-40.5267*.44,z:modelCenterZ-12.9713*.44,w:12.5*.44,d:12.5*.44}
 );
},undefined,error=>console.warn('Station model could not load:',error));
label('INTERNATIONAL ALIEN LAB',LAB_X,5,-16,'#8fffe6',1.3);box(4,1.2,2,LAB_X,.8,-5,0x3d8192,true);box(3,.12,1.8,LAB_X,1.5,-5,0x82e6ed);label('STUDY ALIENS',LAB_X,3.2,-5,'#afffe7',.75);box(4,.15,3,LAB_X,.3,8,0x73b3ff);label('RETURN TO FACTORY',LAB_X,1.5,8,'#cce5ff',.65);
for(const x of [LAB_X-8,LAB_X+8]){const tank=new THREE.Mesh(new THREE.CylinderGeometry(1,1,3,48),new THREE.MeshStandardMaterial({color:0x74edc2,transparent:true,opacity:.45}));tank.position.set(x,1.8,-6);scene.add(tank);}
let location='earth',netEquipped=false,guide='Materials',flight=null,cargoFlying=false;
const player=new THREE.Group();player.position.set(0,0,9);scene.add(player);
function body(w,h,d,x,y,z,color){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color}));m.position.set(x,y,z);m.castShadow=true;player.add(m);return m;}
body(.8,.9,.45,0,1.3,0,0x3485e4);body(.6,.6,.6,0,2.07,0,0xffd49b);body(.75,.14,.7,0,2.45,0,0xffcf42);const legs=[body(.3,.8,.35,-.22,.45,0,0x263951),body(.3,.8,.35,.22,.45,0,0x263951)];body(.25,.8,.3,-.56,1.25,0,0xffd49b);body(.25,.8,.3,.56,1.25,0,0xffd49b);
const handNet=new THREE.Group();handNet.position.set(.8,1.3,.4);player.add(handNet);const handle=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,1.5,8),new THREE.MeshStandardMaterial({color:0xd5b479}));handle.position.y=.4;handNet.add(handle);const ring=new THREE.Mesh(new THREE.TorusGeometry(.6,.045,12,48),new THREE.MeshStandardMaterial({color:0x63dcff}));ring.position.y=1.6;handNet.add(ring);const meshNet=new THREE.Mesh(new THREE.SphereGeometry(.58,12,8,0,Math.PI*2,0,Math.PI/2),new THREE.MeshBasicMaterial({color:0xdcfaff,wireframe:true}));meshNet.rotation.x=Math.PI/2;meshNet.position.set(0,1.6,-.15);handNet.add(meshNet);handNet.visible=false;
const cargoShip=new THREE.Group();
const hull=new THREE.Mesh(new THREE.ConeGeometry(1.25,4.8,32),new THREE.MeshStandardMaterial({color:0x7acaff,metalness:.45,roughness:.35}));
hull.rotation.x=Math.PI/2;
cargoShip.add(hull);
for(const x of [-1.4,1.4]){
 const engine=new THREE.Mesh(new THREE.BoxGeometry(.9,.65,2.7),new THREE.MeshStandardMaterial({color:0x243c58}));
 engine.position.set(x,-.2,-.65);
 cargoShip.add(engine);
}
cargoShip.visible=false;
scene.add(cargoShip);
const arrow=new THREE.ArrowHelper(new THREE.Vector3(0,0,-1),new THREE.Vector3(),3,0x188fff,.9,.65);scene.add(arrow);
const adventure=buildAdventureWorld({THREE,scene,box,label,player});
const medStation = {x:-3,z:1};
box(2,.15,2,medStation.x,.3,medStation.z,0x2dc78b);
label('FREE MED STATION',medStation.x,2,medStation.z,'#a8ffcc',.65);
let health = 100;
let protectedUntil = 0;
let pulseReady = 0;
function setControlText(id,text){
 const control=$(id);
 if(control.textContent!==text)control.textContent=text;
}
function setHealth(value){
 if(value<health)playSound('hit');
 health = value;
 $('health').value = value;
 $('healthValue').textContent = value+' / 100';
}
function stunPulse(){
 if(modalOpen()||cargoFlying||location!=='earth'||gameNow<pulseReady)return;
 pulseReady=gameNow+7000;
 playSound('stun');
 let hits=0;
 for(const alien of aliens){
  if(!alien.available||Math.hypot(alien.x-player.position.x,alien.z-player.position.z)>6)continue;
  alien.stunnedUntil=gameNow+2600;
  alien.windup=0;
  hits++;
 }
 adventure.celebrate(player.position,0x71d9ff,gameNow);
 notify(hits?'Stunned '+hits+' nearby '+(hits===1?'alien':'aliens')+'!':'No aliens within range.');
}
$('pulse').onclick=stunPulse;
function updateAliens(now,dt){
 const position=player.position;
 for(const [i,alien] of aliens.entries()){
  if(!alien.available&&now>=alien.next){
   alien.available=true;
   alien.x=alien.homeX;
   alien.z=alien.homeZ;
   alien.windup=alien.stunnedUntil=0;
  }
  alien.group.visible=alien.sign.visible=alien.available;
  if(!alien.available)continue;
  const stunned=now<alien.stunnedUntil;
  const distance=Math.hypot(position.x-alien.x,position.z-alien.z);
  const chasing=state.conveyor&&location==='earth'&&position.z>=8&&distance<9
   &&Math.hypot(position.x-alien.homeX,position.z-alien.homeZ)<12;
  if(!modalOpen()&&!stunned){
   const targetX=chasing?position.x:alien.homeX;
   const targetZ=chasing?position.z:alien.homeZ;
   const range=Math.hypot(targetX-alien.x,targetZ-alien.z);
   if(range>(chasing?1.4:.1)){
    const step=Math.min(range,dt*(chasing?2.8+i*.35:2));
    const x=alien.x+(targetX-alien.x)*step/range;
    const z=Math.max(8,alien.z+(targetZ-alien.z)*step/range);
    if(canMove(x,z)){alien.x=x;alien.z=z;}
    alien.group.rotation.y=Math.atan2(targetX-alien.x,targetZ-alien.z);
   }
   if(chasing&&distance<1.9){
    if(!alien.windup&&now>=alien.attackReady)alien.windup=now+550;
    if(alien.windup&&now>=alien.windup){
     alien.windup=0;
     alien.attackReady=now+1600;
     if(now>=protectedUntil){
      const damage=state.upgrades.shield?9:18;
      setHealth(Math.max(0,health-damage));
      protectedUntil=now+1000;
      notify(alienTypes[i].name+' hit you for '+damage+' damage!');
      if(!health){
       position.set(0,0,6);
       keys.clear();
       setHealth(100);
       protectedUntil=now+2500;
       notify('You recovered at the factory entrance. Your progress is safe.');
      }
     }
    }
   }else alien.windup=0;
  }
  alien.body.material.emissive.setHex(stunned?0x186a8c:alien.windup?0x9a2121:0);
  alien.group.position.set(alien.x,.85+Math.sin(now*.003+i)*.2,alien.z);
  alien.sign.position.set(alien.x,2.3,alien.z);
 }
 const remaining=Math.max(0,Math.ceil((pulseReady-now)/1000));
 $('pulse').disabled=remaining>0||location!=='earth';
 setControlText('pulse',remaining?'Stun pulse · '+remaining+'s':'Stun pulse · Q');
}
const keys=new Set();let nearby=null,last=performance.now(),gameNow=last,notice=0,processed=[],sprintUntil=0,sprintReady=0;
function notify(message){$('toast').textContent=message;$('toast').style.opacity=1;notice=gameNow+6500;}
function persist(){try{localStorage.setItem(saveKey,JSON.stringify(state));}catch{notify('Progress cannot be saved in this browser. Keep this tab open to continue.');}}
function atFactory(){
 const {x,z}=player.position;
 return location==='earth'&&Math.abs(x)<12&&z>=-16&&z<=6;
}
const openGenetics=setupGenetics({
 dialog:$('geneticsDialog'),state,
 save:cue=>{playSound(cue);updateHUD();persist();}
});
function updateHUD(){
 filamentMachine.visible=!!state.upgrades.filamentMachine;
 const counts=[...state.aliens,...state.hybrids];
 displayModels.forEach((model,index)=>model.visible=counts[index]>0);
 rocketPurchaseLabel.visible=!state.rocket;
 rocketLaunchLabel.visible=state.rocket;
 $('career').textContent=state.deliveries+' deliveries · '+state.crystals.length+'/8 crystals · '+state.surveys.length+'/'+surveySites.length+' outposts'+(state.salvage?' · Salvage crate':'');
 $('location').textContent=cargoFlying?'Orbital cargo route':location==='earth'?'The Factory · Earth':'International Alien Lab';$('netToggle').hidden=!state.net;$('netToggle').textContent=netEquipped?'Put net away':'Equip net';handNet.visible=netEquipped;netStand.visible=!state.net;netSign.visible=!state.net;$('alienCount').textContent=state.aliens.reduce((a,b)=>a+b,0)+' / 6';$('alienInventory').replaceChildren();alienTypes.forEach((a,i)=>{const row=document.createElement('div');row.textContent=a.name+' × '+state.aliens[i]+' · Studied '+state.alienStudies[i];$('alienInventory').append(row);});
 $('money').textContent=state.money.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0});const total=state.bag.reduce((a,b)=>a+b,0);$('bag').textContent='Backpack · '+total+' / '+capacity(state);$('materials').replaceChildren();materials.forEach((m,i)=>{const row=document.createElement('div');row.textContent=m.name+' × '+state.bag[i]+' · $'+materialValue(state,i)+(state.studied[i]?' ★':'');$('materials').append(row);});claim.visible=!state.claimed;claimLabel.visible=!state.claimed;purchase.visible=state.claimed&&!state.conveyor;purchaseLabel.visible=purchase.visible;conveyor.visible=state.conveyor;$('objective').textContent=guide==='Expedition'&&state.conveyor?(state.surveys.length===surveySites.length?(state.salvage?'Deliver salvage at the dispatch desk':'Pick up a salvage crate'):'Survey outposts · '+state.surveys.length+'/'+surveySites.length):guide==='Crystals'?(state.crystals.length===adventure.crystals.length?'All energy crystals found':'Find energy crystals · '+state.crystals.length+'/8'):guide==='Deliveries'&&state.conveyor?'Ship materials at the dispatch desk':location==='lab'?(state.aliens.some(n=>n)?'Study your captured aliens':state.relays.length<stationRelays.length?'Restore station relays · '+state.relays.length+'/'+stationRelays.length:'Visit the Ship Blueprint Roller'):guide==='Aliens'&&state.conveyor?(!state.net?'Collect the alien net':state.aliens.some(n=>n)?state.rocket?'Ride rocket to alien lab':'Save $1,000 for the rocket':'Equip net and catch aliens'):!state.claimed?'Claim your factory':!state.conveyor?'Buy a conveyor · $500':total?'Put materials in the funnel':'Collect materials outside';
 if(guide==='Flight Recorders')$('objective').textContent=state.recordersSubmitted?'Flight data analyzed':state.recorders.length===3?'Bring the recorders to the station':'Recover flight recorders · '+state.recorders.length+'/3';
 if(guide==='Sky Survey')$('objective').textContent=state.skySurvey.length===3?'Sky survey complete':'Visit telescope pads · '+state.skySurvey.length+'/3';
 if(cargoFlying)$('objective').textContent='Deliver cargo to '+cargoDestinations[state.cargoRun.order].name;
 else if(state.cargoRun&&location==='earth')$('objective').textContent='Resume cargo flight at dispatch';
}
function target(){
 if(!cargoFlying&&state.cargoRun&&location==='earth')return {x:-7,z:-1};
 if(cargoFlying)return cargoDestinations[state.cargoRun.order];
 if(guide==='Flight Recorders'&&!state.recordersSubmitted){
  if(state.recorders.length===3)return location==='lab'?recorderTerminal:{x:25,z:4};
  return location==='lab'?{x:LAB_X,z:8}:recorderSites.find((_,index)=>!state.recorders.includes(index));
 }
 if(guide==='Sky Survey'){
  if(state.skySurvey.length===3)return null;
  return location==='lab'?telescopeSites.find((_,index)=>!state.skySurvey.includes(index)):{x:25,z:4};
 }
 if(guide==='Expedition'&&state.conveyor){
  if(location==='lab')return {x:LAB_X,z:8};
  return surveySites.find((_,i)=>!state.surveys.includes(i))??(state.salvage?{x:-7,z:-1}:{x:103,z:64});
 }
if(guide==='Crystals'){if(state.crystals.length===adventure.crystals.length)return null;const candidates=adventure.crystals.filter(c=>!state.crystals.includes(c.id)&&c.region===location);return candidates.sort((a,b)=>Math.hypot(a.x-player.position.x,a.z-player.position.z)-Math.hypot(b.x-player.position.x,b.z-player.position.z))[0]??(location==='lab'?{x:LAB_X,z:8}:{x:25,z:4});}if(guide==='Deliveries'&&state.conveyor)return location==='lab'?{x:LAB_X,z:8}:{x:-7,z:-1};if(location==='lab')return state.aliens.some(n=>n)?{x:LAB_X,z:-3}:stationRelays.find((_,index)=>!state.relays.includes(index))??blueprintRoller;if(guide==='Aliens'&&state.conveyor){if(!state.net)return {x:19,z:26};if(state.aliens.some(n=>n))return {x:25,z:4};return aliens.filter(a=>a.available).sort((a,b)=>Math.hypot(a.x-player.position.x,a.z-player.position.z)-Math.hypot(b.x-player.position.x,b.z-player.position.z))[0];}if(!state.claimed)return {x:0,z:1};if(!state.conveyor)return {x:-6,z:-4};if(state.bag.some(n=>n))return {x:0,z:-1};return spools.filter(s=>s.available).sort((a,b)=>Math.hypot(a.x-player.position.x,a.z-player.position.z)-Math.hypot(b.x-player.position.x,b.z-player.position.z))[0];}
function interact(nearbyAction=nearby){const nearby=nearbyAction;if(!nearby||modalOpen())return;if(['advancedStudy','cellFusion','alienDisplay'].includes(nearby.action)){
 keys.clear();
 openGenetics(nearby.action);
 return;
}if(nearby.action==='cargoLanding'){
 const destination=cargoDestinations[state.cargoRun.order];
 const payout=deliverCargo(state);
 playSound('reward');
 endCargoFlight();
 movePlayerTo(stationHangar.x,stationHangar.z);
 updateHUD();
 persist();
 notify('Cargo delivered to '+destination.name+'! +$'+payout.toLocaleString());
 return;
}if(nearby.action==='repairRelay'){
 const message=repairRelay(state,nearby.index);
 if(message){playSound('reward');updateHUD();persist();notify(message);adventure.celebrate(player.position,0x6bfbd7,gameNow);}
 return;
}if(nearby.action==='blueprint'){
 keys.clear();
 $('blueprintResult').textContent='';
 renderBlueprints();
 $('blueprintDialog').showModal();
 return;
}if(nearby.action==='heal'){setHealth(100);notify('Health restored.');return;}if(nearby.action==='dispatch'){if(state.salvage){playSound('reward');notify(act(state,'returnSalvage'));updateHUD();persist();}keys.clear();renderOrders();$('dispatch').showModal();return;}if(nearby.action==='fly'){startFlight('lab');return;}if(nearby.action==='return'){startFlight('earth');return;}if(nearby.action==='alienLab'){keys.clear();renderAlienResearch();$('alienResearch').showModal();return;}if(nearby.action==='shop'){keys.clear();renderShop();$('shop').showModal();return;}if(nearby.action==='research'){keys.clear();renderResearch();$('research').showModal();return;}if(nearby.action==='mine'&&gameNow<miningReady){
 notify('The mine is recharging. Return in '+Math.ceil((miningReady-gameNow)/1000)+'s.');
 return;
}
const result=act(state,nearby.action,nearby.index);
if(result&&nearby.action==='mine')miningReady=gameNow+12000;
if(!result){notify(nearby.action==='buy'?'The conveyor costs $500.':nearby.action==='rocket'?'The rocket costs $1,000. Keep earning money at your factory.':nearby.action==='catch'?'Alien carrier full! Take your aliens to the lab.':'Your backpack is full. Return to the funnel.');return;}if(nearby.action==='net')netEquipped=true;if(nearby.action==='catch'){const alien=aliens[nearby.index];alien.available=false;alien.group.visible=false;alien.next=gameNow+20000;}if(nearby.action==='collect'){const spool=spools[nearby.index];spool.available=false;spool.group.visible=false;spool.next=gameNow+8000;}
 const cue={collect:'pickup',catch:'pickup',mine:'pickup',net:'pickup',salvage:'pickup',survey:'reward',recoverRecorder:'pickup',submitRecorders:'reward',observeSky:'reward',deposit:'reward',buy:'purchase',claim:'purchase',rocket:'purchase'}[nearby.action];
 if(cue)playSound(cue);
 if(typeof result==='object'){
  processFilament(result);
  notify('Materials processed! Earned $'+result.payout+'.');
 }else notify(result);
 updateHUD();
 persist();
}
function processFilament({cargo,payout}){
 // Save the payout as the filament enters the conveyor.
 state.money+=payout;
 let queued=0;
 cargo.forEach((amount,index)=>{
  for(let i=0;i<amount;i++){
   const cube=box(.45,.45,.45,3,1.6,-3,materials[index].color);
   cube.visible=false;
   processed.push({cube,start:gameNow+queued++*350});
  }
 });
}
let miningReady=0;
const stepPads = [
 ...recorderSites.map((site,index)=>({
  region:'earth',...site,w:3,d:3,index,
  action:()=>state.conveyor&&!state.recorders.includes(index)?'recoverRecorder':null
 })),
 ...telescopeSites.map((site,index)=>({
  region:'lab',...site,w:3,d:3,index,
  action:()=>!state.skySurvey.includes(index)?'observeSky':null
 })),
 {region:'lab',...recorderTerminal,w:3,d:3,action:()=>state.recorders.length===3&&!state.recordersSubmitted?'submitRecorders':null},
 ...stationRelays.map((relay,index)=>({
  region:'lab',...relay,w:2.3,d:2.3,index,
  action:()=>!state.relays.includes(index)?'repairRelay':null
 })),
 {region:'earth',x:103,z:64,w:4,d:4,action:()=>state.conveyor&&!state.salvage?'salvage':null},
 ...surveySites.map((site,index)=>({
  region:'earth',...site,w:4,d:4,index,
  action:()=>state.conveyor&&!state.surveys.includes(index)?'survey':null
 })),
 {region:'earth',x:69,z:-30,w:4,d:4,action:()=>state.conveyor?'mine':null},
 {region:'earth',x:0,z:1,w:4,d:3,action:()=>!state.claimed?'claim':null},
 {region:'earth',x:-6,z:-4,w:3,d:3,action:()=>state.claimed&&!state.conveyor?'buy':null},
 {region:'earth',x:0,z:-1.1,w:2,d:1,action:()=>state.conveyor&&state.bag.some(Boolean)?'deposit':null},
 {region:'earth',...medStation,w:2,d:2,action:()=>health<100?'heal':null},
 {region:'earth',x:19,z:26,w:2,d:2,action:()=>state.conveyor&&!state.net?'net':null},
 {region:'earth',x:25,z:4,w:7,d:7,action:()=>state.conveyor?(state.rocket?'fly':'rocket'):null},
 {region:'lab',x:LAB_X,z:8,w:4,d:3,action:()=>state.rocket?'return':null},
 ...spools.map((spool,index)=>({
  region:'earth',x:spool.x,z:spool.z,radius:1.5,index,
  action:()=>state.conveyor&&spool.available?'collect':null
 }))
];
let standingPad = null;
function activateStepPad(position){
 if(modalOpen())return;
 const pad=stepPads.find(p=>{
  if(p.region!==location)return false;
  const dx=position.x-p.x,dz=position.z-p.z;
  if(p.radius)return dx*dx+dz*dz<=p.radius*p.radius;
  return Math.abs(dx)<=p.w/2&&Math.abs(dz)<=p.d/2;
 })??null;
 if(pad===standingPad)return;
 standingPad=pad;
 const action=pad?.action();
 if(action)interact({action,index:pad.index});
}
function modalOpen(){return $('instructions').open||$('research').open||$('shop').open||$('alienResearch').open||$('pauseMenu').open||$('dispatch').open||$('robuxExtras').open||$('blueprintDialog').open||$('cheatsDialog').open||$('geneticsDialog').open||!!flight;}
function startFlight(destination){if(!state.rocket||flight)return;playSound('launch');keys.clear();flight={destination,start:gameNow};orbit.enabled=false;$('flight').hidden=false;$('flightDestination').textContent=destination==='lab'?'International Alien Lab':'The Factory · Earth';$('flightText').textContent=destination==='lab'?'Launching to the International Alien Lab…':'Returning to The Factory…';flame.visible=location==='earth';}
function arrive(destination,atHome=false){
 if(cargoFlying)endCargoFlight();
 location=destination;
 keys.clear();
 standingPad=null;
 const pos=new THREE.Vector3(atHome?0:destination==='lab'?LAB_X:25,0,atHome?6:destination==='lab'?4:9);const delta=pos.clone().sub(player.position);player.position.copy(pos);camera.position.add(delta);orbit.target.add(delta);scene.background.set(destination==='lab'?0x10182e:0xa9d7ee);scene.fog.color.copy(scene.background);sun.position.set(destination==='lab'?LAB_X-12:-12,30,15);sun.target.position.set(destination==='lab'?LAB_X:0,0,0);scene.add(sun.target);rocket.position.y=0;flame.visible=false;orbit.enabled=true;flight=null;$('flight').hidden=true;updateHUD();notify(atHome?'Teleported to your factory.':destination==='lab'?'Welcome to the International Alien Lab! Bring your aliens to the study bench.':'Back on Earth. Catch more aliens in the material yard.');}
$('teleportHome').onclick=()=>{
 if(!modalOpen()&&(cargoFlying||!atFactory())){playSound('teleport');arrive('earth',true);}
};
$('cargoToggle').onclick=()=>{if(innerWidth<=720)document.body.classList.toggle('cargo-open');else document.body.classList.toggle('cargo-hidden');};
$('netToggle').onclick=()=>{if(modalOpen())return;netEquipped=!netEquipped;updateHUD();notify(netEquipped?'Net equipped. Approach an alien and press E or tap Catch.':'Net put away.');};
$('mission').onclick=()=>{const modes=['Materials','Aliens','Deliveries','Crystals','Expedition','Flight Recorders','Sky Survey'];guide=modes[(modes.indexOf(guide)+1)%modes.length];$('mission').textContent='Guide: '+guide;updateHUD();};
function renderAlienResearch(){$('alienResearchOptions').replaceChildren();alienTypes.forEach((a,i)=>{const row=document.createElement('div');row.className='research-row';const text=document.createElement('span');text.textContent=a.name+' · Captured '+state.aliens[i]+' · Studied '+state.alienStudies[i];const button=document.createElement('button');button.textContent='Study & release · +$1,000';button.disabled=!state.aliens[i];button.onclick=()=>{if(location!=='lab'||Math.hypot(player.position.x-LAB_X,player.position.z+5)>3.2)return;const result=act(state,'alienStudy',i);if(result){updateHUD();persist();renderAlienResearch();$('alienResearchStatus').textContent=result;}};row.append(text,button);$('alienResearchOptions').append(row);});}
$('closeAlienResearch').onclick=()=>$('alienResearch').close();$('alienResearch').addEventListener('close',()=>{$('alienResearchStatus').textContent='';});
function sprint(){if(modalOpen()||gameNow<sprintReady)return;sprintUntil=gameNow+1500;sprintReady=gameNow+6000;notify('Sprint boost!');}
$('sprint').onclick=sprint;
function movePlayerTo(x,z){
 const destination=new THREE.Vector3(x,0,z);
 const delta=destination.clone().sub(player.position);
 player.position.copy(destination);
 camera.position.add(delta);
 orbit.target.add(delta);
}
function endCargoFlight(){
 cargoFlying=false;
 player.visible=true;
 cargoShip.visible=false;
 keys.clear();
}
function launchCargoFlight(){
 playSound('launch');
 $('dispatch').close();
 arrive('lab');
 keys.clear();
 standingPad=null;
 movePlayerTo(cargoLaunch.x,cargoLaunch.z);
 cargoFlying=true;
 player.visible=false;
 cargoShip.visible=true;
 cargoShip.position.set(player.position.x,5,player.position.z);
 updateHUD();
 notify('Fly to '+cargoDestinations[state.cargoRun.order].name+' and land to deliver the cargo.');
}
function renderOrders(){
 $('dispatchOptions').replaceChildren();orders.forEach((order,i)=>{const card=document.createElement('article');card.className='order-card';const title=document.createElement('h3');title.textContent=order.name;const details=document.createElement('p');details.textContent=order.needs.map((n,k)=>n?materials[k].name+' '+state.bag[k]+'/'+n:null).filter(Boolean).join(' · ');const button=document.createElement('button');button.textContent='Ship order · $'+orderValue(state,i);button.disabled=!order.needs.every((n,k)=>state.bag[k]>=n);button.onclick=()=>{if(location!=='earth'||Math.hypot(player.position.x+7,player.position.z+1)>3)return;const result=act(state,'deliver',i);if(result){playSound('reward');notify(result);updateHUD();persist();renderOrders();$('dispatchStatus').textContent=result;adventure.celebrate(player.position,0xffd661,gameNow);}};card.append(title,details,button);
 const ship=state.ships.lastIndexOf(true);
 if(ship!==-1&&!state.cargoRun){
  const manual=document.createElement('button');
  manual.textContent='Fly to '+cargoDestinations[i].name+' · $'+orderValue(state,i,ship).toLocaleString();
  manual.disabled=button.disabled;
  manual.onclick=()=>{
   if(!loadCargo(state,i,ship))return;
   persist();
   launchCargoFlight();
  };
  card.append(manual);
 }
 $('dispatchOptions').append(card);});
 if(state.cargoRun){
  const resume=document.createElement('button');
  resume.textContent='Resume cargo flight to '+cargoDestinations[state.cargoRun.order].name;
  resume.onclick=launchCargoFlight;
  $('dispatchOptions').prepend(resume);
 }
}
$('closeDispatch').onclick=()=>$('dispatch').close();$('dispatch').addEventListener('close',()=>{$('dispatchStatus').textContent='';});
$('robuxExtrasButton').onclick=()=>{if(flight)return;keys.clear();$('robuxExtras').showModal();};$('closeRobuxExtras').onclick=()=>$('robuxExtras').close();
function renderShop(){
 $('shopOptions').replaceChildren();$('shopBalance').textContent='Your money: $'+state.money.toLocaleString();
 shopItems.forEach(item=>{const row=document.createElement('div');row.className='research-row';const info=document.createElement('span');const name=document.createElement('strong');name.textContent=item.name;const detail=document.createElement('p');detail.textContent=item.description;info.append(name,detail);const button=document.createElement('button');const owned=state.upgrades[item.id],locked=!state.conveyor;button.textContent=owned?'Owned ✓':locked?'Buy conveyor first':state.money<item.price?'Need $'+item.price:'Buy · $'+item.price;button.disabled=owned||locked||state.money<item.price;button.onclick=()=>{if(Math.hypot(player.position.x-8,player.position.z+12)>3)return;const result=act(state,'upgrade',item.id);if(result){updateHUD();persist();renderShop();$('shopStatus').textContent=result;notify(result);}};row.append(info,button);$('shopOptions').append(row);});
}
$('closeShop').onclick=()=>$('shop').close();$('shop').addEventListener('close',()=>{$('shopStatus').textContent='';});
function renderResearch(){
 $('researchOptions').replaceChildren();materials.forEach((m,i)=>{const row=document.createElement('div');row.className='research-row';const text=document.createElement('span');text.textContent=m.name+' · $'+m.value+' → $'+Math.round(m.value*1.5*(state.upgrades.processor?1.25:1))+' / spool';const button=document.createElement('button');button.textContent=state.studied[i]?'Studied ✓':state.bag[i]?'Study · Use 1 spool':'Collect a spool first';button.disabled=state.studied[i]||!state.bag[i];button.onclick=()=>{if(Math.hypot(player.position.x+7,player.position.z+11)>3)return;const result=act(state,'study',i);if(result){updateHUD();persist();renderResearch();$('researchStatus').textContent=result;notify(result);}};row.append(text,button);$('researchOptions').append(row);});
}
$('closeResearch').onclick=()=>$('research').close();$('research').addEventListener('close',()=>{$('researchStatus').textContent='';});
function renderBlueprints(){
 $('blueprintBalance').textContent='Balance: $'+state.money.toLocaleString();
 $('rollBlueprint').disabled=state.money<blueprintPrice;
 $('blueprintCollection').replaceChildren(...blueprintTiers.map((tier,index)=>{
  const row=document.createElement('p');
  row.textContent=tier.name+' · '+tier.ship+' · '+tier.chance+'% · Owned: '+state.blueprints[index];
  if(state.ships[index])row.append(' · Ship built');
  else if(state.blueprints[index]){
   const build=document.createElement('button');
   build.textContent='Build '+tier.ship;
   build.onclick=()=>{
    if(!$('blueprintDialog').open||location!=='lab'||!buildShip(state,index))return;
    playSound('purchase');
    $('blueprintResult').textContent=tier.ship+' built! Load cargo at the factory dispatch desk.';
    persist();
    renderBlueprints();
   };
   row.append(' ',build);
  }
  return row;
 }));
}
$('rollBlueprint').onclick=()=>{
 if(!$('blueprintDialog').open||location!=='lab'||Math.hypot(player.position.x-blueprintRoller.x,player.position.z-blueprintRoller.z)>=3.2)return;
 const tier=rollBlueprint(state);
 if(!tier)return;
 playSound('roll');
 $('blueprintResult').textContent=tier.name+' blueprint unlocked: '+tier.ship+'!';
 updateHUD();
 persist();
 renderBlueprints();
};
$('closeBlueprint').onclick=()=>$('blueprintDialog').close();
function openCheats(){
 keys.clear();
 $('cheatCommand').value='';
 $('cheatStatus').textContent='';
 $('cheatsDialog').showModal();
 $('cheatCommand').focus();
}
$('closeCheats').onclick=()=>$('cheatsDialog').close();
$('cheatsForm').onsubmit=event=>{
 event.preventDefault();
 const command=$('cheatCommand').value.trim().toLowerCase();
 const money=command.match(/^\/money=(\d{1,9})$/);
 let message;
 if(money){
  state.money=Number(money[1]);
  message='Money set to $'+state.money.toLocaleString()+'.';
 }else if(command==='/heal'){
  setHealth(100);
  message='Health restored.';
 }else if(command==='/fillbag'){
  let count=state.bag.reduce((total,amount)=>total+amount,0);
  while(count<capacity(state)){
   state.bag[count%materials.length]++;
   count++;
  }
  message='Backpack filled with materials.';
 }else if(command==='/home'){
  $('cheatsDialog').close();
  arrive('earth',true);
  return;
 }else{
  $('cheatStatus').textContent='Unknown command or invalid amount.';
  return;
 }
 updateHUD();
 persist();
 $('cheatStatus').textContent=message;
};
function pauseGame(){
 if($('pauseMenu').open)return;keys.clear();for(const id of ['instructions','research','shop','alienResearch','dispatch','robuxExtras','blueprintDialog','cheatsDialog','geneticsDialog'])if($(id).open)$(id).close();
 $('pauseChoices').hidden=false;$('restartChoices').hidden=true;$('pauseError').textContent='';orbit.enabled=false;$('pauseMenu').showModal();
}
function resumeGame(){keys.clear();$('pauseMenu').close();orbit.enabled=!flight;}
setupMouseLock({THREE,canvas:renderer.domElement,camera,orbit,isBlocked:modalOpen,onMessage:notify,onZoom:zoomCamera});
$('pauseButton').onclick=pauseGame;$('resumeGame').onclick=resumeGame;
$('pauseMenu').addEventListener('cancel',e=>{e.preventDefault();resumeGame();});
$('restartGame').onclick=()=>{$('pauseChoices').hidden=true;$('restartChoices').hidden=false;$('cancelRestart').focus();};
$('cancelRestart').onclick=()=>{$('restartChoices').hidden=true;$('pauseChoices').hidden=false;$('resumeGame').focus();};
$('confirmRestart').onclick=()=>{try{localStorage.setItem(saveKey,JSON.stringify(newState()));window.location.reload();}catch{$('pauseError').textContent='Could not reset saved progress. Browser storage is unavailable. Resume your game and try again later.';}};
function zoomCamera(factor){if(modalOpen())return;const offset=camera.position.clone().sub(orbit.target);const distance=Math.max(orbit.minDistance,Math.min(orbit.maxDistance,offset.length()*factor));if(offset.lengthSq()===0)return;camera.position.copy(orbit.target).add(offset.setLength(distance));orbit.update();}
$('zoomIn').onclick=()=>zoomCamera(.8);$('zoomOut').onclick=()=>zoomCamera(1.25);
$('resetCamera').onclick=()=>{orbit.target.copy(player.position).add(new THREE.Vector3(0,1,0));camera.position.copy(player.position).add(new THREE.Vector3(0,18,19));orbit.update();};
$('interact').onclick=()=>interact();$('help').onclick=()=>{$('instructions').showModal();keys.clear();};$('closeHelp').onclick=()=>$('instructions').close();
$('instructions').addEventListener('close',()=> $('tutorialVideo').pause());
addEventListener('keydown',e=>{
 if(e.defaultPrevented||e.ctrlKey||e.metaKey||e.altKey)return;
 if(e.key==='/'&&!e.repeat&&!modalOpen()&&
    !(e.target instanceof HTMLElement&&e.target.closest('input,textarea,select,[contenteditable]'))){
  e.preventDefault();
  openCheats();
  return;
 }
 if(e.code==='Space'&&e.target instanceof HTMLElement&&e.target.closest('button,a,input,select,textarea,[contenteditable]'))return;
 if(e.code==='KeyQ'&&!modalOpen()){e.preventDefault();if(!e.repeat)stunPulse();return;}if(['+','=','-','_'].includes(e.key)&&!modalOpen()){e.preventDefault();zoomCamera(e.key==='+'||e.key==='='?.8:1.25);return;}if(e.code==='Space'&&!modalOpen()){e.preventDefault();if(!e.repeat)sprint();return;}if(e.key==='Escape'){e.preventDefault();if(!e.repeat){if($('pauseMenu').open)resumeGame();else pauseGame();}return;}if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','W','A','S','D','e','E'].includes(e.key)&&!modalOpen()){e.preventDefault();keys.add(e.key.toLowerCase());if(e.key.toLowerCase()==='e'&&!e.repeat)interact();}});addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));addEventListener('blur',()=>keys.clear());document.addEventListener('visibilitychange',()=>keys.clear());
for(const button of document.querySelectorAll('[data-move]')){button.onpointerdown=e=>{e.preventDefault();button.setPointerCapture(e.pointerId);keys.add(button.dataset.move.toLowerCase());};for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,()=>keys.delete(button.dataset.move.toLowerCase()));}
function canMove(x,z){
 if(location==='lab'){
  const xLimit=cargoFlying?orbitLimit:stationBounds.x-.7;
  const minZ=cargoFlying?-orbitLimit:stationBounds.minZ+.7;
  const maxZ=cargoFlying?orbitLimit:stationBounds.maxZ-.7;
  if(Math.abs(x-LAB_X)>xLimit||z<minZ||z>maxZ)return false;
 }else if(x<EARTH_BOUNDS.minX||x>EARTH_BOUNDS.maxX||z<EARTH_BOUNDS.minZ||z>EARTH_BOUNDS.maxZ)return false;
 return cargoFlying||!colliders.some(c=>{
  if(c.radius)return Math.hypot(x-c.x,z-c.z)<c.radius+.4;
  if(!state.conveyor&&((c.x>=1&&c.x<=5)||c.x===0&&c.z===-3))return false;
  return Math.abs(x-c.x)<c.w/2+.4&&Math.abs(z-c.z)<c.d/2+.4;
 });
}
const syncPlayers=connectWorld({
 THREE,scene,label,status:$('worldStatus'),labX:LAB_X,orbitLimit,bounds:EARTH_BOUNDS,
 readPosition:()=>({zone:location,x:player.position.x,z:player.position.z,yaw:player.rotation.y})
});
function tick(realNow){const dt=Math.min((realNow-last)/1000,.05);last=realNow;syncPlayers(realNow,dt);if($('pauseMenu').open){renderer.render(scene,camera);requestAnimationFrame(tick);return;}const now=gameNow+=dt*1000;let dx=0,dz=0;if(!modalOpen()){dx=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0);dz=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0);}const forward=new THREE.Vector3();camera.getWorldDirection(forward);forward.y=0;forward.normalize();const right=new THREE.Vector3().crossVectors(forward,new THREE.Vector3(0,1,0));const move=right.multiplyScalar(dx).addScaledVector(forward,-dz);dx=move.x;dz=move.z;
 const previous=player.position.clone();const length=Math.hypot(dx,dz);if(length){const speed=(cargoFlying?18+state.cargoRun.ship:state.upgrades.speed?7.5:6)*(now<sprintUntil?1.8:1);dx=dx/length*speed*dt;dz=dz/length*speed*dt;if(canMove(player.position.x+dx,player.position.z))player.position.x+=dx;if(canMove(player.position.x,player.position.z+dz))player.position.z+=dz;player.rotation.y=Math.atan2(dx,dz);legs[0].rotation.x=Math.sin(now*.013)*.5;legs[1].rotation.x=-legs[0].rotation.x;}else legs.forEach(l=>l.rotation.x=0);
 if(cargoFlying){
  cargoShip.position.set(player.position.x,5,player.position.z);
  cargoShip.rotation.y=player.rotation.y;
 }
 if(!cargoFlying)updateAliens(now,dt);
 $('teleportHome').hidden=!cargoFlying&&atFactory();
 $('teleportHome').disabled=!!flight;
 const p=player.position,dist=(x,z)=>Math.hypot(x-p.x,z-p.z);nearby=null;
 if(!cargoFlying)activateStepPad(p);
 if(state.claimed&&!state.conveyor&&dist(-6,-4)<2.6)nearby={action:'buy',text:'Buy conveyor · $500'};
 if(state.conveyor){if(state.bag.some(n=>n)&&dist(0,-3)<2.8)nearby={action:'deposit',text:'Deposit materials'};else spools.forEach((s,i)=>{if(s.available&&dist(s.x,s.z)<2)nearby={action:'collect',index:i,text:state.bag.reduce((a,b)=>a+b,0)>=capacity(state)?'Backpack full · Return to funnel':'Collect '+materials[i].name};});}
 if(state.claimed&&dist(-7,-11)<3)nearby={action:'research',text:'Study materials · +50% value'};
 if(state.claimed&&dist(8,-12)<3)nearby={action:'shop',text:'Open upgrade shop'};
 if(location==='earth'&&state.conveyor){if(!state.net&&dist(19,26)<2.7)nearby={action:'net',text:'Pick up free alien net'};if(state.net&&netEquipped)aliens.forEach((a,i)=>{if(a.available&&dist(a.x,a.z)<2.4)nearby={action:'catch',index:i,text:'Catch '+alienTypes[i].name};});if(dist(25,4)<4)nearby={action:state.rocket?'fly':'rocket',text:state.rocket?'Ride rocket to alien lab':'Buy rocket · $1,000'};}
 if(location==='earth'&&state.conveyor&&dist(-7,-1)<3)nearby={action:'dispatch',text:state.salvage?'Turn in salvage crate · $450':'Open delivery jobs'};
 if(location==='earth'&&health<100&&dist(medStation.x,medStation.z)<2)nearby={action:'heal',text:'Restore health · Free'};
 if(location==='lab'){nearby=null;if(dist(blueprintRoller.x,blueprintRoller.z)<3.2)nearby={action:'blueprint',text:'Open Ship Blueprint Roller'};if(dist(LAB_X,-5)<3.2)nearby={action:'alienLab',text:'Study captured aliens'};if(dist(LAB_X,8)<2.7)nearby={action:'return',text:'Ride rocket back to Earth'};}
 if(location==='lab'&&!cargoFlying){
  if(dist(advancedTable.x,advancedTable.z)<4.6)nearby={action:'advancedStudy',text:'Open Advanced Study'};
  if(dist(fusionTable.x,fusionTable.z)<4.6)nearby={action:'cellFusion',text:'Open Cell Fusion'};
  if(dist(displayEntrance.x,displayEntrance.z)<3)nearby={action:'alienDisplay',text:'View your aliens'};
 }
 if(cargoFlying){
  const destination=cargoDestinations[state.cargoRun.order];
  nearby=dist(destination.x,destination.z)<3?{action:'cargoLanding',text:'Land and unload · $'+state.cargoRun.payout.toLocaleString()}:null;
 }
 $('interact').disabled=!nearby||!!flight;setControlText('interact',nearby?nearby.text+' · E':'Interact · E');setControlText('prompt',nearby?'Press E or tap below':cargoFlying?'Steer with WASD or arrows · Fly to '+cargoDestinations[state.cargoRun.order].name:'WASD / arrows to move · Follow blue arrow');
 let t=target();
 // Route guidance through the open doorway instead of pointing into the front wall.
 if(location==='earth'&&t&&!cargoFlying){
  const inside=v=>Math.abs(v.x)<11.7&&v.z<4.5&&v.z> -15.7;
  if(inside(p)&&!inside(t))t={x:0,z:6};
  else if(!inside(p)&&inside(t))t=Math.abs(p.x)<4&&p.z>4?{x:0,z:2}:{x:0,z:6};
 }
 arrow.visible=!!t;if(t){const dir=new THREE.Vector3(t.x-p.x,0,t.z-p.z);arrow.position.set(p.x,(cargoFlying?7:3.4)+Math.sin(now*.004)*.12,p.z);if(dir.length()>.1)arrow.setDirection(dir.normalize());}
 if(!modalOpen()&&!cargoFlying){
 for(const crystal of adventure.crystals){if(crystal.region===location&&!state.crystals.includes(crystal.id)&&dist(crystal.x,crystal.z)<1.5){const result=act(state,'crystal',crystal.id);playSound('pickup');notify(result);updateHUD();persist();adventure.celebrate(p,0x6effe7,now);}}
 if(location==='earth'&&state.upgrades.drone&&state.conveyor){const spool=spools.find(s=>s.available&&dist(s.x,s.z)<5);if(spool){const index=spools.indexOf(spool);if(act(state,'collect',index)){spool.available=false;spool.group.visible=false;spool.next=now+8000;updateHUD();persist();adventure.celebrate(spool.group.position,materials[index].color,now);}}}
 }
 adventure.update(now,dt,state,location);$('sprint').disabled=now<sprintReady;setControlText('sprint',now<sprintReady?'Sprint · '+Math.ceil((sprintReady-now)/1000)+'s':'Sprint · Space');
 spools.forEach(s=>{if(!s.available&&now>s.next){s.available=true;s.group.visible=true;}s.group.rotation.y=now*.0005;s.group.position.y=.85+Math.sin(now*.002)*.1;});
 processed=processed.filter(item=>{const elapsed=(now-item.start)/1000;if(elapsed<0)return true;if(elapsed>3){scene.remove(item.cube);item.cube.geometry.dispose();item.cube.material.dispose();return false;}item.cube.visible=true;item.cube.position.z=-3-elapsed*2.7;return true;});
 if(state.conveyor&&state.upgrades.filamentMachine&&!modalOpen()&&!document.hidden){
  filamentElapsed+=dt;
  if(filamentElapsed>=filamentCycle){
   filamentElapsed-=filamentCycle;
   const result=act(state,'produceFilament');
   processFilament(result);
   updateHUD();
   persist();
   if(location==='earth'&&dist(-3.5,-4.9)<15){
    playSound('pickup');
    notify('Filament Machine processed one PLA spool · +$'+result.payout);
   }
  }
 }
 if(state.conveyor)rollers.forEach((r,i)=>r.material.color.setHex((Math.floor(now/160)+i)%2?0x748597:0x53697d));
 if(flight){const elapsed=now-flight.start;if(location==='earth')rocket.position.y=Math.min(35,elapsed/70);if(elapsed>2600){arrive(flight.destination);previous.copy(p);}}
 const delta=p.clone().sub(previous);camera.position.add(delta);orbit.target.add(delta);orbit.update();if(now>notice)$('toast').style.opacity=0;renderer.render(scene,camera);requestAnimationFrame(tick);
}
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});updateHUD();notify('Welcome, explorer! Try delivery jobs, crystal hunting, and the alien lab.');requestAnimationFrame(tick);
