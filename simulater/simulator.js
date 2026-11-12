import * as THREE from 'three';

const el = id => document.getElementById(id);
const vehicles = [
  {name:'Tesla Roadster', kind:'car', paint:0xef4b46, health:160, thrusters:true, speed:35, response:3, description:'Electric sports car · fast on the road'},
  {name:'DJI Avata 2', kind:'drone', paint:0x39485e, health:120, speed:26, climb:13, response:4.5, description:'FPV drone · quick and agile'},
  {name:'DJI Mini 4K', kind:'drone', paint:0xc5cad2, health:75, speed:16, climb:8, response:5.5, description:'Camera drone · gentle handling'},
  {name:'DJI Air 3', kind:'drone', paint:0x88978d, health:95, speed:21, climb:10, response:4, description:'Camera drone · balanced flight'},
  {name:'Rally Buggy', kind:'car', paint:0xffb53a, health:140, speed:24, response:5, description:'Practice car · tight turns'}
];

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa9d7f1);
scene.fog = new THREE.FogExp2(0xa9d7f1,.004);
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
renderer.toneMappingExposure=1.2;
el('world').append(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xe8f7ff,0x779266,2.1));
const sun = new THREE.DirectionalLight(0xffe1a4,2.25);
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
const ground=box(380,.4,380,0x839969,0,-.25,0);
ground.castShadow=false;
const texture=document.createElement('canvas');
texture.width=texture.height=128;
const ink=texture.getContext('2d');
ink.fillStyle='#ddd';ink.fillRect(0,0,128,128);
for(let i=0;i<2400;i++){
  ink.fillStyle=i%2?'#c7c7c7':'#ebebeb';
  ink.fillRect(i*71%128,(i*i*41+i*13)%128,1+i%3,1+i%2);
}
const grass=new THREE.CanvasTexture(texture);
grass.colorSpace=THREE.SRGBColorSpace;
grass.wrapS=grass.wrapT=THREE.RepeatWrapping;
grass.repeat.set(72,72);
ground.material.map=grass;
const road = [[0,7],[0,-65],[54,-65],[54,-2],[0,-2]];
for(let i=0;i<road.length-1;i++){
  const [x,z]=road[i], [nx,nz]=road[i+1];
  const horizontal=z===nz;
  box(horizontal?Math.abs(nx-x)+9:9,.04,horizontal?9:Math.abs(nz-z)+9,0x4e5b69,(x+nx)/2,.01,(z+nz)/2);
  const length=Math.hypot(nx-x,nz-z);
  for(let along=5;along<length;along+=7){
    const t=along/length;
    box(horizontal?3:.18,.015,horizontal?.18:3,0xf5d898,x+(nx-x)*t,.04,z+(nz-z)*t);
  }
}
box(15,.05,15,0x334f65,-26,.025,10);
mesh(new THREE.RingGeometry(4.8,5.05,48),0xa9ebf7,-26,.06,10).rotation.x=-Math.PI/2;
for(let i=0;i<10;i++){
  const x=7+i*4.5;
  box(2.9,.09,.27,0xe5dfc6,x,.08,-69.7);
  box(2.9,.09,.27,0xe5dfc6,x,.08,-60.3);
}
const obstacles=[];
for(let i=0;i<38;i++){
  const x=(i*29%162)-80,z=(i*43%154)-92;
  if((Math.abs(x)<9&&z>-74&&z<14)||(x>-10&&x<64&&(Math.abs(z+65)<9||Math.abs(z+2)<9))||(Math.abs(x-54)<9&&z>-74&&z<8)||Math.hypot(x+26,z-10)<12)continue;
  box(.55,2.6,.55,0x775c40,x,1.3,z);
  mesh(new THREE.ConeGeometry(2.1,5.2,12),i%2?0x365f49:0x477b54,x,4.25,z);
  obstacles.push({x,z,radius:1.65,height:7});
}
for(let i=0;i<16;i++){
  const angle=i*Math.PI/8;
  const hill=mesh(new THREE.IcosahedronGeometry(1,2),i%2?0x809f8a:0x8aa18a,Math.cos(angle)*155,0,Math.sin(angle)*155);
  hill.scale.set(25,15+i%4*4,21);
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
let health=0, lastImpact=-Infinity;
const velocity = new THREE.Vector3();
const position = new THREE.Vector3();
const keys=new Set();
const cameraOffset=new THREE.Vector3();
const look=new THREE.Vector3();
const up=new THREE.Vector3(0,1,0);

function createModel(config){
  const group=new THREE.Group();
  rotors=[];
  wheels=[];
  liftFlames=[];
  boostFlames=[];
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
    const glass=box(1.59,roadster?.35:.57,1.46,0x263e55,0,roadster?.98:1.14,.23,group);
    glass.material.roughness=.16;
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
      wheels.push(wheel);
    }
    if(config.thrusters){
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
    box(1.25,.38,1.66,config.paint,0,0,0,group);
    box(.4,.27,.18,0x101b2d,0,-.07,-.88,group);
    const lens=mesh(new THREE.CylinderGeometry(.13,.16,.12,24),0x426f9c,0,-.07,-1,group);
    lens.rotation.x=Math.PI/2;
    lens.material.roughness=.12;
    for(const x of [-.39,.39])box(.13,.09,.07,0x63e8ba,x,-.04,.85,group);
    for(const x of [-1,1])for(const z of [-.88,.88]){
      box(1.15,.12,.2,0x33455a,x*.59,0,z,group);
      const rotor=box(.94,.035,.12,0x182838,x,.2,z,group);
      rotors.push(rotor);
      if(config.name==='DJI Avata 2'){
        mesh(new THREE.TorusGeometry(.56,.055,8,28),0x566677,x,.18,z,group).rotation.x=-Math.PI/2;
      }
    }
  }
  scene.add(group);
  return group;
}
function placeCamera(dt){
  if(!vehicle){
    camera.position.set(42,48,64);
    camera.lookAt(4,0,-22);
    return;
  }
  const drone=vehicle.kind==='drone';
  cameraOffset.set(0,firstPerson?(drone?.18:1.15):drone?4.4:3.6,firstPerson?-.9:drone?9:10).applyAxisAngle(up,yaw).add(position);
  camera.position.lerp(cameraOffset,dt?1-Math.exp(-dt*10):1);
  look.set(0,firstPerson?(drone?.17:1.12):.2,firstPerson?-24:-4).applyAxisAngle(up,yaw).add(position);
  camera.lookAt(look);
}
function clearCourse(){
  raceStart=null;
  gates.visible=false;
  el('course').textContent='Start course';
  el('course').setAttribute('aria-pressed','false');
}
function resetVehicle(){
  keys.clear();
  yaw=0;
  health=vehicle.health;
  lastImpact=-Infinity;
  el('health').max=vehicle.health;
  updateHealth();
  speed=0;
  velocity.set(0,0,0);
  position.set(vehicle.kind==='drone'?-26:0,vehicle.kind==='drone'?1.05:0,vehicle.kind==='drone'?10:6);
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
  const boostButton=el('touch').querySelector('[data-key="shift"]');
  boostButton.textContent=config.thrusters?'Boost':'−';
  boostButton.setAttribute('aria-label',config.thrusters?'Forward boost':'Descend');
  el('vehicleName').textContent=config.name;
  el('controls').textContent=config.kind==='drone'
    ? 'WASD move · Space climb · Shift descend · ←/→ turn · C change view'
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
  button.append(description);
  button.onclick=()=>choose(config);
  el('vehicles').append(button);
}
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
  el('camera').textContent=firstPerson?'View · First person':'View · Chase';
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
const movement=['w','a','s','d','arrowleft','arrowright',' ','shift'];
addEventListener('keydown',event=>{
  if(!vehicle||event.ctrlKey||event.metaKey||event.altKey)return;
  const key=event.key.toLowerCase();
  if(key==='c'&&!event.repeat){toggleCamera();return;}
  if(movement.includes(key)){event.preventDefault();if(health)keys.add(key);}
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
const lowerBound=new THREE.Vector3(-125,0,-125);
const upperBound=new THREE.Vector3(125,48,125);
let last=performance.now();
function tick(now){
  const dt=Math.min(.05,(now-last)/1000);
  last=now;
  if(vehicle){
    const drone=vehicle.kind==='drone';
    const lift=health>0&&vehicle.thrusters&&keys.has(' ');
    const boost=health>0&&vehicle.thrusters&&keys.has('shift');
    for(const flame of liftFlames)flame.visible=!!lift;
    for(const flame of boostFlames)flame.visible=!!boost;
    const easing=1-Math.exp(-dt*vehicle.response);
    if(drone){
      yaw-=direction('arrowright','arrowleft')*dt*1.7;
      wish.set(direction('d','a'),0,-direction('w','s'));
      if(wish.lengthSq()>1)wish.normalize();
      wish.multiplyScalar(vehicle.speed).applyAxisAngle(up,yaw);
      wish.y=direction(' ','shift')*vehicle.climb;
      velocity.lerp(wish,easing);
      model.rotation.x=THREE.MathUtils.lerp(model.rotation.x,direction('w','s')*-.22,easing);
      model.rotation.z=THREE.MathUtils.lerp(model.rotation.z,direction('d','a')*-.27,easing);
      rotors.forEach(rotor=>rotor.rotation.y+=dt*42);
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
    lowerBound.y=drone?.42:0;
    upperBound.y=drone||vehicle.thrusters?48:0;
    proposed.copy(position).addScaledVector(velocity,dt).clamp(lowerBound,upperBound);
    if(proposed.y===lowerBound.y&&velocity.y<0){
      if(position.y>lowerBound.y)damage((-velocity.y-6)*3,now);
      velocity.y=0;
    }else if(proposed.y===upperBound.y&&velocity.y>0)velocity.y=0;
    const blocked=obstacles.some(({x,z,radius,height})=>proposed.y<height&&Math.hypot(proposed.x-x,proposed.z-z)<radius+1);
    if(blocked){
      damage((Math.hypot(velocity.x,velocity.z)-2)*3,now);
      velocity.x*=.25;
      velocity.z*=.25;
      speed*=.25;
      position.y=proposed.y;
    }else position.copy(proposed);
    model.position.copy(position);
    model.rotation.y=yaw;
    model.visible=!firstPerson;
    const kmh=Math.round(Math.hypot(velocity.x,velocity.z)*3.6);
    el('telemetry').textContent=kmh+' km/h'+(drone||vehicle.thrusters?' · Altitude '+position.y.toFixed(1)+' m':'');
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
  }
  sun.target.position.set(position.x,0,position.z);
  sun.position.copy(sunOffset).add(sun.target.position);
  placeCamera(dt);
  renderer.render(scene,camera);
  requestAnimationFrame(tick);
}
addEventListener('resize',()=>{
  camera.aspect=innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
});
requestAnimationFrame(tick);
