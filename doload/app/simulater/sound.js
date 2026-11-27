export function setupSound(button){
  let context, master, motor, harmonics, motorGain, air, airGain, noise, enabled=false;

  function initialize(){
    context=new AudioContext();
    master=context.createGain();
    master.gain.value=0;
    master.connect(context.destination);
    motorGain=context.createGain();
    motorGain.gain.value=0;
    motorGain.connect(master);
    const mix=context.createGain();
    mix.gain.value=.22;
    motor=context.createOscillator();
    motor.type='triangle';
    motor.connect(motorGain);
    harmonics=context.createOscillator();
    harmonics.type='sawtooth';
    harmonics.connect(mix).connect(motorGain);
    motor.start();
    harmonics.start();

    noise=context.createBuffer(1,context.sampleRate*2,context.sampleRate);
    const samples=noise.getChannelData(0);
    for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1;
    const airflow=context.createBufferSource();
    airflow.buffer=noise;
    airflow.loop=true;
    air=context.createBiquadFilter();
    air.type='lowpass';
    airGain=context.createGain();
    airGain.gain.value=0;
    airflow.connect(air).connect(airGain).connect(master);
    airflow.start();
  }

  function updateVolume(){
    if(context)master.gain.setTargetAtTime(enabled&&!document.hidden?.42:0,context.currentTime,.025);
  }
  button.onclick=async()=>{
    if(!enabled){
      button.disabled=true;
      try{
        if(!context)initialize();
        await context.resume();
      }catch{
        button.textContent='Sound unavailable';
        return;
      }finally{button.disabled=false;}
    }
    enabled=!enabled;
    button.setAttribute('aria-pressed',String(enabled));
    button.textContent=enabled?'Sound: On':'Sound: Off';
    updateVolume();
  };
  document.addEventListener('visibilitychange',updateVolume);

  return {
    update(vehicle,speed,climb,wind,throttle,thrust,running,firstPerson){
      if(!enabled)return;
      const now=context.currentTime;
      const drone=vehicle?.kind==='drone';
      const electric=vehicle?.thrusters;
      const load=Math.min(1,speed/(vehicle?.speed||1));
      const pitch=drone?(vehicle.fpv?145:108)+load*90+Math.max(0,climb)*4
        :electric?85+load*260+thrust*30:36+load*78+throttle*17;
      motor.frequency.setTargetAtTime(pitch,now,.08);
      harmonics.frequency.setTargetAtTime(pitch*(drone?4:electric?3:2),now,.08);
      const drive=drone?.045+load*.04:electric?.008+load*.028+thrust*.012:.033+load*.047+throttle*.015;
      motorGain.gain.setTargetAtTime(running?drive*(firstPerson?1.25:1):0,now,.08);
      air.frequency.setTargetAtTime(240+speed*19+thrust*350,now,.1);
      airGain.gain.setTargetAtTime(vehicle?Math.min(.22,speed*.003+wind*.006+thrust*.055):0,now,.1);
    },
    impact(amount){
      if(!enabled||document.hidden)return;
      const now=context.currentTime;
      const hit=context.createBufferSource();
      hit.buffer=noise;
      const filter=context.createBiquadFilter();
      filter.type='lowpass';
      filter.frequency.setValueAtTime(420+Math.min(1600,amount*24),now);
      filter.frequency.exponentialRampToValueAtTime(90,now+.23);
      const gain=context.createGain();
      gain.gain.setValueAtTime(Math.min(.75,.12+amount*.012),now);
      gain.gain.exponentialRampToValueAtTime(.001,now+.28);
      hit.connect(filter).connect(gain).connect(master);
      hit.start(now,Math.random());
      hit.stop(now+.3);
    }
  };
}
