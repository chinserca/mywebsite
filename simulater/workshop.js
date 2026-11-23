const upgrades = [
 {name:'Blade guards', apply:{bladeGuards:true}, slot:'Propellers'},
 {name:'Sport motors', apply:{motorBoost:true}, slot:'Motor mounts'},
 {name:'Reinforced shell', apply:{reinforced:true}, slot:'Body'},
 {name:'Stabilized camera', apply:{fpv:false}, slot:'Camera mount'},
 {name:'FPV camera', apply:{fpv:true}, slot:'Camera mount'},
 {name:'Wind stabilizer', apply:{windStabilizer:true}, slot:'Flight controller'},
 {name:'Quick-charge module', apply:{quickCharge:true}, slot:'Charging port'},
 {name:'Precision controller', apply:{responseBoost:1.25}, slot:'Flight controller'},
 {name:'High-lift propellers', apply:{extraClimb:3}, slot:'Propellers'}
];

const batteryPacks=[
 {name:'Stock battery', multiplier:1},
 {name:'Extended battery', multiplier:1.35},
 {name:'Long-range battery', multiplier:1.65}
];

export function setupWorkshop(vehicles,launch){
 const dialog=document.querySelector('#workshop');
 const options=dialog.querySelector('#workshopOptions');
 const bench=dialog.querySelector('#workshopBench');
 document.querySelector('#createDrone').onclick=()=>{
  options.hidden=false;
  bench.hidden=true;
  dialog.showModal();
 };
 dialog.querySelector('#closeWorkshop').onclick=()=>dialog.close();
 function start(modify){
  options.hidden=true;
  bench.hidden=false;
  const bases=vehicles.filter(vehicle=>vehicle.kind==='drone');
  const base=document.createElement('select');
  base.setAttribute('aria-label','Base drone');
  if(!modify)base.add(new Option('Blank frame'));
  for(const vehicle of bases)base.add(new Option(vehicle.name));
  const installed=new Set();
  const batteryButton=document.createElement('button');
  batteryButton.textContent='Battery';
  batteryButton.setAttribute('aria-expanded','false');
  const battery=document.createElement('select');
  battery.hidden=true;
  battery.setAttribute('aria-label','Battery pack');
  const duration=document.createElement('p');
  const originalDrone=()=>!modify&&base.selectedIndex===0
   ?bases.find(vehicle=>vehicle.name==='DJI Mini 4K')
   :bases[base.selectedIndex-(modify?0:1)];
  const ratedSeconds=(index)=>Math.round(originalDrone().batterySeconds*batteryPacks[index].multiplier);
  const formatDuration=(seconds)=>Math.floor(seconds/60)+' min '+seconds%60+' sec';
  const updateBattery=()=>{
   const selectedPack=Math.max(0,battery.selectedIndex);
   battery.replaceChildren(...batteryPacks.map((pack,index)=>new Option(pack.name+' · '+formatDuration(ratedSeconds(index)))));
   battery.selectedIndex=selectedPack;
   duration.textContent='Rated flight time: '+formatDuration(ratedSeconds(selectedPack));
  };
  batteryButton.onclick=()=>{
   battery.hidden=!battery.hidden;
   batteryButton.setAttribute('aria-expanded',String(!battery.hidden));
   if(!battery.hidden)battery.focus();
  };
  base.onchange=updateBattery;
  battery.onchange=()=>{duration.textContent='Rated flight time: '+formatDuration(ratedSeconds(battery.selectedIndex));};
  updateBattery();
  let selected=null;
  const rack=document.createElement('div');
  const mounts=document.createElement('div');
  rack.className=mounts.className='workshop-row';
  const status=document.createElement('p');
  status.setAttribute('role','status');
  status.textContent='Select a part and its mount, or drag the part onto its mount.';
  const partsBySlot=new Map();
  upgrades.forEach((part,index)=>{
   if(!partsBySlot.has(part.slot))partsBySlot.set(part.slot,[]);
   partsBySlot.get(part.slot).push(index);
   const tile=document.createElement('button');
   tile.textContent=part.name;
   tile.draggable=true;
   tile.onclick=()=>{
    selected=index;
    status.textContent=part.name+' selected. Choose '+part.slot+'.';
   };
   tile.ondragstart=event=>{
    tile.click();
    event.dataTransfer.setData('text/plain',String(index));
   };
   rack.append(tile);
  });
  for(const [slot,indices] of partsBySlot){
   const mount=document.createElement('button');
   const accept=()=>{
    if(!indices.includes(selected)){
     status.textContent='This mount takes '+indices.map(index=>upgrades[index].name).join(' or ')+'.';
     return;
    }
    for(const index of indices)installed.delete(index);
    installed.add(selected);
    const installedPart=upgrades[selected].name;
    mount.textContent=slot+' · '+installedPart;
    status.textContent=installedPart+' installed.';
   };
   mount.textContent=slot;
   mount.onclick=accept;
   mount.ondragover=event=>event.preventDefault();
   mount.ondrop=event=>{event.preventDefault();accept();};
   mounts.append(mount);
  }
  const fly=document.createElement('button');
  fly.textContent='Fly this drone';
  fly.onclick=()=>{
   const blank=!modify&&base.selectedIndex===0;
   const original=originalDrone();
   const config={...original,modelName:original.name,baseIndex:vehicles.indexOf(original),name:modify?original.name+' Custom':'Workshop Drone'};
   config.batterySeconds=ratedSeconds(battery.selectedIndex);
   if(blank)Object.assign(config,{paint:0x32b8a5,health:85,speed:18,climb:9});
   for(const index of installed)Object.assign(config,upgrades[index].apply);
   if(config.motorBoost){config.speed+=5;config.climb+=2;}
   if(config.extraClimb)config.climb+=config.extraClimb;
   if(config.responseBoost)config.response*=config.responseBoost;
   if(config.reinforced)config.health+=35;
   dialog.close();
   launch(config);
  };
  bench.replaceChildren();
  bench.append(base,batteryButton,battery,duration);
  bench.append(rack,mounts,status,fly);
 }
 dialog.querySelector('#modifyDrone').onclick=()=>start(true);
 dialog.querySelector('#blankDrone').onclick=()=>start(false);
}
