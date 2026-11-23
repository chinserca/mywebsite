import * as THREE from 'three';

// DJI silhouettes follow product photos. Fictional models use real drone classes.
const designs={
 'DJI Avata 2':{body:[.38,.22,.77],span:.76,reach:.67,blade:.48,duct:.14,color:0x65696b,camera:'fpv'},
 'DJI Mini 4K':{body:[.31,.18,.63],span:.91,reach:.72,blade:.51,color:0xd4d4cf,camera:'single'},
 'DJI Air 3':{body:[.39,.23,.76],span:1.03,reach:.84,blade:.61,color:0x9b9e9c,camera:'dual'},
 'DJI Mavic 3 Pro':{body:[.44,.25,.86],span:1.14,reach:.92,blade:.65,color:0x777c7e,camera:'triple'},
 'DJI Neo':{body:[.29,.13,.52],span:.53,reach:.49,blade:.37,duct:.09,color:0xd6d8d5,camera:'neo'},
 'FPV Racer':{body:[.23,.09,.48],span:.82,reach:.78,blade:.58,color:0x292d31,camera:'fpv',frame:true,accent:0xf05f36},
 'Surveyor':{body:[.47,.22,.6],span:1.2,reach:1.02,blade:.68,color:0xdcae48,camera:'survey',gear:true},
 'Micro Whoop':{body:[.19,.15,.28],span:.37,reach:.36,blade:.25,duct:.12,color:0x9c7cda,camera:'fpv',frame:true},
 'Sky Courier':{body:[.51,.25,.67],span:1.25,reach:1.02,blade:.72,color:0x3e6563,camera:'single',gear:true,cargo:true},
 'Cinewhoop':{body:[.27,.12,.48],span:.68,reach:.63,blade:.43,duct:.2,color:0x394b61,camera:'fpv',frame:true,actionCamera:true},
 'Horizon Explorer':{body:[.39,.24,.69],span:1.03,reach:.82,blade:.61,color:0xd7d1bf,camera:'dual',sensor:true},
 'Long Range FPV':{body:[.25,.1,.65],span:1.06,reach:1.04,blade:.75,color:0x343a3f,camera:'fpv',frame:true,antenna:true}
};

export function buildDrone(config,{group,mesh,box,rotors,remote}){
 const name=config.modelName??config.name.replace(/ Custom$/,'');
 const design=designs[name]??designs['DJI Mini 4K'];
 const [width,height,length]=design.body;
 const color=name==='Workshop Drone'?config.paint:design.color;
 const guarded=!!config.bladeGuards;
 const shell=mesh(new THREE.SphereGeometry(1,36,22),color,0,0,0,group);
 shell.scale.set(width,height,length);
 shell.material.roughness=.48;
 if(design.frame){
  shell.visible=false;
  box(width*2,.07,length*2,0x25292c,0,-.03,0,group);
  const canopy=mesh(new THREE.SphereGeometry(1,24,16),color,0,.08,-length*.62,group);
  canopy.scale.set(width,.16,length*.44);
 }
 const battery=box(width*1.55,design.frame?.19:.07,length,design.frame?0x313437:color,0,height*.77,.12,group);
 if(design.frame){
  box(width*1.65,.025,.1,design.accent??0x646a71,0,battery.position.y+.11,.1,group);
 }
 for(let i=0;i<4;i++)box(.028,.012,.035,0x78bc8d,(i-1.5)*.045,height+.016,.27,group);
 for(const sign of [-1,1]){
  for(let vent=0;vent<5;vent++)box(.012,.028,.035,0x343b40,sign*width*.94,-.005,.04+vent*.065,group);
  if(design.gear){
   box(.065,.6,.065,0x30373d,sign*.49,-.36,.16,group);
   box(.08,.06,1.35,0x222c34,sign*.49,-.65,.1,group);
  }
  for(const direction of [-1,1]){
   const x=sign*design.span*(direction<0?1: .88),z=direction*design.reach;
   const rootX=sign*width*.7,rootZ=direction*length*.5;
   const arm=box(Math.hypot(x-rootX,z-rootZ),design.frame?.075:.115,design.frame?.12:.16,design.frame?0x252b30:color,(x+rootX)/2,0,(z+rootZ)/2,group);
   arm.rotation.y=-Math.atan2(z-rootZ,x-rootX);
   mesh(new THREE.CylinderGeometry(.105,.105,.12,20),0x53595e,rootX,0,rootZ,group);
   mesh(new THREE.CylinderGeometry(.12,.105,.16,24),config.motorBoost?0xb28a53:0x363c40,x,.055,z,group);
   if(!guarded&&direction<0)box(.06,.28,.06,color,x,-.16,z,group);
   const rotor=new THREE.Group();
   rotor.position.set(x,.15,z);
   rotor.userData.propeller=true;
   group.add(rotor);
   const bladeCount=design.frame||guarded?3:2;
   for(let i=0;i<bladeCount;i++){
    const angle=i*Math.PI*2/bladeCount;
    const blade=mesh(new THREE.SphereGeometry(1,14,8),0x242a2e,Math.cos(angle)*design.blade*.5,0,Math.sin(angle)*design.blade*.5,rotor);
    blade.scale.set(design.blade*.53,.012,.045);
    blade.rotation.y=-angle+.15;
    if(!design.frame&&!guarded){
     const tip=box(.065,.018,.06,0xc88c54,Math.cos(angle)*design.blade*.94,0,Math.sin(angle)*design.blade*.94,rotor);
     tip.rotation.y=-angle;
    }
   }
   mesh(new THREE.SphereGeometry(.07,12,8),0x62686c,0,.016,0,rotor).scale.y=.4;
   if(!remote)rotors.push(rotor);
   if(guarded){
    const radius=design.blade+.045;
    const duct=mesh(new THREE.CylinderGeometry(radius,radius,design.duct??.12,40,1,true),color,x,.09,z,group);
    duct.material.side=THREE.DoubleSide;
    mesh(new THREE.TorusGeometry(radius,.025,8,40),color,x,.16,z,group).rotation.x=-Math.PI/2;
   }
   const light=box(.05,.035,.08,direction<0?0xc45950:0x5ed397,x,-.025,z+.12,group);
   light.material.emissive.copy(light.material.color);
  }
 }
 const cameraZ=-length-.07;
 const cameraY=design.camera==='fpv'||design.camera==='neo'?0:-height-.08;
 const cameraWidth=design.camera==='triple'?.43:design.camera==='dual'?.28:.25;
 const cameraHeight=design.camera==='dual'?.4:design.camera==='triple'?.33:.23;
 box(cameraWidth,cameraHeight,.22,0x262c32,0,cameraY,cameraZ,group);
 if(design.camera!=='fpv'&&design.camera!=='neo'){
  for(const sign of [-1,1])box(.045,.23,.12,color,sign*(cameraWidth/2+.035),cameraY+.08,cameraZ+.045,group);
 }
 let lenses=[[0,0,.08]];
 if(design.camera==='dual')lenses=[[0,.095,.074],[0,-.095,.074]];
 if(design.camera==='triple')lenses=[[-.09,-.035,.095],[.105,.075,.061],[.105,-.085,.053]];
 for(const [x,y,radius] of lenses){
  const rim=mesh(new THREE.CylinderGeometry(radius*1.2,radius*1.2,.035,28),0x11171b,x,cameraY+y,cameraZ-.13,group);
  rim.rotation.x=Math.PI/2;
  const lens=mesh(new THREE.CylinderGeometry(radius,radius,.025,28),0x325766,x,cameraY+y,cameraZ-.153,group);
  lens.rotation.x=Math.PI/2;
  lens.material.roughness=.08;
  lens.material.metalness=.6;
 }
 if(['dual','triple'].includes(design.camera)||design.sensor){
  for(const sign of [-1,1])mesh(new THREE.SphereGeometry(.065,16,10),0x182127,sign*width*.68,height*.3,-length*.83,group);
 }
 if(design.actionCamera){
  box(.34,.29,.19,0x20272e,0,.31,-.28,group);
  mesh(new THREE.SphereGeometry(.09,16,10),0x253f50,.07,.32,-.39,group);
 }
 if(design.antenna||design.frame){
  for(const sign of [-1,1]){
   const antenna=box(.025,.32,.025,0x353b41,sign*.17,.18,length*.9,group);
   antenna.rotation.z=sign*.32;
  }
 }
 if(design.camera==='survey'){
  mesh(new THREE.SphereGeometry(.17,20,14),0x263641,0,-.4,-.2,group);
  mesh(new THREE.CylinderGeometry(.15,.15,.045,20),0xc6cbd0,0,.3,.25,group);
 }
 if(design.cargo){
  box(.72,.43,.75,0xa6a9a3,0,-.47,.12,group);
  box(.76,.04,.1,0x333d43,0,-.47,.12,group);
 }
 if(config.reinforced)box(width*2.12,.06,length*1.25,0x505a63,0,-height,.1,group);
 if(design.gear){
  for(const part of group.children)part.position.y+=.3;
 }
}
