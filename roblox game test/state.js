export const materials=[{name:'PLA',color:0xffca55,value:65},{name:'TPU',color:0xb18aff,value:85},{name:'Metal',color:0xadb8c3,value:150},{name:'PETG',color:0x48d8c5,value:80},{name:'PETG-CF',color:0x387c9b,value:120},{name:'PLA-CF',color:0x526078,value:110},{name:'TPU-CF',color:0x975b91,value:130}];
export function newState(){return {money:1000,claimed:false,conveyor:false,bag:materials.map(()=>0),studied:materials.map(()=>false)};}
export function validState(s){return s&&Number.isSafeInteger(s.money)&&s.money>=0&&typeof s.claimed==='boolean'&&typeof s.conveyor==='boolean'&&(!s.conveyor||s.claimed)&&Array.isArray(s.bag)&&s.bag.length===7&&s.bag.every(n=>Number.isInteger(n)&&n>=0)&&s.bag.reduce((a,b)=>a+b,0)<=8&&(s.studied===undefined||Array.isArray(s.studied)&&s.studied.length===7&&s.studied.every(v=>typeof v==='boolean'));}
export function materialValue(s,i){return Math.round(materials[i].value*(s.studied?.[i]?1.5:1));}
export function act(s,action,index){
 if(action==='claim'&&!s.claimed){s.claimed=true;return 'Factory claimed! Follow the arrow to buy your conveyor.';}
 if(action==='buy'&&s.claimed&&!s.conveyor&&s.money>=500){s.money-=500;s.conveyor=true;return 'Conveyor purchased! Go outside to collect materials.';}
 if(action==='collect'&&s.conveyor&&Number.isInteger(index)&&materials[index]&&s.bag.reduce((a,b)=>a+b,0)<8){s.bag[index]++;return materials[index].name+' collected. Bring it to the funnel, or gather more.';}
 if(action==='study'&&s.claimed&&Number.isInteger(index)&&materials[index]&&s.bag[index]>0&&!s.studied?.[index]){s.studied??=materials.map(()=>false);s.bag[index]--;s.studied[index]=true;return materials[index].name+' studied! Each spool now sells for $'+materialValue(s,index)+'.';}
 if(action==='deposit'&&s.conveyor&&s.bag.some(n=>n)){const cargo=s.bag.slice();const payout=cargo.reduce((sum,n,i)=>sum+n*materialValue(s,i),0);s.bag.fill(0);return {cargo,payout};}
 return null;
}
