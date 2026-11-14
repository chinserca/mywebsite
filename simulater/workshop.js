const upgrades = [
 {name:'Blade guards', apply:{bladeGuards:true}, slot:'Propellers'},
 {name:'Sport motors', apply:{motorBoost:true}, slot:'Motor mounts'},
 {name:'Reinforced shell', apply:{reinforced:true}, slot:'Body'},
 {name:'Stabilized camera', apply:{fpv:false}, slot:'Camera mount'}
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
  let selected=null;
  const rack=document.createElement('div');
  const mounts=document.createElement('div');
  rack.className=mounts.className='workshop-row';
  const status=document.createElement('p');
  status.setAttribute('role','status');
  status.textContent='Select a part and its mount, or drag the part onto its mount.';
  upgrades.forEach((part,index)=>{
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
   const mount=document.createElement('button');
   const accept=()=>{
    if(selected!==index){status.textContent='This mount takes '+part.name+'.';return;}
    installed.add(index);
    mount.textContent=part.slot+' ✓';
    status.textContent=part.name+' installed.';
   };
   mount.textContent=part.slot;
   mount.onclick=accept;
   mount.ondragover=event=>event.preventDefault();
   mount.ondrop=event=>{event.preventDefault();accept();};
   mounts.append(mount);
  });
  const fly=document.createElement('button');
  fly.textContent='Fly this drone';
  fly.onclick=()=>{
   const blank=!modify&&base.selectedIndex===0;
   const original=blank?bases.find(vehicle=>vehicle.name==='DJI Mini 4K'):bases[base.selectedIndex-(modify?0:1)];
   const config={...original,baseIndex:vehicles.indexOf(original),name:modify?original.name+' Custom':'Workshop Drone'};
   if(blank)Object.assign(config,{paint:0x32b8a5,health:85,speed:18,climb:9});
   for(const index of installed)Object.assign(config,upgrades[index].apply);
   if(config.motorBoost){config.speed+=5;config.climb+=2;}
   if(config.reinforced)config.health+=35;
   dialog.close();
   launch(config);
  };
  bench.replaceChildren();
  bench.append(base);
  bench.append(rack,mounts,status,fly);
 }
 dialog.querySelector('#modifyDrone').onclick=()=>start(true);
 dialog.querySelector('#blankDrone').onclick=()=>start(false);
}
