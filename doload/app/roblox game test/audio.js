const cues = {
 pickup: {notes:[620,880],type:'sine',step:.065,length:.11},
 purchase: {notes:[392,494,587],type:'triangle',step:.085,length:.2},
 reward: {notes:[523,659,784,1047],type:'triangle',step:.09,length:.28},
 launch: {notes:[58],end:320,type:'sawtooth',length:.85,volume:.05},
 stun: {notes:[720],end:105,type:'triangle',length:.36},
 hit: {notes:[130],end:55,type:'triangle',length:.19},
 roll: {notes:[294,392,587,784],type:'sine',step:.075,length:.22},
 teleport: {notes:[220,440,880],type:'sine',step:.08,length:.2}
};

export function setupGameAudio({button,music,help,pause}){
 let enabled=false;
 let context;
 let output;
 function refresh(){
  const audible=enabled&&!document.hidden&&!help.open&&!pause.open;
  if(output)output.gain.setTargetAtTime(audible?1:0,context.currentTime,.025);
  if(audible){
   if(music.paused)music.play().catch(()=>{});
  }else music.pause();
 }
 music.volume=.3;
 button.onclick=()=>{
  enabled=!enabled;
  button.setAttribute('aria-pressed',String(enabled));
  button.textContent=enabled?'Sound: On':'Sound: Off';
  if(enabled){
   const AudioEngine=window.AudioContext||window.webkitAudioContext;
   if(!context&&AudioEngine){
    try{
     context=new AudioEngine();
     output=context.createGain();
     output.connect(context.destination);
    }catch{}
   }
   context?.resume().catch(()=>{});
  }
  refresh();
 };
 for(const dialog of [help,pause]){
  new MutationObserver(refresh).observe(dialog,{attributes:true,attributeFilter:['open']});
 }
 document.addEventListener('visibilitychange',refresh);
 return name=>{
  if(!enabled||document.hidden||help.open||pause.open||context?.state!=='running'||!output)return;
  const cue=cues[name];
  for(const [index,note] of cue.notes.entries()){
   const oscillator=context.createOscillator();
   const envelope=context.createGain();
   const start=context.currentTime+index*(cue.step??0);
   const end=start+cue.length;
   oscillator.type=cue.type;
   oscillator.frequency.setValueAtTime(note,start);
   if(cue.end)oscillator.frequency.exponentialRampToValueAtTime(cue.end,end);
   envelope.gain.setValueAtTime(.001,start);
   envelope.gain.exponentialRampToValueAtTime(cue.volume??.11,start+.015);
   envelope.gain.exponentialRampToValueAtTime(.001,end);
   oscillator.connect(envelope).connect(output);
   oscillator.start(start);
   oscillator.stop(end);
  }
 };
}
