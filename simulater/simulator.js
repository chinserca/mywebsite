import * as THREE from 'three';
import {setupWorkshop} from './workshop.js?v=base-identity';
import {setupSound} from './sound.js';
import {buildDrone} from './drone-model.js?v=base-identity';

const el = id => document.getElementById(id);
const sound=setupSound(el('sound'));
const vehicles = [
  {name:'Tesla Roadster', kind:'car', paint:0xef4b46, health:160, thrusters:true, speed:35, response:3, description:'Electric sports car · fast on the road'},
  {name:'DJI Avata 2', kind:'drone', batterySeconds:240, paint:0x39485e, health:120, fpv:true, bladeGuards:true, speed:26, climb:13, response:4.5, description:'FPV drone · quick and agile'},
  {name:'DJI Mini 4K', kind:'drone', batterySeconds:360, paint:0xc5cad2, health:75, speed:16, climb:8, response:5.5, description:'Camera drone · gentle handling'},
  {name:'DJI Air 3', kind:'drone', batterySeconds:480, paint:0x88978d, health:95, speed:21, climb:10, response:4, description:'Camera drone · balanced flight'},
  {name:'Rally Buggy', kind:'car', paint:0xffb53a, health:140, speed:24, response:5, description:'Practice car · tight turns'},
  {name:'DJI Mavic 3 Pro', kind:'drone', batterySeconds:420, paint:0x566170, health:110, speed:22, climb:9, response:3.5, description:'Camera drone · steady handling'},
  {name:'DJI Neo', kind:'drone', batterySeconds:210, paint:0xd6dee5, health:65, bladeGuards:true, speed:14, climb:7, response:6, description:'Compact drone · guarded propellers'},
  {name:'FPV Racer', fpv:true, kind:'drone', batterySeconds:210, paint:0xee613f, health:90, speed:34, climb:16, response:5, description:'Racing drone · high speed'},
  {name:'Surveyor', kind:'drone', batterySeconds:540, paint:0xe4ac42, health:145, speed:17, climb:8, response:3, description:'Survey drone · sturdy and steady'},
  {name:'Micro Whoop', fpv:true, kind:'drone', batterySeconds:180, paint:0x8f70d8, health:55, bladeGuards:true, speed:12, climb:9, response:8, description:'Compact FPV drone · quick turns and blade guards'},
  {name:'Sky Courier', kind:'drone', batterySeconds:420, paint:0x42a7a3, health:130, speed:24, climb:12, response:4, description:'Cargo drone · balanced speed and durability'},
  {name:'Cinewhoop', kind:'drone', batterySeconds:240, fpv:true, bladeGuards:true, paint:0x295d89, health:105, speed:19, climb:10, response:5, description:'Guarded FPV drone · smooth handling'},
  {name:'Horizon Explorer', kind:'drone', batterySeconds:480, paint:0xe3e0cf, health:100, speed:20, climb:9, response:4, description:'Camera drone · stabilized view'},
  {name:'Long Range FPV', kind:'drone', batterySeconds:360, fpv:true, paint:0x334956, health:115, speed:30, climb:14, response:3, description:'FPV drone · fast cruising'}
];

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa9d7f1);
scene.fog = new THREE.FogExp2(0xb9c9d2,.0025);
const camera = new THREE.PerspectiveCamera(62,innerWidth/innerHeight,.1,450);
let renderer;
try {
  renderer = new THREE.WebGLRenderer({antialias:true});
} catch {
  el('error').textContent = 'This simulator needs a browser with WebGL enabled.';
  throw new Error('WebGL unavailable');
}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.15;
el('world').append(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xd8e6f4,0x93908b,2.1));
const sun = new THREE.DirectionalLight(0xffebd2,2.7);
sun.position.set(38,65,28);
sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);
Object.assign(sun.shadow.camera,{left:-52,right:52,top:52,bottom:-52,far:180});
sun.shadow.normalBias=.045;
scene.add(sun.target);
const sunOffset=sun.position.clone();
scene.add(sun);
const material = color => new THREE.MeshStandardMaterial({color,roughness:.72});
function mesh(geometry,color,x,y,z,parent=scene) {
  const object = new THREE.Mesh(geometry,material(color));
  object.position.set(x,y,z);
  object.castShadow=true;
  object.receiveShadow=true;
  parent.add(object);
  return object;
}
function box(w,h,d,color,x,y,z,parent) {
  return mesh(new THREE.BoxGeometry(w,h,d),color,x,y,z,parent);
}
const ground=box(860,.4,860,0x687179,0,-.25,0);
ground.castShadow=false;
const obstacles=[];
const roofs=[];
const avenueXs=[-324,-270,-216,-162,-108,-54,0,54,108,162,216,270,324];
const streetZs=[-317,-254,-191,-128,-65,-2,61,124,187,250,313];

const asphalt=material(0x343c46);
const concrete=material(0xaeb4b8);
function surfaceTexture(base,spread){
  const canvas=document.createElement('canvas');
  canvas.width=canvas.height=128;
  const ink=canvas.getContext('2d');
  const pixels=ink.createImageData(128,128);
  for(let i=0;i<pixels.data.length;i+=4){
    const value=base+((i*31+(i%127)*73)%spread)-spread/2;
    pixels.data.set([value,value,value,255],i);
  }
  ink.putImageData(pixels,0,0);
  const texture=new THREE.CanvasTexture(canvas);
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.repeat.set(4,80);
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
  return texture;
}
asphalt.map=surfaceTexture(175,40);
concrete.map=surfaceTexture(235,16);
concrete.map.repeat.set(12,12);
const lineMaterial=material(0xf2e7c4);
const laneMarks=[];
for(const x of avenueXs){
  const avenue=new THREE.Mesh(new THREE.BoxGeometry(11,.045,700),asphalt);
  avenue.position.set(x,.015,0);
  avenue.receiveShadow=true;
  scene.add(avenue);
  for(let z=-340;z<=340;z+=8){
    if(streetZs.some(street=>Math.abs(street-z)<7))continue;
    laneMarks.push([x,z,false]);
  }
}
for(const z of streetZs){
  const street=new THREE.Mesh(new THREE.BoxGeometry(700,.045,11),asphalt);
  street.position.set(0,.015,z);
  street.receiveShadow=true;
  scene.add(street);
  for(let x=-340;x<=340;x+=8){
    if(avenueXs.some(avenue=>Math.abs(avenue-x)<7))continue;
    laneMarks.push([x,z,true]);
  }
}
const marks=new THREE.InstancedMesh(new THREE.BoxGeometry(.15,.012,3.1),lineMaterial,laneMarks.length);
const markerTransform=new THREE.Object3D();
laneMarks.forEach(([x,z,horizontal],i)=>{
  markerTransform.position.set(x,.045,z);
  markerTransform.rotation.y=horizontal?Math.PI/2:0;
  markerTransform.updateMatrix();
  marks.setMatrixAt(i,markerTransform.matrix);
});
scene.add(marks);

const facadeCanvas=document.createElement('canvas');
facadeCanvas.width=128;
facadeCanvas.height=256;
const facadeInk=facadeCanvas.getContext('2d');
facadeInk.fillStyle='#b4bdc5';
facadeInk.fillRect(0,0,128,256);
for(let floor=0;floor<8;floor++)for(let column=0;column<4;column++){
  const x=column*32+6,y=floor*32+6;
  facadeInk.fillStyle=(floor*7+column)%5===0?'#d3bc8a':'#304858';
  facadeInk.fillRect(x,y,21,19);
  facadeInk.fillStyle='#708c9c';
  facadeInk.fillRect(x+2,y+2,17,3);
}
const facade=new THREE.CanvasTexture(facadeCanvas);
facade.colorSpace=THREE.SRGBColorSpace;
const facadeColors=[0xc3d7dd,0xdbc8b0,0x9baab1,0xd3d7d6];
const facades=facadeColors.map(color=>{
  const side=material(color);
  side.map=facade;
  side.roughness=.48;
  const roof=material(0x656c72);
  return [side,side,roof,roof,side,side];
});
for(let column=0;column<avenueXs.length-1;column++){
  for(let row=0;row<streetZs.length-1;row++){
    const x=(avenueXs[column]+avenueXs[column+1])/2;
    const z=(streetZs[row]+streetZs[row+1])/2;
    const block=new THREE.Mesh(new THREE.BoxGeometry(42,.12,51),concrete);
    block.position.set(x,.02,z);
    block.receiveShadow=true;
    scene.add(block);
    const plaza=x===-27&&z===29.5;
    const flightCorridor=z===-33.5&&Math.abs(x)<35;
    if(plaza||flightCorridor)continue;
    const center=1-Math.min(1,Math.hypot(x,z)/360);
    for(const offset of [-12,12]){
      const tower=(column*7+row*3+(offset>0?1:0))%9===0;
      const height=7+Math.round(center*(tower?43:24))+(column*13+row*7+offset+12)%12;
      const width=16+(column+row)%4;
      const depth=19+(column*3+row)%7;
      const buildingMaterials=facades[(column+row+(offset>0?1:0))%facades.length];
      const side=buildingMaterials[0].clone();
      side.map=facade.clone();
      side.map.wrapS=side.map.wrapT=THREE.RepeatWrapping;
      side.map.repeat.set(Math.max(1,width/15),Math.max(.5,height/25));
      const building=new THREE.Mesh(new THREE.BoxGeometry(width,height,depth),[side,side,buildingMaterials[2],buildingMaterials[3],side,side]);
      building.position.set(x+offset,height/2,z+(offset>0?9:-9));
      building.castShadow=building.receiveShadow=true;
      scene.add(building);
      if(Math.abs(x)<90&&Math.abs(z)<140){
        const front=building.position.z+depth/2+.04;
        box(2.6,2.5,.08,0x243c48,building.position.x,1.3,front);
        box(3.5,.14,1.1,0x646d70,building.position.x,2.7,front+.35);
        box(width,.22,depth,0x727a7f,building.position.x,height+.1,building.position.z);
        const roofUnit=box(2.2,1,1.6,0x959e9f,building.position.x+width*.24,height+.5,building.position.z);
        roofUnit.material.metalness=.35;
        const unitBounds={x:roofUnit.position.x,z:roofUnit.position.z,width:1.1,depth:.8,height:height+1};
        obstacles.push(unitBounds);
        roofs.push(unitBounds);
      }
      if(tower){
        box(width*.56,2,depth*.55,0x58656c,building.position.x,height+1,building.position.z);
        const roofCap={x:building.position.x,z:building.position.z,width:width*.28,depth:depth*.275,height:height+2};
        obstacles.push(roofCap);
        roofs.push(roofCap);
      }
      const buildingBounds={x:building.position.x,z:building.position.z,width:width/2,depth:depth/2,height};
      obstacles.push(buildingBounds);
      roofs.push(buildingBounds);
    }
  }
}
box(15,.05,15,0x334f65,-26,.105,10);
mesh(new THREE.RingGeometry(4.8,5.05,48),0xa9ebf7,-26,.14,10).rotation.x=-Math.PI/2;
box(28,.04,22,0x769477,-27,.105,38);
box(3,.025,22,0xbcb8a4,-27,.14,38);
for(const [x,z] of [[-42,18],[-12,18],[-42,40],[-12,40],[-35,46],[-18,46],[-42,-14],[39,-14]]){
  box(6,.15,6,0x527050,x,.14,z);
  mesh(new THREE.CylinderGeometry(.27,.39,3,20),0x78634d,x,1.6,z);
  const crown=mesh(new THREE.SphereGeometry(2.35,28,18),0x477554,x,4.4,z);
  crown.scale.y=1.25;
  obstacles.push({x,z,radius:2.35,height:7.4});
}
for(const [x,z] of [[0,-65],[54,-65],[0,-2],[54,-2]]){
  for(const sign of [-1,1]){
    const poleX=x+sign*7.2,poleZ=z+sign*7.2;
    mesh(new THREE.CylinderGeometry(.085,.12,6.5,12),0x56606a,poleX,3.25,poleZ);
    box(3.1,.1,.1,0x56606a,poleX-sign*1.5,6.5,poleZ);
    const lamp=box(.65,.08,.32,0xfff0c9,poleX-sign*2.6,6.45,poleZ);
    lamp.material.emissive.setHex(0x544a32);
    obstacles.push({x:poleX,z:poleZ,radius:.12,height:6.5});
  }
  for(let stripe=-4;stripe<=4;stripe+=2){
    box(.9,.015,2.4,0xf4f1dc,x+stripe,.05,z+6.5);
    box(2.4,.015,.9,0xf4f1dc,x+6.5,.05,z+stripe);
  }
}
const routes = {
  drone:[[-26,8,-13],[-48,17,-35],[-15,24,-63],[21,13,-40],[-26,3,10]],
  car:[[0,.85,-29],[0,.85,-64],[54,.85,-64],[54,.85,-2],[0,.85,-2]]
};
const gates = new THREE.Group();
scene.add(gates);
const marker = mesh(new THREE.TorusGeometry(3.8,.16,10,52),0x55f9ce,0,0,0,gates);
marker.material.emissive.setHex(0x1cb991);
gates.visible=false;
let vehicle, model, yaw=0, speed=0, firstPerson=false, nextGate=0, raceStart=null, best={};
let rotors=[],wheels=[],liftFlames=[],boostFlames=[];
let health=0, lastImpact=-Infinity, spinRemaining=0;
let landed=false;
let hovering=false;
function toggleHover(){
  if(vehicle?.kind!=='drone'||!health||collisionFall||emergencyLanding)return;
  hovering=!hovering;
  if(hovering){
    spinRemaining=0;
    model.rotation.x=0;
    model.rotation.z=0;
    stabilizedHeading=yaw;
  }
  velocity.set(0,0,0);
  keys.clear();
  el('hover').setAttribute('aria-pressed',String(hovering));
}
el('hover').onclick=toggleHover;
let battery=100, emergencyLanding=false;
let collisionFall=false, lastDroneCrash=-Infinity;
let vehicleRun=0;
const landingHeight=.42;
const velocity = new THREE.Vector3();
const position = new THREE.Vector3();
const keys=new Set();
const cameraOffset=new THREE.Vector3();
const look=new THREE.Vector3();
const up=new THREE.Vector3(0,1,0);

function createModel(config,remote=false){
  const group=new THREE.Group();
  group.rotation.order='YXZ';
  if(!remote){rotors=[];wheels=[];liftFlames=[];boostFlames=[];}
  if(config.kind==='car'){
    const roadster=config.name==='Tesla Roadster';
    const profile=new THREE.Shape();
    profile.moveTo(-2.32,.26);
    profile.lineTo(2.28,.26);
    profile.lineTo(2.23,.68);
    profile.quadraticCurveTo(1.86,.82,.8,.79);
    profile.lineTo(.47,.96);
    profile.lineTo(-.68,.9);
    profile.quadraticCurveTo(-1.65,.76,-2.32,.52);
    profile.closePath();
    const shell=mesh(new THREE.ExtrudeGeometry(profile,{depth:1.86,bevelSize:.12,bevelThickness:.1,bevelSegments:3,steps:1}),
      config.paint,.93,0,0,group);
    shell.rotation.y=-Math.PI/2;
    shell.material.roughness=.28;
    shell.material.metalness=.25;
    const roofProfile=new THREE.Shape();
    roofProfile.moveTo(-.85,0);
    roofProfile.lineTo(.86,0);
    roofProfile.lineTo(.43,roadster?.42:.65);
    roofProfile.lineTo(-.38,roadster?.42:.65);
    roofProfile.closePath();
    const glass=mesh(new THREE.ExtrudeGeometry(roofProfile,{depth:1.5,bevelEnabled:false}),0x243443,.75,.78,.16,group);
    glass.rotation.y=-Math.PI/2;
    glass.material.roughness=.13;
    glass.material.metalness=.55;
    box(1.45,.045,.76,roadster?0x252b30:config.paint,0,roadster?1.21:1.44,.14,group);
    box(1.35,.14,.1,0x17222a,0,.3,-2.46,group);
    box(1.7,.09,.12,0x252a2d,0,.27,2.46,group);
    for(const sign of [-1,1]){
      box(.03,.025,1.35,0x3e464c,sign*.99,.66,.25,group);
      box(.04,.035,.23,0x74797c,sign*1.01,.76,.52,group);
      const headlight=box(.47,.07,.04,0xd5e7ec,sign*.68,.62,-2.46,group);
      headlight.material.emissive.setHex(0x4b565a);
    }
    for(const x of [-.78,.78]){
      box(.46,.09,.09,0xe5f7ff,x,.52,-2.44,group);
      box(.49,.09,.09,0xff3437,x,.55,2.42,group);
      box(.26,.14,.32,config.paint,x*1.37,.88,-.27,group);
    }
    for(const x of [-1.03,1.03])for(const z of [-1.42,1.42]){
      const wheel=new THREE.Group();
      wheel.position.set(x,.41,z);
      group.add(wheel);
      mesh(new THREE.CylinderGeometry(.43,.43,.34,24),0x202532,0,0,0,wheel).rotation.z=Math.PI/2;
      mesh(new THREE.CylinderGeometry(.26,.26,.36,20),0x8c9ca9,0,0,0,wheel).rotation.z=Math.PI/2;
      for(const angle of [0,Math.PI/3,2*Math.PI/3]){
        const spoke=box(.37,.045,.46,0x485862,0,0,0,wheel);
        spoke.rotation.x=angle;
      }
      if(!remote)wheels.push(wheel);
    }
    if(config.thrusters&&!remote){
      for(const x of [-.65,.65]){
        mesh(new THREE.CylinderGeometry(.22,.28,.16,16),0x253244,x,.19,0,group);
        const lift=mesh(new THREE.ConeGeometry(.23,.94,16),0x62dfff,x,-.31,0,group);
        lift.rotation.z=Math.PI;
        liftFlames.push(lift);
        const exhaust=mesh(new THREE.CylinderGeometry(.19,.23,.21,16),0x253244,x,.4,2.43,group);
        exhaust.rotation.x=Math.PI/2;
        const boost=mesh(new THREE.ConeGeometry(.21,1.25,16),0x76d9ff,x,.4,3.05,group);
        boost.rotation.x=Math.PI/2;
        boostFlames.push(boost);
      }
      for(const flame of [...liftFlames,...boostFlames]){
        flame.material.emissive.setHex(0x2692d9);
        flame.material.emissiveIntensity=1.7;
        flame.castShadow=false;
        flame.visible=false;
      }
    }
  }else{
    buildDrone(config,{group,mesh,box,rotors,remote});
  }
  scene.add(group);
  return group;
}
let stabilizedHeading=0;
function placeCamera(dt){
  camera.up.copy(up);
  if(!vehicle){
    camera.position.set(42,48,64);
    camera.lookAt(4,0,-22);
    return;
  }
  const drone=vehicle.kind==='drone';
  if(firstPerson&&vehicle.fpv){
    camera.position.set(0,.18,-.9).applyQuaternion(model.quaternion).add(position);
    camera.quaternion.copy(model.quaternion);
    return;
  }
  const heading=drone&&firstPerson?stabilizedHeading:yaw;
  cameraOffset.set(0,firstPerson?(drone?.18:1.15):drone?4.4:3.6,firstPerson?-.9:drone?9:10).applyAxisAngle(up,heading).add(position);
  camera.position.lerp(cameraOffset,dt?1-Math.exp(-dt*10):1);
  look.set(0,firstPerson?(drone?.17:1.12):.2,firstPerson?-24:-4).applyAxisAngle(up,heading).add(position);
  camera.lookAt(look);
}
function clearCourse(){
  raceStart=null;
  gates.visible=false;
  el('course').textContent='Start course';
  el('course').setAttribute('aria-pressed','false');
}
function resetVehicle(){
  hovering=false;
  el('hover').setAttribute('aria-pressed','false');
  el('hover').hidden=vehicle.kind!=='drone';
  vehicleRun++;
  keys.clear();
  yaw=0;
  stabilizedHeading=0;
  health=vehicle.health;
  lastImpact=-Infinity;
  spinRemaining=0;
  landed=vehicle.kind==='drone';
  battery=100;
  emergencyLanding=false;
  collisionFall=false;
  el("batteryMeter").hidden=vehicle.kind!=="drone";
  el("battery").value=100;
  el("batteryValue").textContent="100%";
  el('health').max=vehicle.health;
  updateHealth();
  speed=0;
  velocity.set(0,0,0);
  position.set(vehicle.kind==='drone'?-26:0,landed?landingHeight:0,vehicle.kind==='drone'?10:6);
  model.position.copy(position);
  model.rotation.set(0,0,0);
  clearCourse();
  el('raceStatus').textContent='';
  placeCamera(0);
}
function choose(config){
  if(model){
    scene.remove(model);
    model.traverse(part=>{if(part.isMesh){part.geometry.dispose();part.material.dispose();}});
  }
  vehicle=config;
  model=createModel(config);
  firstPerson=false;
  el('camera').textContent='View · Chase';
  el('picker').hidden=true;
  el('garage').hidden=el('hud').hidden=el('touch').hidden=false;
  el('touch').querySelector('.altitude').hidden=config.kind==='car'&&!config.thrusters;
  const boostButton=el('descend');
  el('climb').dataset.key=config.thrusters?' ':'arrowup';
  boostButton.dataset.key=config.thrusters?'shift':'arrowdown';
  boostButton.textContent=config.thrusters?'Boost':'−';
  boostButton.setAttribute('aria-label',config.thrusters?'Forward boost':'Descend');
  el('vehicleName').textContent=config.name;
  el('controls').textContent=config.kind==='drone'
    ? 'WASD move · ↑ take off or climb · ↓ descend or land · ←/→ turn · Space hover · C change view'
    : config.thrusters
      ? 'W/S accelerate or reverse · A/D steer · Space lift thrusters · Shift forward boost · C change view'
      : 'W/S accelerate or reverse · A/D steer · Space brake · C change view';
  resetVehicle();
}
for(const config of vehicles){
  const button=document.createElement('button');
  button.textContent=config.name;
  button.style.setProperty('--paint','#'+config.paint.toString(16).padStart(6,'0'));
  const description=document.createElement('span');
  description.textContent=config.description;
  if(config.batterySeconds)description.append(' · '+config.batterySeconds/60+' min active flight');
  button.append(description);
  button.onclick=()=>choose(config);
  el('vehicles').append(button);
}
const createButton=document.createElement('button');
createButton.id='createDrone';
createButton.textContent='Create';
el('vehicles').append(createButton);
setupWorkshop(vehicles,choose);
el('garage').onclick=()=>{
  keys.clear();
  clearCourse();
  model.visible=false;
  vehicle=null;
  el('picker').hidden=false;
  el('garage').hidden=el('hud').hidden=el('touch').hidden=true;
};
function toggleCamera(){
  firstPerson=!firstPerson;
  el('camera').textContent=firstPerson?(vehicle.fpv?'View · FPV':vehicle.kind==='drone'?'View · Stabilized':'View · First person'):'View · Chase';
  placeCamera(0);
}
el('camera').onclick=toggleCamera;
el('reset').onclick=resetVehicle;
function updateHealth(){
  el('health').value=health;
  el('healthValue').textContent=health+' / '+vehicle.health;
}
function damage(amount,now){
  if(amount<=0||now-lastImpact<450)return;
  sound.impact(amount);
  health=Math.max(0,health-Math.ceil(amount));
  lastImpact=now;
  updateHealth();
  if(!health){
    keys.clear();
    speed=0;
    clearCourse();
    el('raceStatus').textContent='Vehicle wrecked. Select Reset vehicle to repair it.';
  }else{
    el('raceStatus').textContent='Impact · '+Math.ceil(amount)+' damage';
  }
}
function showGate(){
  marker.position.set(...routes[vehicle.kind][nextGate]);
  marker.rotation.y=vehicle.kind==='car'&&[2,4].includes(nextGate)?Math.PI/2:0;
  el('raceStatus').textContent='Checkpoint '+(nextGate+1)+' / '+routes[vehicle.kind].length;
}
el('course').onclick=()=>{
  if(!health)return;
  if(raceStart!==null){
    clearCourse();
    el('raceStatus').textContent='Course ended.';
    return;
  }
  resetVehicle();
  nextGate=0;
  raceStart=performance.now();
  gates.visible=true;
  el('course').textContent='End course';
  el('course').setAttribute('aria-pressed','true');
  showGate();
};
const movement=['w','a','s','d','arrowleft','arrowright','arrowup','arrowdown',' ','shift'];
el('hud').addEventListener('click',event=>{
  // Return Space to vehicle controls after a mouse or touch activation.
  if(event.detail>0&&event.target instanceof HTMLButtonElement)event.target.blur();
});
addEventListener('keydown',event=>{
  if(!vehicle||event.ctrlKey||event.metaKey||event.altKey)return;
  const key=event.key.toLowerCase();
  if(key===' '&&event.target instanceof HTMLElement&&event.target.closest('button,a'))return;
  if(key===' '&&vehicle.kind==='drone'){
    event.preventDefault();
    if(!event.repeat)toggleHover();
    return;
  }
  if(key==='c'&&!event.repeat){toggleCamera();return;}
  if(movement.includes(key)){
    event.preventDefault();
    if(!health)return;
    if(event.target instanceof HTMLButtonElement)event.target.blur();
    keys.add(key);
  }
});
addEventListener('keyup',event=>keys.delete(event.key.toLowerCase()));
addEventListener('blur',()=>keys.clear());
document.addEventListener('visibilitychange',()=>keys.clear());
for(const button of document.querySelectorAll('[data-key]')){
  button.onpointerdown=event=>{
    event.preventDefault();
    if(!health)return;
    button.setPointerCapture(event.pointerId);
    keys.add(button.dataset.key);
  };
  for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,()=>keys.delete(button.dataset.key));
}
const direction=(positive,negative)=>Number(keys.has(positive))-Number(keys.has(negative));
const wish=new THREE.Vector3();
const proposed=new THREE.Vector3();
const wind=new THREE.Vector3();
let lastWindReadout=-Infinity;
const lowerBound=new THREE.Vector3(-360,0,-360);
const upperBound=new THREE.Vector3(360,48,360);
function surfaceBelow(x,z,maxY,clearance){
  let surface=clearance;
  for(const roof of roofs){
    const top=roof.height+clearance;
    if(top<=maxY&&top>surface&&Math.abs(x-roof.x)<=roof.width&&Math.abs(z-roof.z)<=roof.depth)surface=top;
  }
  return surface;
}
let last=performance.now();
function tick(now){
  const dt=Math.min(.05,(now-last)/1000);
  last=now;
  wind.set(2.2+Math.sin(now*.0007)*1.8,0,Math.cos(now*.00053)*1.5);
  if(vehicle&&now-lastWindReadout>250){
    const compass=['N','NE','E','SE','S','SW','W','NW'];
    const directionIndex=Math.round(Math.atan2(wind.x,-wind.z)/(Math.PI/4));
    el('wind').textContent='Wind · '+wind.length().toFixed(1)+' m/s toward '+compass[(directionIndex+8)%8];
    lastWindReadout=now;
  }
  if(vehicle){
    const drone=vehicle.kind==='drone';
    const clearance=drone?landingHeight:0;
    const lift=health>0&&vehicle.thrusters&&keys.has(' ');
    const boost=health>0&&vehicle.thrusters&&keys.has('shift');
    for(const flame of liftFlames)flame.visible=!!lift;
    for(const flame of boostFlames)flame.visible=!!boost;
    const easing=1-Math.exp(-dt*vehicle.response);
    if(drone&&(!health||collisionFall)){
      if(position.y>surfaceBelow(position.x,position.z,position.y,clearance)){
        velocity.y=Math.max(-32,velocity.y-14*dt);
        model.rotation.x+=dt*3;
        model.rotation.z+=dt*4;
      }else{
        velocity.set(0,0,0);
      }
    }else if(drone){
      if(spinRemaining>0){
        const turn=Math.min(spinRemaining,dt*9);
        yaw-=turn;
        spinRemaining-=turn;
      }else{
        if(!hovering)yaw-=direction('arrowright','arrowleft')*dt*1.7;
        stabilizedHeading=yaw;
      }
      if(landed){
        battery=Math.min(100,battery+dt*(vehicle.quickCharge?10:5));
        if(battery>=10)emergencyLanding=false;
        if(!emergencyLanding&&!hovering&&keys.has('arrowup'))landed=false;
      }else{
        const working=['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].some(key=>keys.has(key));
        const load=working?1:.6;
        battery=Math.max(0,battery-dt*100*load/vehicle.batterySeconds);
        if(battery===0){
          emergencyLanding=true;
          hovering=false;
          el('hover').setAttribute('aria-pressed','false');
        }
      }
      wish.set(direction('d','a'),0,-direction('w','s'));
      if(wish.lengthSq()>1)wish.normalize();
      wish.multiplyScalar(vehicle.speed).applyAxisAngle(up,yaw);
      wish.y=direction('arrowup','arrowdown')*vehicle.climb;
      if(!landed)wish.addScaledVector(wind,(.35+position.y*.012)*(vehicle.windStabilizer?.55:1));
      if(landed||hovering)wish.set(0,0,0);
      else if(keys.has('arrowdown')&&!keys.has('arrowup')&&position.y<1.8){
        wish.x=wish.z=0;
        wish.y=-2;
      }
      if(emergencyLanding&&!landed)wish.set(0,-2,0);
      velocity.lerp(wish,easing);
      if(hovering&&!emergencyLanding)velocity.set(0,0,0);
      model.rotation.x=spinRemaining>0?spinRemaining:THREE.MathUtils.lerp(model.rotation.x,landed||hovering?0:direction('w','s')*-.22,easing);
      model.rotation.z=THREE.MathUtils.lerp(model.rotation.z,landed||hovering?0:(direction('d','a')+direction('arrowright','arrowleft')*.55)*-.27,easing);
      rotors.forEach(rotor=>rotor.rotation.y+=dt*(landed?0:42));
    }else{
      const throttle=direction('w','s');
      const brake=!vehicle.thrusters&&keys.has(' ');
      const target=boost?vehicle.speed*1.7:brake?0:throttle*(throttle<0?vehicle.speed*.36:vehicle.speed);
      const braking=brake||!boost&&throttle*speed<0;
      const acceleration=boost?24:braking?24:throttle?8.5:3.1;
      speed+=THREE.MathUtils.clamp(target-speed,-acceleration*dt,acceleration*dt);
      const steer=position.y>.1?1:THREE.MathUtils.clamp(speed/7,-1,1);
      yaw-=direction('d','a')*dt*1.65*steer;
      const vertical=vehicle.thrusters
        ? THREE.MathUtils.clamp(velocity.y+(lift?18:-14)*dt,-32,19)
        : 0;
      velocity.set(-Math.sin(yaw)*speed,vertical,-Math.cos(yaw)*speed);
      wheels.forEach(wheel=>wheel.rotation.x-=speed*dt/.43);
    }
    lowerBound.y=clearance;
    upperBound.y=drone||vehicle.thrusters?48:0;
    proposed.copy(position).addScaledVector(velocity,dt).clamp(lowerBound,upperBound);
    if(proposed.x===lowerBound.x&&velocity.x<0||proposed.x===upperBound.x&&velocity.x>0)velocity.x=0;
    if(proposed.z===lowerBound.z&&velocity.z<0||proposed.z===upperBound.z&&velocity.z>0)velocity.z=0;
    const surface=velocity.y<=0?surfaceBelow(proposed.x,proposed.z,position.y,clearance):clearance;
    const touchingSurface=proposed.y<=surface;
    const wreckLanded=drone&&(!health||collisionFall)&&touchingSurface;
    if(touchingSurface&&velocity.y<0){
      proposed.y=surface;
      velocity.y=0;
      if(drone){
        landed=true;
        velocity.set(0,0,0);
      }
    }else if(proposed.y===upperBound.y&&velocity.y>0)velocity.y=0;
    const blocked=obstacles.some(({x,z,radius,width,depth,height})=>{
      if(proposed.y>=height)return false;
      return radius ? Math.hypot(proposed.x-x,proposed.z-z)<radius+1
        : Math.abs(proposed.x-x)<width+1&&Math.abs(proposed.z-z)<depth+1;
    });
    if(blocked){
      const impactSpeed=Math.hypot(velocity.x,velocity.z);
      if(drone&&!vehicle.bladeGuards&&health&&spinRemaining===0&&impactSpeed>2&&now-lastImpact>=450){
        spinRemaining=Math.PI*2;
      }
      damage((impactSpeed-2)*3,now);
      velocity.x*=.25;
      velocity.z*=.25;
      speed*=.25;
      position.y=proposed.y;
    }else position.copy(proposed);
    if(wreckLanded){
      velocity.set(0,0,0);
      if(collisionFall){landed=true;collisionFall=false;}
    }
    model.position.copy(position);
    model.rotation.y=yaw;
    model.visible=!firstPerson;
    if(drone){
      el('battery').value=battery;
      el('batteryValue').textContent=Math.ceil(battery)+'%'+(health&&emergencyLanding&&!landed?' · Emergency descent':health&&landed&&battery<100?' · Charging':'');
    }
    const groundSpeed=Math.hypot(velocity.x,velocity.z);
    sound.update(vehicle,groundSpeed,velocity.y,wind.length(),keys.has('w')||keys.has('s'),Number(!!lift)+Number(!!boost),health>0&&(!drone||!landed&&!collisionFall),firstPerson);
    const kmh=Math.round(groundSpeed*3.6);
    el('telemetry').textContent=kmh+' km/h'+(drone||vehicle.thrusters?' · Altitude '+position.y.toFixed(1)+' m'+(drone&&!health?(wreckLanded?' · Crashed':' · Falling'):landed?' · Landed':hovering?' · Hover locked':''):'');
    if(raceStart!==null&&position.distanceTo(marker.position)<4){
      nextGate++;
      if(nextGate<routes[vehicle.kind].length)showGate();
      else{
        const elapsed=(now-raceStart)/1000;
        best[vehicle.name]=Math.min(best[vehicle.name]??Infinity,elapsed);
        clearCourse();
        el('raceStatus').textContent='Course finished in '+elapsed.toFixed(1)+' s · Session best '+best[vehicle.name].toFixed(1)+' s';
      }
    }
  }else sound.update(null,0,0,0,0,0,false,false);
  sun.target.position.set(position.x,0,position.z);
  sun.position.copy(sunOffset).add(sun.target.position);
  placeCamera(dt);
  renderer.render(scene,camera);
  updatePeers(dt);
  requestAnimationFrame(tick);
}
addEventListener('resize',()=>{
  camera.aspect=innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
});
requestAnimationFrame(tick);

const playerId=crypto.randomUUID();
const peers=new Map();

function removePeer(id,peer){
  scene.remove(peer.model);
  peer.model.traverse(part=>{if(part.isMesh){part.geometry.dispose();part.material.dispose();}});
  peer.label.remove();
  peers.delete(id);
}
async function syncPeers(){
  if(document.hidden){
    setTimeout(syncPeers,1000);
    return;
  }
  const sendingRun=vehicleRun;
  const canCollide=vehicle?.kind==='drone'&&health>0&&!collisionFall&&performance.now()-lastDroneCrash>6500;
  try{
    const response=await fetch('/api/simulator-presence',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({id:playerId,run:sendingRun,grounded:landed,pitch:model?.rotation.x??0,roll:model?.rotation.z??0,canCollide,custom:vehicle?.baseIndex!==undefined?{name:vehicle.name,paint:vehicle.paint,bladeGuards:!!vehicle.bladeGuards,fpv:!!vehicle.fpv,reinforced:!!vehicle.reinforced,motorBoost:!!vehicle.motorBoost}:null,vx:velocity.x,vy:velocity.y,vz:velocity.z,vehicle:vehicle?.baseIndex??vehicles.indexOf(vehicle),x:position.x,y:position.y,z:position.z,yaw:Math.atan2(Math.sin(yaw),Math.cos(yaw))}),
      signal:AbortSignal.timeout(4500)
    });
    if(!response.ok)throw new Error('Connection unavailable');
    const {peers:players,collision}=await response.json();
    if(collision&&canCollide&&vehicle&&vehicleRun===sendingRun&&health>0){
      const now=performance.now();
      lastDroneCrash=now;
      lastImpact=-Infinity;
      damage(30,now);
      collisionFall=true;
      hovering=false;
      el('hover').setAttribute('aria-pressed','false');
      keys.clear();
      velocity.y=Math.min(velocity.y,0);
      if(health)el('raceStatus').textContent='Drone collision · 30 damage';
    }
    const active=new Set();
    for(const player of players){
      const base=vehicles[player.vehicle];
      if(!base)continue;
      const signature=JSON.stringify([player.vehicle,player.custom??null]);
      const config=player.custom?{...base,modelName:base.name,...player.custom}:base;
      active.add(player.id);
      let peer=peers.get(player.id);
      if(peer&&peer.signature!==signature){removePeer(player.id,peer);peer=null;}
      if(!peer){
        const label=document.createElement('span');
        label.className='peer-label';
        label.textContent=config.name;
        document.body.append(label);
        peer={signature,model:createModel(config,true),label,target:new THREE.Vector3(),velocity:new THREE.Vector3(),rotors:[]};
        peer.model.traverse(part=>{if(part.userData.propeller)peer.rotors.push(part);});
        peer.model.position.set(player.x,player.y,player.z);
        peers.set(player.id,peer);
      }
      peer.target.set(player.x,player.y,player.z);
      peer.velocity.set(player.vx??0,player.vy??0,player.vz??0);
      peer.received=performance.now();
      peer.yaw=player.yaw;
      peer.pitch=player.pitch??0;
      peer.roll=player.roll??0;
      peer.grounded=player.grounded??player.y<=landingHeight+.1;
    }
    for(const [id,peer] of peers)if(!active.has(id))removePeer(id,peer);
    el('online').textContent=players.length+' other '+(players.length===1?'player':'players')+' online';
  }catch{
    el('online').textContent='Multiplayer unavailable';
  }finally{
    setTimeout(syncPeers,250);
  }
}
const labelPosition=new THREE.Vector3();
const predictedPosition=new THREE.Vector3();
function updatePeers(dt){
  for(const [id,peer] of peers){
    if(performance.now()-peer.received>18000){removePeer(id,peer);continue;}
    for(const rotor of peer.rotors)rotor.rotation.y+=peer.grounded?0:dt*42;
    const age=Math.min((performance.now()-peer.received)/1000,.5);
    predictedPosition.copy(peer.target).addScaledVector(peer.velocity,age);
    peer.model.position.lerp(predictedPosition,1-Math.exp(-dt*12));
    const yawDelta=Math.atan2(Math.sin(peer.yaw-peer.model.rotation.y),Math.cos(peer.yaw-peer.model.rotation.y));
    peer.model.rotation.y+=yawDelta*(1-Math.exp(-dt*12));
    for(const [axis,target] of [['x',peer.pitch],['z',peer.roll]]){
      const delta=Math.atan2(Math.sin(target-peer.model.rotation[axis]),Math.cos(target-peer.model.rotation[axis]));
      peer.model.rotation[axis]+=delta*(1-Math.exp(-dt*12));
    }
    labelPosition.copy(peer.model.position);
    labelPosition.y+=2.1;
    labelPosition.project(camera);
    peer.label.hidden=!vehicle||labelPosition.z<-1||labelPosition.z>1||Math.abs(labelPosition.x)>1||Math.abs(labelPosition.y)>1;
    peer.label.style.left=(labelPosition.x+1)*50+'%';
    peer.label.style.top=(1-labelPosition.y)*50+'%';
  }
}
void syncPeers();
