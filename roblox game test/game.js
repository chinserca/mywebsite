import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {materials,newState,validState,act,materialValue,capacity,shopItems} from './state.js';
const $=id=>document.getElementById(id),saveKey='the-factory-v1';let state=newState();
try{const saved=JSON.parse(localStorage.getItem(saveKey));if(validState(saved))state={...saved,upgrades:saved.upgrades??{backpack:false,speed:false,processor:false},studied:saved.studied??materials.map(()=>false)};}catch{}
const scene=new THREE.Scene();scene.background=new THREE.Color(0xa9d7ee);scene.fog=new THREE.Fog(0xa9d7ee,45,110);
const camera=new THREE.PerspectiveCamera(48,innerWidth/innerHeight,.1,180);let renderer;
try{renderer=new THREE.WebGLRenderer({antialias:true});}catch{$('toast').textContent='This game needs WebGL. Try an up-to-date Chrome or Edge browser.';throw Error('WebGL unavailable');}
renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;$('world').append(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xe8f5ff,0x60724d,2.5));const sun=new THREE.DirectionalLight(0xfff5d9,3);sun.position.set(-12,30,15);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-35,right:35,top:35,bottom:-35,far:80});scene.add(sun);
const orbit=new OrbitControls(camera,renderer.domElement);orbit.enableDamping=true;orbit.enablePan=false;orbit.minDistance=7;orbit.maxDistance=38;orbit.minPolarAngle=.2;orbit.maxPolarAngle=Math.PI/2-.15;orbit.target.set(0,1,9);camera.position.set(0,18,28);orbit.update();
const colliders=[];
function box(w,h,d,x,y,z,color,solid=false){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:.75}));mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);if(solid)colliders.push({x,z,w,d});return mesh;}
function label(text,x,y,z,color='#ffffff',size=1){const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=160;const ctx=canvas.getContext('2d');ctx.fillStyle='#172c40';ctx.beginPath();ctx.roundRect(0,0,1024,160,22);ctx.fill();ctx.fillStyle=color;ctx.font='bold 65px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,512,83);const map=new THREE.CanvasTexture(canvas);const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map,depthTest:true}));sprite.position.set(x,y,z);sprite.scale.set(6.4*size,1*size,1);scene.add(sprite);return sprite;}
box(90,.3,90,0,-.2,0,0x7fa36a);box(24,.3,20,0,.05,-6,0xc1c9cc);box(8,.08,20,0,.02,15,0xaaa89e);
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
box(3,1.1,1.6,-7,.65,-11,0x347fba,true);box(1.2,.9,.15,-7,1.7,-11.4,0x24445e);box(.9,.6,.17,-7,1.7,-11.3,0x72e4fd);label('RESEARCH · +50% VALUE',-7,3,-11,'#87e9ff',.75);
box(2.8,1.2,1.5,8,.7,-12,0x8356b7,true);box(2.5,.2,1.7,8,1.4,-12,0xffcf59);label('UPGRADE SHOP',8,3,-12,'#e2b4ff',.7);
label('FINISHED GOODS',3,2.5,-12,'#a9ffb5',.55);const spools=[];const positions=[[-9,12],[-6,18],[0,20],[6,18],[9,12],[14,20],[-14,20]];
materials.forEach((type,i)=>{const [x,z]=positions[i];const group=new THREE.Group();group.position.set(x,.8,z);scene.add(group);for(const offset of [-.42,.42]){const disk=new THREE.Mesh(new THREE.CylinderGeometry(.65,.65,.13,20),new THREE.MeshStandardMaterial({color:0x27394d}));disk.position.y=offset;group.add(disk);}const core=new THREE.Mesh(new THREE.CylinderGeometry(.5,.5,.8,24),new THREE.MeshStandardMaterial({color:type.color}));group.add(core);label(type.name,x,2,z,'#ffffff',.5);spools.push({group,x,z,available:true,next:0});});
for(const [x,z] of [[-22,-10],[23,-8],[-25,20],[26,24],[-18,31],[20,33]]){box(.8,3,.8,x,1.5,z,0x765b3f,true);const tree=new THREE.Mesh(new THREE.ConeGeometry(3,6,7),new THREE.MeshStandardMaterial({color:0x397458}));tree.position.set(x,5,z);scene.add(tree);}
const player=new THREE.Group();player.position.set(0,0,9);scene.add(player);
function body(w,h,d,x,y,z,color){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color}));m.position.set(x,y,z);m.castShadow=true;player.add(m);return m;}
body(.8,.9,.45,0,1.3,0,0x3485e4);body(.6,.6,.6,0,2.07,0,0xffd49b);body(.75,.14,.7,0,2.45,0,0xffcf42);const legs=[body(.3,.8,.35,-.22,.45,0,0x263951),body(.3,.8,.35,.22,.45,0,0x263951)];body(.25,.8,.3,-.56,1.25,0,0xffd49b);body(.25,.8,.3,.56,1.25,0,0xffd49b);
const arrow=new THREE.ArrowHelper(new THREE.Vector3(0,0,-1),new THREE.Vector3(),3,0x188fff,.9,.65);scene.add(arrow);
const keys=new Set();let nearby=null,last=performance.now(),notice=0,processed=[];
function notify(message){$('toast').textContent=message;$('toast').style.opacity=1;notice=performance.now()+6500;}
function persist(){try{localStorage.setItem(saveKey,JSON.stringify(state));}catch{notify('Progress cannot be saved in this browser. Keep this tab open to continue.');}}
function updateHUD(){
 $('money').textContent=state.money.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0});const total=state.bag.reduce((a,b)=>a+b,0);$('bag').textContent='Backpack · '+total+' / '+capacity(state);$('materials').replaceChildren();materials.forEach((m,i)=>{const row=document.createElement('div');row.textContent=m.name+' × '+state.bag[i]+' · $'+materialValue(state,i)+(state.studied[i]?' ★':'');$('materials').append(row);});claim.visible=!state.claimed;claimLabel.visible=!state.claimed;purchase.visible=state.claimed&&!state.conveyor;purchaseLabel.visible=purchase.visible;conveyor.visible=state.conveyor;$('objective').textContent=!state.claimed?'Claim your factory':!state.conveyor?'Buy a conveyor · $500':total?'Put materials in the funnel':'Collect materials outside';
}
function target(){if(!state.claimed)return {x:0,z:1};if(!state.conveyor)return {x:-6,z:-4};if(state.bag.some(n=>n))return {x:0,z:-1};return spools.filter(s=>s.available).sort((a,b)=>Math.hypot(a.x-player.position.x,a.z-player.position.z)-Math.hypot(b.x-player.position.x,b.z-player.position.z))[0];}
function interact(){if(!nearby||modalOpen())return;if(nearby.action==='shop'){keys.clear();renderShop();$('shop').showModal();return;}if(nearby.action==='research'){keys.clear();renderResearch();$('research').showModal();return;}const result=act(state,nearby.action,nearby.index);if(!result){notify('Your backpack is full. Return to the funnel.');return;}if(nearby.action==='collect'){const spool=spools[nearby.index];spool.available=false;spool.group.visible=false;spool.next=performance.now()+8000;}
 if(typeof result==='object'){
  // Pay immediately so closing the tab during the conveyor animation cannot lose materials.
  state.money+=result.payout;notify('Materials processed! Earned $'+result.payout+'.');let n=0;result.cargo.forEach((amount,i)=>{for(let j=0;j<amount;j++){const cube=box(.45,.45,.45,3,1.6,-3,materials[i].color);cube.visible=false;processed.push({cube,start:performance.now()+n++*350});}});
 }else notify(result);updateHUD();persist();}
function modalOpen(){return $('instructions').open||$('research').open||$('shop').open;}
function renderShop(){
 $('shopOptions').replaceChildren();$('shopBalance').textContent='Your money: $'+state.money.toLocaleString();
 shopItems.forEach(item=>{const row=document.createElement('div');row.className='research-row';const info=document.createElement('span');const name=document.createElement('strong');name.textContent=item.name;const detail=document.createElement('p');detail.textContent=item.description;info.append(name,detail);const button=document.createElement('button');const owned=state.upgrades[item.id],locked=!state.conveyor;button.textContent=owned?'Owned ✓':locked?'Buy conveyor first':state.money<item.price?'Need $'+item.price:'Buy · $'+item.price;button.disabled=owned||locked||state.money<item.price;button.onclick=()=>{if(Math.hypot(player.position.x-8,player.position.z+12)>3)return;const result=act(state,'upgrade',item.id);if(result){updateHUD();persist();renderShop();$('shopStatus').textContent=result;notify(result);}};row.append(info,button);$('shopOptions').append(row);});
}
$('closeShop').onclick=()=>$('shop').close();$('shop').addEventListener('close',()=>{keys.clear();$('shopStatus').textContent='';});
function renderResearch(){
 $('researchOptions').replaceChildren();materials.forEach((m,i)=>{const row=document.createElement('div');row.className='research-row';const text=document.createElement('span');text.textContent=m.name+' · $'+m.value+' → $'+Math.round(m.value*1.5*(state.upgrades.processor?1.25:1))+' / spool';const button=document.createElement('button');button.textContent=state.studied[i]?'Studied ✓':state.bag[i]?'Study · Use 1 spool':'Collect a spool first';button.disabled=state.studied[i]||!state.bag[i];button.onclick=()=>{if(Math.hypot(player.position.x+7,player.position.z+11)>3)return;const result=act(state,'study',i);if(result){updateHUD();persist();renderResearch();$('researchStatus').textContent=result;notify(result);}};row.append(text,button);$('researchOptions').append(row);});
}
$('closeResearch').onclick=()=>$('research').close();$('research').addEventListener('close',()=>{$('researchStatus').textContent='';keys.clear();});
$('resetCamera').onclick=()=>{orbit.target.copy(player.position).add(new THREE.Vector3(0,1,0));camera.position.copy(player.position).add(new THREE.Vector3(0,18,19));orbit.update();};
$('interact').onclick=interact;$('help').onclick=()=>{$('instructions').showModal();keys.clear();};$('closeHelp').onclick=()=>$('instructions').close();
addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','W','A','S','D','e','E'].includes(e.key)&&!modalOpen()){e.preventDefault();keys.add(e.key.toLowerCase());if(e.key.toLowerCase()==='e'&&!e.repeat)interact();}});addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));addEventListener('blur',()=>keys.clear());document.addEventListener('visibilitychange',()=>keys.clear());
for(const button of document.querySelectorAll('[data-move]')){button.onpointerdown=e=>{e.preventDefault();button.setPointerCapture(e.pointerId);keys.add(button.dataset.move.toLowerCase());};for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,()=>keys.delete(button.dataset.move.toLowerCase()));}
function canMove(x,z){if(Math.abs(x)>35||z>36||z< -25)return false;return !colliders.some(c=>{if(!state.conveyor&&((c.x>=1&&c.x<=5)||c.x===0&&c.z===-3))return false;return Math.abs(x-c.x)<c.w/2+.4&&Math.abs(z-c.z)<c.d/2+.4;});}
function tick(now){const dt=Math.min((now-last)/1000,.05);last=now;let dx=0,dz=0;if(!modalOpen()){dx=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0);dz=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0);}const forward=new THREE.Vector3();camera.getWorldDirection(forward);forward.y=0;forward.normalize();const right=new THREE.Vector3().crossVectors(forward,new THREE.Vector3(0,1,0));const move=right.multiplyScalar(dx).addScaledVector(forward,-dz);dx=move.x;dz=move.z;
 const previous=player.position.clone();const length=Math.hypot(dx,dz);if(length){const speed=state.upgrades.speed?7.5:6;dx=dx/length*speed*dt;dz=dz/length*speed*dt;if(canMove(player.position.x+dx,player.position.z))player.position.x+=dx;if(canMove(player.position.x,player.position.z+dz))player.position.z+=dz;player.rotation.y=Math.atan2(dx,dz);legs[0].rotation.x=Math.sin(now*.013)*.5;legs[1].rotation.x=-legs[0].rotation.x;}else legs.forEach(l=>l.rotation.x=0);
 const p=player.position,dist=(x,z)=>Math.hypot(x-p.x,z-p.z);nearby=null;
 if(!state.claimed&&dist(0,1)<2){const result=act(state,'claim');notify(result);updateHUD();persist();}
 if(state.claimed&&!state.conveyor&&dist(-6,-4)<2.6)nearby={action:'buy',text:'Buy conveyor · $500'};
 if(state.conveyor){if(state.bag.some(n=>n)&&dist(0,-3)<2.8)nearby={action:'deposit',text:'Deposit materials'};else spools.forEach((s,i)=>{if(s.available&&dist(s.x,s.z)<2)nearby={action:'collect',index:i,text:state.bag.reduce((a,b)=>a+b,0)>=capacity(state)?'Backpack full · Return to funnel':'Collect '+materials[i].name};});}
 if(state.claimed&&dist(-7,-11)<3)nearby={action:'research',text:'Study materials · +50% value'};
 if(state.claimed&&dist(8,-12)<3)nearby={action:'shop',text:'Open upgrade shop'};
 $('interact').disabled=!nearby;$('interact').textContent=nearby?nearby.text+' · E':'Interact · E';$('prompt').textContent=nearby?'Press E or tap below':'WASD / arrows to move · Follow blue arrow';
 let t=target();
 // Route guidance through the open doorway instead of pointing into the front wall.
 if(t&&(p.z-4)*(t.z-4)<0){const crossX=p.x+(t.x-p.x)*(4-p.z)/(t.z-p.z);if(Math.abs(crossX)>4)t={x:0,z:p.z>4?6:2};}
 arrow.visible=!!t;if(t){const dir=new THREE.Vector3(t.x-p.x,0,t.z-p.z);arrow.position.set(p.x,3.4+Math.sin(now*.004)*.12,p.z);if(dir.length()>.1)arrow.setDirection(dir.normalize());}
 spools.forEach(s=>{if(!s.available&&now>s.next){s.available=true;s.group.visible=true;}s.group.rotation.y=now*.0005;s.group.position.y=.85+Math.sin(now*.002)*.1;});
 processed=processed.filter(item=>{const elapsed=(now-item.start)/1000;if(elapsed<0)return true;if(elapsed>3){scene.remove(item.cube);item.cube.geometry.dispose();item.cube.material.dispose();return false;}item.cube.visible=true;item.cube.position.z=-3-elapsed*2.7;return true;});
 if(state.conveyor)rollers.forEach((r,i)=>r.material.color.setHex((Math.floor(now/160)+i)%2?0x748597:0x53697d));
 const delta=p.clone().sub(previous);camera.position.add(delta);orbit.target.add(delta);orbit.update();if(now>notice)$('toast').style.opacity=0;renderer.render(scene,camera);requestAnimationFrame(tick);
}
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});updateHUD();notify('Welcome! Follow the blue arrow to your next objective.');requestAnimationFrame(tick);
