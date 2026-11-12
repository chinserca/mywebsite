import * as THREE from 'three';

const el = id => document.getElementById(id);
const vehicles = [
  {name:'Tesla Roadster', kind:'car', paint:0xef4b46, speed:35, response:3, description:'Electric sports car · fast on the road'},
  {name:'DJI Avata 2', kind:'drone', paint:0x39485e, speed:26, climb:13, response:4.5, description:'FPV drone · quick and agile'},
  {name:'DJI Mini 4K', kind:'drone', paint:0xc5cad2, speed:16, climb:8, response:5.5, description:'Camera drone · gentle handling'},
  {name:'DJI Air 3', kind:'drone', paint:0x88978d, speed:21, climb:10, response:4, description:'Camera drone · balanced flight'},
  {name:'Rally Buggy', kind:'car', paint:0xffb53a, speed:24, response:5, description:'Practice car · tight turns'}
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
el('world').append(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xe8f7ff,0x779266,2.1));
const sun = new THREE.DirectionalLight(0xffe1a4,2.25);
sun.position.set(18,40,-18);
scene.add(sun);
const material = color => new THREE.MeshStandardMaterial({color,roughness:.72});
function mesh(geometry,color,x,y,z,parent=scene) {
  const object = new THREE.Mesh(geometry,material(color));
  object.position.set(x,y,z);
  parent.add(object);
  return object;
}
function box(w,h,d,color,x,y,z,parent) {
  return mesh(new THREE.BoxGeometry(w,h,d),color,x,y,z,parent);
}
box(380,.4,380,0x83a365,0,-.25,0);
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
let rotors=[];
const velocity = new THREE.Vector3();
const position = new THREE.Vector3();
const keys=new Set();
const cameraOffset=new THREE.Vector3();
const look=new THREE.Vector3();
const up=new THREE.Vector3(0,1,0);

function createModel(config){
  const group=new THREE.Group();
  rotors=[];
  if(config.kind==='car'){
    box(2.1,.48,4.6,config.paint,0,.44,0,group);
    box(1.66,.47,1.95,0x233b52,0,.89,.22,group);
    for(const x of [-.82,.82])box(.42,.16,.08,0xe8faff,x,.51,-2.3,group);
    for(const x of [-1.03,1.03])for(const z of [-1.42,1.42]){
      mesh(new THREE.CylinderGeometry(.43,.43,.34,20),0x202532,x,.41,z,group).rotation.z=Math.PI/2;
      mesh(new THREE.CylinderGeometry(.24,.24,.37,16),0x7d8b96,x,.41,z,group).rotation.z=Math.PI/2;
    }
  }else{
    box(1.25,.38,1.66,config.paint,0,0,0,group);
    box(.4,.27,.18,0x101b2d,0,-.07,-.88,group);
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
  el('touch').querySelector('.altitude').hidden=config.kind==='car';
  el('vehicleName').textContent=config.name;
  el('controls').textContent=config.kind==='drone'
    ? 'WASD move · Space climb · Shift descend · Q/E turn · C change view'
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
function showGate(){
  marker.position.set(...routes[vehicle.kind][nextGate]);
  marker.rotation.y=vehicle.kind==='car'&&[2,4].includes(nextGate)?Math.PI/2:0;
  el('raceStatus').textContent='Checkpoint '+(nextGate+1)+' / '+routes[vehicle.kind].length;
}
el('course').onclick=()=>{
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
const movement=['w','a','s','d','q','e',' ','shift'];
addEventListener('keydown',event=>{
  if(!vehicle||event.ctrlKey||event.metaKey||event.altKey)return;
  const key=event.key.toLowerCase();
  if(key==='c'&&!event.repeat){toggleCamera();return;}
  if(movement.includes(key)){event.preventDefault();keys.add(key);}
});
addEventListener('keyup',event=>keys.delete(event.key.toLowerCase()));
addEventListener('blur',()=>keys.clear());
document.addEventListener('visibilitychange',()=>keys.clear());
for(const button of document.querySelectorAll('[data-key]')){
  button.onpointerdown=event=>{
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    keys.add(button.dataset.key);
  };
  for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,()=>keys.delete(button.dataset.key));
}
const direction=(positive,negative)=>Number(keys.has(positive))-Number(keys.has(negative));
const wish=new THREE.Vector3();
const proposed=new THREE.Vector3();
let last=performance.now();
function tick(now){
  const dt=Math.min(.05,(now-last)/1000);
  last=now;
  if(vehicle){
    const drone=vehicle.kind==='drone';
    const easing=1-Math.exp(-dt*vehicle.response);
    if(drone){
      yaw-=direction('e','q')*dt*1.7;
      wish.set(direction('d','a'),0,-direction('w','s'));
      if(wish.lengthSq()>1)wish.normalize();
      wish.multiplyScalar(vehicle.speed).applyAxisAngle(up,yaw);
      wish.y=direction(' ','shift')*vehicle.climb;
      velocity.lerp(wish,easing);
      model.rotation.x=direction('w','s')*.16;
      model.rotation.z=-direction('d','a')*.19;
      rotors.forEach(rotor=>rotor.rotation.y+=dt*42);
    }else{
      const throttle=direction('w','s');
      const target=keys.has(' ')?0:throttle*(throttle<0?vehicle.speed*.36:vehicle.speed);
      speed+=(target-speed)*(keys.has(' ')?1-Math.exp(-dt*12):easing);
      yaw-=direction('d','a')*dt*1.65*THREE.MathUtils.clamp(speed/7,-1,1);
      velocity.set(-Math.sin(yaw)*speed,0,-Math.cos(yaw)*speed);
    }
    proposed.copy(position).addScaledVector(velocity,dt).clamp(
      new THREE.Vector3(-125,drone?1.05:0,-125),new THREE.Vector3(125,drone?48:0,125));
    const blocked=obstacles.some(({x,z,radius,height})=>proposed.y<height&&Math.hypot(proposed.x-x,proposed.z-z)<radius+1);
    if(blocked){
      velocity.multiplyScalar(.25);
      speed*=.25;
      position.y=proposed.y;
    }else position.copy(proposed);
    model.position.copy(position);
    model.rotation.y=yaw;
    model.visible=!firstPerson;
    const kmh=Math.round(Math.hypot(velocity.x,velocity.z)*3.6);
    el('telemetry').textContent=kmh+' km/h'+(drone?' · Altitude '+position.y.toFixed(1)+' m':'');
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
