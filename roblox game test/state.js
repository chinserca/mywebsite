export const materials=[{name:'PLA',color:0xffca55,value:65},{name:'TPU',color:0xb18aff,value:85},{name:'Metal',color:0xadb8c3,value:150},{name:'PETG',color:0x48d8c5,value:80},{name:'PETG-CF',color:0x387c9b,value:120},{name:'PLA-CF',color:0x526078,value:110},{name:'TPU-CF',color:0x975b91,value:130}];
export function newState(){return {money:1000,claimed:false,conveyor:false,bag:materials.map(()=>0),studied:materials.map(()=>false),upgrades:{backpack:false,speed:false,processor:false,drone:false,shield:false},rocket:false,net:false,aliens:[0,0,0],alienStudies:[0,0,0],deliveries:0,crystals:[],surveys:[],salvage:false};}
export const alienTypes=[{name:'Jade Hopper',color:0x7bef9f},{name:'Violet Floater',color:0xb795ff},{name:'Solar Sprout',color:0xffbd64}];
export function validSpaceState(s){return (s.salvage===undefined||typeof s.salvage==='boolean')&&(s.surveys===undefined||Array.isArray(s.surveys)&&s.surveys.every(n=>Number.isInteger(n)&&n>=0&&n<5)&&new Set(s.surveys).size===s.surveys.length)&&(s.deliveries===undefined||Number.isSafeInteger(s.deliveries)&&s.deliveries>=0)&&(s.crystals===undefined||Array.isArray(s.crystals)&&s.crystals.every(n=>Number.isInteger(n)&&n>=0&&n<8)&&new Set(s.crystals).size===s.crystals.length)&&(s.upgrades?.shield===undefined||typeof s.upgrades.shield==='boolean')&&(s.upgrades?.drone===undefined||typeof s.upgrades.drone==='boolean')&&(s.rocket===undefined||typeof s.rocket==='boolean')&&(s.net===undefined||typeof s.net==='boolean')&&['aliens','alienStudies'].every(key=>s[key]===undefined||Array.isArray(s[key])&&s[key].length===3&&s[key].every(n=>Number.isSafeInteger(n)&&n>=0))&&(s.aliens===undefined||s.aliens.reduce((a,b)=>a+b,0)<=6);}
export function validState(s){return s&&validSpaceState(s)&&Number.isSafeInteger(s.money)&&s.money>=0&&typeof s.claimed==='boolean'&&typeof s.conveyor==='boolean'&&(!s.conveyor||s.claimed)&&Array.isArray(s.bag)&&s.bag.length===7&&s.bag.every(n=>Number.isInteger(n)&&n>=0)&&s.bag.reduce((a,b)=>a+b,0)<=capacity(s)&&(s.studied===undefined||Array.isArray(s.studied)&&s.studied.length===7&&s.studied.every(v=>typeof v==='boolean'))&&(s.upgrades===undefined||s.upgrades&&['backpack','speed','processor'].every(k=>typeof s.upgrades[k]==='boolean')); }
export const orders=[{name:'School Maker Kit',needs:[3,0,0,0,0,0,0]},{name:'Space Station Parts',needs:[0,0,2,0,1,0,0]},{name:'Flexible Robot Kit',needs:[0,2,0,2,0,0,0]}];
export function orderValue(s,i){return Math.round(orders[i].needs.reduce((sum,n,k)=>sum+n*materialValue(s,k),0)*1.6);}
export const shopItems=[{id:"shield",name:"Field shield",price:650,description:"Reduces alien damage by half."},{id:'drone',name:'BEE-BOT helper drone',price:1500,description:'A floating companion collects nearby materials within 5 steps.'},{id:'backpack',name:'Bigger backpack',price:250,description:'Carry 12 spools instead of 8.'},{id:'speed',name:'Running boots',price:350,description:'Move 25% faster.'},{id:'processor',name:'Conveyor upgrade',price:750,description:'Earn 25% more from every material. Combines with research.'}];
export function capacity(s){return s.upgrades?.backpack?12:8;}
export function materialValue(s,i){return Math.round(materials[i].value*(s.studied?.[i]?1.5:1)*(s.upgrades?.processor?1.25:1));}
export function act(s,action,index){
 if(action==='survey'&&s.conveyor&&Number.isInteger(index)&&index>=0&&index<5&&!s.surveys?.includes(index)){
  s.surveys??=[];
  s.surveys.push(index);
  const reward=index>=3?400:[0,1,2].every(id=>s.surveys.includes(id))?750:250;
  s.money+=reward;
  return 'Outpost surveyed! +$'+reward;
 }
 if(action==='salvage'&&s.conveyor&&!s.salvage){
  s.salvage=true;
  return 'Salvage crate collected. Bring it to the dispatch desk.';
 }
 if(action==='returnSalvage'&&s.salvage){
  s.salvage=false;
  s.money+=450;
  return 'Salvage delivered! +$450';
 }
 if(action==='mine'&&s.conveyor){
  const space=capacity(s)-s.bag.reduce((total,count)=>total+count,0);
  if(space<=0)return null;
  const amount=Math.min(2,space);
  s.bag[2]+=amount;
  return 'Mined '+amount+' metal '+(amount===1?'spool.':'spools.');
 }

 if(action==='crystal'&&Number.isInteger(index)&&index>=0&&index<8&&!s.crystals?.includes(index)){s.crystals??=[];s.crystals.push(index);const bonus=index<5?250:500;s.money+=bonus;return 'Energy crystal discovered! +$'+bonus+' · '+s.crystals.length+'/8 found.';}
 if(action==='deliver'&&s.conveyor&&Number.isInteger(index)&&orders[index]&&orders[index].needs.every((n,i)=>s.bag[i]>=n)){const payout=orderValue(s,index);orders[index].needs.forEach((n,i)=>s.bag[i]-=n);s.money+=payout;s.deliveries=(s.deliveries??0)+1;return orders[index].name+' shipped! +$'+payout+' including a 60% delivery bonus.';}
 if(action==='rocket'&&s.conveyor&&!s.rocket&&s.money>=1000){s.money-=1000;s.rocket=true;return 'Rocket purchased! Ride it to the International Alien Lab.';}
 if(action==='net'&&s.conveyor&&!s.net){s.net=true;return 'Alien net equipped! Approach an alien in the material yard to catch it.';}
 if(action==='catch'&&s.net&&Number.isInteger(index)&&alienTypes[index]&&(s.aliens??[0,0,0]).reduce((a,b)=>a+b,0)<6){s.aliens??=[0,0,0];s.aliens[index]++;return alienTypes[index].name+' safely caught! Study it at the International Alien Lab.';}
 if(action==='alienStudy'&&s.rocket&&Number.isInteger(index)&&alienTypes[index]&&s.aliens?.[index]>0){s.alienStudies??=[0,0,0];s.aliens[index]--;s.alienStudies[index]++;s.money+=1000;return alienTypes[index].name+' studied and released! Research grant: $1,000.';}
 if(action==='upgrade' &&s.conveyor){const item=shopItems.find(item=>item.id===index);if(item&&!s.upgrades?.[index]&&s.money>=item.price&&(index!=='processor'||s.conveyor)){s.upgrades??={backpack:false,speed:false,processor:false,drone:false,shield:false};s.money-=item.price;s.upgrades[index]=true;return item.name+' purchased!';}return null;}
 if(action==='claim'&&!s.claimed){s.claimed=true;return 'Factory claimed! Follow the arrow to buy your conveyor.';}
 if(action==='buy'&&s.claimed&&!s.conveyor&&s.money>=500){s.money-=500;s.conveyor=true;return 'Conveyor purchased! Go outside to collect materials.';}
 if(action==='collect'&&s.conveyor&&Number.isInteger(index)&&materials[index]&&s.bag.reduce((a,b)=>a+b,0)<capacity(s)){s.bag[index]++;return materials[index].name+' collected. Bring it to the funnel, or gather more.';}
 if(action==='study'&&s.claimed&&Number.isInteger(index)&&materials[index]&&s.bag[index]>0&&!s.studied?.[index]){s.studied??=materials.map(()=>false);s.bag[index]--;s.studied[index]=true;return materials[index].name+' studied! Each spool now sells for $'+materialValue(s,index)+'.';}
 if(action==='deposit'&&s.conveyor&&s.bag.some(n=>n)){const cargo=s.bag.slice();const payout=cargo.reduce((sum,n,i)=>sum+n*materialValue(s,i),0);s.bag.fill(0);return {cargo,payout};}
 return null;
}
