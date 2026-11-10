import {alienTypes,hybridTypes,combineCells} from './state.js?v=genetics';

const tools = [
 {name:'Notebook',steps:['Record observation']},
 {name:'Cell Extractor',steps:['Sterilize extractor','Take cell sample','Seal sample vial']},
 {name:'Compound Microscope',steps:['Place slide','Adjust focus','Examine cells']},
 {name:'Cell Scanner',steps:['Scan cell signature']}
];

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
  const tool=select('Tool',tools.map(({name},index)=>[name,index]));
  const inventoryList=inventory();
  let step=0;
  const action=button('',()=>{
   const index=Number(specimen.control.value);
   if(!state.aliens[index])return;
   const toolIndex=Number(tool.control.value);
   const {steps}=tools[toolIndex];
   step++;
   if(step<steps.length){
    status.textContent='Step complete. Next: '+steps[step]+'.';
    action.textContent=steps[step];
    return;
   }
   const name=alienTypes[index].name;
   if(toolIndex===0){
    state.notes[index]=true;
    status.textContent='Observation saved for '+name+'.';
    save('pickup');
   }else if(toolIndex===1){
    state.cells[index]++;
    status.textContent='Added one '+name+' cell vial to your inventory.';
    inventoryList.replaceChildren(...inventory().children);
    save('pickup');
   }else if(toolIndex===2){
    status.textContent=name+' cells are active and suitable for fusion.';
   }else{
    const matches=hybridTypes.filter(type=>type.parents.includes(index)).map(type=>type.name);
    status.textContent='Possible hybrids: '+matches.join(', ')+'.';
   }
   step=0;
   action.textContent=steps[0];
  });
  function reset(){
   step=0;
   action.textContent=tools[Number(tool.control.value)].steps[0];
   status.textContent=state.notes[Number(specimen.control.value)]?'Notebook observation on file.':'';
  }
  specimen.control.onchange=tool.control.onchange=reset;
  reset();
  content.replaceChildren(specimen.wrapper,tool.wrapper,action,inventoryList);
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
