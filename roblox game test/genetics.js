import {alienTypes,hybridTypes,combineCells} from './state.js?v=filament';

const tools = [
 {name:'Notebook',icon:'▤',stations:['specimen','log']},
 {name:'Cell Extractor',icon:'◈',stations:['sterilizer','specimen','vial','sealer']},
 {name:'Compound Microscope',icon:'◉',stations:['specimen','focus','log']},
 {name:'Cell Scanner',icon:'⌁',stations:['specimen','log']}
];
const workstations = {
 specimen:['✦','Specimen tray'],
 sterilizer:['♨','Sterilizer'],
 vial:['◊','Empty vial'],
 sealer:['⬡','Vial sealer'],
 focus:['◎','Focus ring'],
 log:['▤','Research log']
};

const observations = [
 'Green cells form clusters. Their thick outer membranes flex and spring back.',
 'Violet cells drift apart easily. Each nucleus has a pale ring around it.',
 'Amber cells gather in pairs. Tiny orange granules move near the cell walls.'
];

function toolView(panel, tool, index, step, state){
 const alien=alienTypes[index];
 const heading=document.createElement('h3');
 heading.textContent=tool.name+' · '+alien.name;
 const caption=document.createElement('p');
 panel.hidden=false;
 panel.className='lab-tool-view';
 panel.style.setProperty('--specimen-color','#'+alien.color.toString(16).padStart(6,'0'));
 panel.replaceChildren(heading);

 if(tool.name==='Compound Microscope'){
  const lens=document.createElement('div');
  lens.className='lab-lens';
  lens.setAttribute('role','img');
  lens.setAttribute('aria-label',step?'Illustration of '+alien.name+' cells':'Empty microscope lens');
  if(step){
   const positions=[[31,29],[58,22],[73,46],[44,52],[29,70],[62,74],[49,87]];
   const slide=document.createElement('div');
   slide.className='lab-slide';
   slide.classList.toggle('lab-unfocused',step<2);
   positions.slice(0,5+index).forEach(([x,y],cellIndex)=>{
    const cell=document.createElement('i');
    cell.style.left=x+'%';
    cell.style.top=y+'%';
    cell.style.rotate=(cellIndex*53+index*30)+'deg';
    slide.append(cell);
   });
   lens.append(slide);
  }
  caption.textContent=step<1?'Place the specimen slide.':step<2?'40× · Move to the focus ring to sharpen the image.':'400× · '+observations[index];
  panel.append(lens,caption);
 }else if(tool.name==='Notebook'){
  const page=document.createElement('div');
  page.className='lab-notebook';
  caption.textContent=state.notes[index]?observations[index]:'Blank page. Examine the specimen, then move the Notebook to the Research log to write an entry.';
  page.append(caption);
  panel.append(page);
 }else if(tool.name==='Cell Scanner'){
  const scan=document.createElement('div');
  scan.className='lab-scan';
  scan.setAttribute('aria-hidden','true');
  for(let i=0;i<19;i++){
   const bar=document.createElement('i');
   bar.style.height=(14+(i*19+i*i*7+index*13)%77)+'%';
   scan.append(bar);
  }
  scan.classList.toggle('lab-scan-idle',!step);
  const matches=hybridTypes.filter(type=>type.parents.includes(index)).map(type=>type.name);
  caption.textContent=step
   ? 'Signature '+['JH-17','VF-42','SS-63'][index]+' · Compatible hybrids: '+matches.join(', ')+'.'
   : 'Waiting for a specimen. Move the scanner to the Specimen tray.';
  panel.append(scan,caption);
 }else{
  panel.hidden=true;
 }
}

function button(text, action){
 const control=document.createElement('button');
 control.type='button';
 control.textContent=text;
 control.onclick=action;
 return control;
}

function select(label, options){
 const wrapper=document.createElement('label');
 wrapper.textContent=label+' ';
 const control=document.createElement('select');
 for(const [text,value] of options)control.add(new Option(text,value));
 wrapper.append(control);
 return {wrapper,control};
}

export function setupGenetics({dialog,state,save}){
 const title=dialog.querySelector('h2');
 const content=dialog.querySelector('#geneticsContent');
 const status=dialog.querySelector('[role=status]');
 dialog.querySelector('#closeGenetics').onclick=()=>dialog.close();

 function inventory(){
  const summary=document.createElement('ul');
  alienTypes.forEach((type,index)=>{
   const row=document.createElement('li');
   row.textContent=type.name+' cell vial × '+state.cells[index];
   summary.append(row);
  });
  return summary;
 }

 function advancedStudy(){
  title.textContent='Advanced Study';
  const available=alienTypes.flatMap((type,index)=>state.aliens[index]?[[type.name,index]]:[]);
  if(!available.length){
   content.textContent='Capture an alien on Earth and bring it to the station to start.';
   return;
  }
  const specimen=select('Alien',available);
  const rack=document.createElement('div');
  rack.className='lab-tool-rack';
  const bench=document.createElement('div');
  bench.className='lab-bench';
  const instruction=document.createElement('p');
  instruction.className='lab-instruction';
  const inventoryList=inventory();
  const resultView=document.createElement('section');
  resultView.hidden=true;
  let selected=null;
  let step=0;

  const pads=Object.entries(workstations).map(([id,[icon,name]])=>{
   const pad=button(icon+' '+name,()=>place(selected,id));
   pad.dataset.station=id;
   return pad;
  });
  bench.append(...pads);

  function showProgress(){
   const next=selected?.stations[step];
   instruction.textContent=next
    ? 'Step '+(step+1)+' of '+selected.stations.length+' · Move '+selected.name+' to '+workstations[next][1]+'.'
    : 'Drag a floating tool onto the bench, or select a tool and tap a station.';
   for(const pad of pads)pad.classList.toggle('lab-next',pad.dataset.station===next);
   tools.forEach((tool,index)=>rack.children[index].setAttribute('aria-pressed',String(tool===selected)));
  }

  function choose(tool){
   if(selected===tool)return;
   selected=tool;
   step=0;
   status.textContent='';
   showProgress();
   toolView(resultView,tool,Number(specimen.control.value),0,state);
  }

  function place(tool, station){
   if(!tool){
    status.textContent='Choose a tool from the floating rack first.';
    return;
   }
   choose(tool);
   if(station!==tool.stations[step]){
    status.textContent='That station is for a different step. Follow the highlighted pad.';
    return;
   }
   step++;
   const index=Number(specimen.control.value);
   toolView(resultView,tool,index,step,state);
   if(step<tool.stations.length){
    status.textContent=workstations[station][1]+' complete.';
    showProgress();
    return;
   }
   if(!state.aliens[index])return;
   const name=alienTypes[index].name;
   if(tool.name==='Notebook'){
    state.notes[index]=true;
    toolView(resultView,tool,index,step,state);
    status.textContent='Observation saved for '+name+'.';
    save('pickup');
   }else if(tool.name==='Cell Extractor'){
    state.cells[index]++;
    status.textContent='Sealed one '+name+' cell vial and added it to your inventory.';
    inventoryList.replaceChildren(...inventory().children);
    save('pickup');
   }else if(tool.name==='Compound Microscope'){
    status.textContent=name+' cells are active and suitable for fusion.';
   }else{
    const matches=hybridTypes.filter(type=>type.parents.includes(index)).map(type=>type.name);
    status.textContent='Possible hybrids: '+matches.join(', ')+'.';
   }
   selected=null;
   step=0;
   showProgress();
  }

  tools.forEach((tool,index)=>{
   let drag=null;
   let dragged=false;
   const tile=button(tool.icon+' '+tool.name,()=>{
    if(!dragged)choose(tool);
    dragged=false;
   });
   tile.setAttribute('aria-label',tool.name);
   tile.style.setProperty('--float-delay',-index*.41+'s');
   tile.onpointerdown=event=>{
    if(!event.isPrimary||event.button!==0)return;
    dragged=false;
    drag={id:event.pointerId,x:event.clientX,y:event.clientY,ghost:null};
    tile.setPointerCapture(event.pointerId);
   };
   tile.onpointermove=event=>{
    if(drag?.id!==event.pointerId)return;
    if(!drag.ghost){
     if(Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<6)return;
     dragged=true;
     drag.ghost=document.createElement('span');
     drag.ghost.className='lab-tool-ghost';
     drag.ghost.textContent=tile.textContent;
     dialog.append(drag.ghost);
    }
    drag.ghost.style.left=event.clientX+'px';
    drag.ghost.style.top=event.clientY+'px';
   };
   function finish(event){
    if(drag?.id!==event.pointerId)return;
    drag.ghost?.remove();
    drag=null;
    if(event.type!=='pointerup'||!dragged)return;
    const pad=document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-station]');
    if(pad&&bench.contains(pad))place(tool,pad.dataset.station);
   }
   tile.onpointerup=tile.onpointercancel=tile.onlostpointercapture=finish;
   rack.append(tile);
  });

  specimen.control.onchange=()=>{
   selected=null;
   step=0;
   resultView.hidden=true;
   status.textContent=state.notes[Number(specimen.control.value)]?'Notebook observation on file.':'';
   showProgress();
  };
  showProgress();
  content.replaceChildren(specimen.wrapper,rack,instruction,bench,resultView,inventoryList);
 }

 function fusion(){
  title.textContent='Cell Fusion';
  const available=alienTypes.flatMap((type,index)=>state.cells[index]?[[type.name,index]]:[]);
  const summary=inventory();
  if(available.length<2){
   content.replaceChildren('Extract cell vials from two different species at Advanced Study.',summary);
   return;
  }
  const first=select('First vial',available);
  const second=select('Second vial',available);
  second.control.selectedIndex=1;
  const combine=button('Combine cells',()=>{
   const hybrid=combineCells(state,Number(first.control.value),Number(second.control.value));
   if(!hybrid){
    status.textContent='Choose vials from two different species.';
    return;
   }
   save('reward');
   fusion();
   status.textContent=hybrid.name+' created! Find it in the alien display.';
  });
  content.replaceChildren(first.wrapper,second.wrapper,combine,summary);
 }

 function gallery(){
  title.textContent='Alien Display';
  const list=document.createElement('ul');
  [...alienTypes,...hybridTypes].forEach((type,index)=>{
   const count=[...state.aliens,...state.hybrids][index];
   if(!count)return;
   const row=document.createElement('li');
   row.textContent=type.name+' × '+count;
   list.append(row);
  });
  content.replaceChildren(list.children.length?list:'Capture or create aliens to fill the display.');
 }

 return station=>{
  status.textContent='';
  if(station==='advancedStudy')advancedStudy();
  else if(station==='cellFusion')fusion();
  else gallery();
  dialog.showModal();
 };
}
