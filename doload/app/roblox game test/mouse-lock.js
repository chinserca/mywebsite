// Desktop pointer lock keeps the cursor inside gameplay; Escape always releases it.
export function setupMouseLock({THREE,canvas,camera,orbit,isBlocked,onMessage,onZoom}){
 const button=document.getElementById('lockMouse');
 const reticle=document.getElementById('reticle');
 let wasLocked=false,intentionalRelease=false,lastUnlock=-Infinity;
 const locked=()=>document.pointerLockElement===canvas;
 function draw(){const active=locked();button.textContent=active?'Mouse locked · Esc':'Lock mouse';reticle.hidden=!active;document.body.classList.toggle('mouse-locked',active);}
 function release(){if(locked()){intentionalRelease=true;document.exitPointerLock();}}
 function failure(){draw();onMessage('Mouse lock is unavailable here. You can still right-click and drag to look around. Try opening the game in Chrome or Edge.');}
 async function request(){
  if(isBlocked()||locked())return;
  if(!canvas.requestPointerLock){failure();return;}
  intentionalRelease=false;
  try{await canvas.requestPointerLock();}catch{failure();}
 }
 button.onclick=()=>{if(locked())release();else request();};
 document.addEventListener('pointerlockerror',failure);
 document.addEventListener('pointerlockchange',()=>{
  const active=locked();
  if(active){wasLocked=true;orbit.enableDamping=false;orbit.update();orbit.enabled=false;}
  else{const showHint=wasLocked&&!intentionalRelease&&!isBlocked();lastUnlock=performance.now();wasLocked=false;intentionalRelease=false;orbit.enableDamping=true;orbit.enabled=!isBlocked();if(showHint)onMessage('Mouse unlocked. Click Lock mouse to lock again, or press Esc to pause.');}
  draw();
 });
 // OrbitControls handles ordinary scroll and touch pinch. Capture wheel input
 // ourselves while locked, because OrbitControls is disabled for mouse look.
 canvas.addEventListener('wheel',event=>{
  if(!locked()||isBlocked())return;
  event.preventDefault();event.stopImmediatePropagation();
  const unit=event.deltaMode===1?16:event.deltaMode===2?canvas.clientHeight:1;
  const delta=Math.max(-240,Math.min(240,event.deltaY*unit));
  if(delta)onZoom(Math.exp(delta*.0015));
 },{passive:false,capture:true});
 document.addEventListener('mousemove',event=>{
  if(!locked()||isBlocked())return;
  const offset=camera.position.clone().sub(orbit.target),spherical=new THREE.Spherical().setFromVector3(offset);
  spherical.theta-=event.movementX*.0025;
  spherical.phi=Math.max(orbit.minPolarAngle,Math.min(orbit.maxPolarAngle,spherical.phi-event.movementY*.0025));
  camera.position.copy(orbit.target).add(offset.setFromSpherical(spherical));camera.lookAt(orbit.target);
 });
 // The first Escape only unlocks. A later Escape can open the pause menu.
 addEventListener('keydown',event=>{if(event.key==='Escape'&&(locked()||performance.now()-lastUnlock<200)){event.stopImmediatePropagation();if(!event.repeat)release();}},true);
 // All dialogs release the cursor so players can use menu buttons.
 for(const dialog of document.querySelectorAll('dialog'))new MutationObserver(()=>{if(dialog.open)release();}).observe(dialog,{attributes:true,attributeFilter:['open']});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)release();});
 draw();return {request,release,locked};
}
