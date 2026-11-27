const DogSounds = (() => {
  let ctx = null;
  // Sounds are turned off for this game.
  const muted = true;
  localStorage.setItem("petMuted", "1");
  let species = "corgi";

  function ensure() {
    return null;
  }

  function unlock() {
    // No audio.
  }

  function isMuted() {
    return true;
  }

  function setMuted() {
    localStorage.setItem("petMuted", "1");
  }

  function setSpecies(id) {
    species = PETS_VOICES[id] ? id : "corgi";
  }

  function getSpecies() {
    return species;
  }

  function noiseBuffer(audio, seconds) {
    const count = Math.floor(audio.sampleRate * seconds);
    const buffer = audio.createBuffer(1, count, audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < count; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  function playTone(audio, { type, startFreq, endFreq, start, duration, volume }) {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(endFreq, 40), start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(audio.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  function playNoise(audio, { start, duration, volume, freq, q, type = "bandpass" }) {
    const src = audio.createBufferSource();
    const filter = audio.createBiquadFilter();
    const gain = audio.createGain();
    src.buffer = noiseBuffer(audio, Math.max(duration, 0.08));
    filter.type = type;
    filter.frequency.setValueAtTime(freq, start);
    filter.Q.value = q;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    src.connect(filter).connect(gain).connect(audio.destination);
    src.start(start);
    src.stop(start + duration + 0.02);
  }

  const PETS_VOICES = {
    corgi: {
      bark(opts = {}) {
        const {
          startFreq = 430,
          endFreq = 150,
          duration = 0.16,
          volume = 0.28,
          delay = 0,
        } = opts;
        if (muted) return;
        const audio = ensure();
        if (!audio) return;
        const start = audio.currentTime + 0.01 + delay;
        playTone(audio, {
          type: "square",
          startFreq,
          endFreq,
          start,
          duration,
          volume,
        });
        playNoise(audio, {
          start,
          duration: duration * 0.55,
          volume: volume * 0.5,
          freq: startFreq * 1.7,
          q: 1.3,
        });
      },
      happy() {
        this.bark({ startFreq: 620, endFreq: 260, duration: 0.11, volume: 0.26 });
        this.bark({ startFreq: 740, endFreq: 300, duration: 0.1, volume: 0.22, delay: 0.12 });
      },
      pet() {
        this.bark({ startFreq: 560, endFreq: 240, duration: 0.12, volume: 0.24 });
      },
      eat() {
        if (muted) return;
        const audio = ensure();
        if (!audio) return;
        const start = audio.currentTime + 0.01;
        playNoise(audio, { start, duration: 0.05, volume: 0.22, freq: 1800, q: 0.8 });
        playNoise(audio, { start: start + 0.06, duration: 0.05, volume: 0.18, freq: 1400, q: 0.8 });
        this.bark({ startFreq: 380, endFreq: 140, duration: 0.14, volume: 0.22, delay: 0.12 });
      },
      play() {
        this.bark({ startFreq: 500, endFreq: 180, duration: 0.12, volume: 0.26 });
        this.bark({ startFreq: 680, endFreq: 250, duration: 0.1, volume: 0.22, delay: 0.14 });
        this.bark({ startFreq: 420, endFreq: 150, duration: 0.16, volume: 0.2, delay: 0.3 });
      },
      walk() {
        if (muted) return;
        const audio = ensure();
        if (!audio) return;
        const start = audio.currentTime + 0.01;
        playNoise(audio, { start, duration: 0.08, volume: 0.14, freq: 700, q: 0.7 });
        playNoise(audio, { start: start + 0.1, duration: 0.08, volume: 0.12, freq: 650, q: 0.7 });
        this.bark({ startFreq: 400, endFreq: 150, duration: 0.15, volume: 0.24, delay: 0.2 });
      },
      sleep() {
        if (muted) return;
        const audio = ensure();
        if (!audio) return;
        const start = audio.currentTime + 0.01;
        playNoise(audio, { start, duration: 0.28, volume: 0.1, freq: 220, q: 0.6 });
        playTone(audio, {
          type: "sine",
          startFreq: 180,
          endFreq: 90,
          start: start + 0.05,
          duration: 0.32,
          volume: 0.08,
        });
        playNoise(audio, { start: start + 0.42, duration: 0.22, volume: 0.08, freq: 180, q: 0.6 });
      },
      whimper() {
        if (muted) return;
        const audio = ensure();
        if (!audio) return;
        const start = audio.currentTime + 0.01;
        playTone(audio, {
          type: "sine",
          startFreq: 720,
          endFreq: 380,
          start,
          duration: 0.28,
          volume: 0.12,
        });
      },
    },

    kitten: {
      meow({ startFreq = 980, endFreq = 620, duration = 0.22, volume = 0.2, delay = 0 } = {}) {
        if (muted) return;
        const audio = ensure();
        if (!audio) return;
        const start = audio.currentTime + 0.01 + delay;
        playTone(audio, {
          type: "triangle",
          startFreq,
          endFreq,
          start,
          duration,
          volume,
        });
        playTone(audio, {
          type: "sine",
          startFreq: startFreq * 1.5,
          endFreq: endFreq * 1.2,
          start,
          duration: duration * 0.8,
          volume: volume * 0.35,
        });
      },
      bark(opts) {
        this.meow(opts);
      },
      happy() {
        this.meow({ startFreq: 1100, endFreq: 760, duration: 0.14, volume: 0.18 });
        this.meow({ startFreq: 1280, endFreq: 840, duration: 0.12, volume: 0.16, delay: 0.13 });
      },
      pet() {
        if (muted) return;
        const audio = ensure();
        if (!audio) return;
        const start = audio.currentTime + 0.01;
        // Soft purr
        for (let i = 0; i < 5; i += 1) {
          playTone(audio, {
            type: "sine",
            startFreq: 55 + i * 2,
            endFreq: 50 + i * 2,
            start: start + i * 0.07,
            duration: 0.1,
            volume: 0.08,
          });
        }
        this.meow({ startFreq: 900, endFreq: 700, duration: 0.16, volume: 0.14, delay: 0.2 });
      },
      eat() {
        if (muted) return;
        const audio = ensure();
        if (!audio) return;
        const start = audio.currentTime + 0.01;
        playNoise(audio, { start, duration: 0.04, volume: 0.14, freq: 2400, q: 1 });
        playNoise(audio, { start: start + 0.05, duration: 0.04, volume: 0.12, freq: 2000, q: 1 });
        this.meow({ startFreq: 860, endFreq: 560, duration: 0.16, volume: 0.16, delay: 0.12 });
      },
      play() {
        this.meow({ startFreq: 1200, endFreq: 700, duration: 0.12, volume: 0.18 });
        this.meow({ startFreq: 1400, endFreq: 900, duration: 0.1, volume: 0.15, delay: 0.12 });
        this.meow({ startFreq: 1000, endFreq: 650, duration: 0.14, volume: 0.14, delay: 0.26 });
      },
      walk() {
        if (muted) return;
        const audio = ensure();
        if (!audio) return;
        const start = audio.currentTime + 0.01;
        playNoise(audio, { start, duration: 0.05, volume: 0.08, freq: 900, q: 0.8 });
        playNoise(audio, { start: start + 0.09, duration: 0.05, volume: 0.07, freq: 850, q: 0.8 });
        this.meow({ startFreq: 880, endFreq: 600, duration: 0.14, volume: 0.14, delay: 0.16 });
      },
      sleep() {
        if (muted) return;
        const audio = ensure();
        if (!audio) return;
        const start = audio.currentTime + 0.01;
        for (let i = 0; i < 6; i += 1) {
          playTone(audio, {
            type: "sine",
            startFreq: 48,
            endFreq: 42,
            start: start + i * 0.12,
            duration: 0.14,
            volume: 0.07,
          });
        }
      },
      whimper() {
        this.meow({ startFreq: 1300, endFreq: 900, duration: 0.3, volume: 0.12 });
      },
    },

    duck: {
      quack({ startFreq = 320, endFreq = 180, duration = 0.12, volume = 0.26, delay = 0 } = {}) {
        if (muted) return;
        const audio = ensure();
        if (!audio) return;
        const start = audio.currentTime + 0.01 + delay;
        playTone(audio, {
          type: "sawtooth",
          startFreq,
          endFreq,
          start,
          duration,
          volume: volume * 0.7,
        });
        playNoise(audio, {
          start,
          duration: duration * 0.9,
          volume: volume * 0.55,
          freq: startFreq * 1.4,
          q: 2.2,
        });
      },
      bark(opts) {
        this.quack(opts);
      },
      happy() {
        this.quack({ startFreq: 360, endFreq: 200, duration: 0.1, volume: 0.24 });
        this.quack({ startFreq: 400, endFreq: 220, duration: 0.1, volume: 0.22, delay: 0.11 });
      },
      pet() {
        this.quack({ startFreq: 300, endFreq: 170, duration: 0.13, volume: 0.22 });
      },
      eat() {
        if (muted) return;
        const audio = ensure();
        if (!audio) return;
        const start = audio.currentTime + 0.01;
        playNoise(audio, { start, duration: 0.05, volume: 0.16, freq: 1200, q: 0.9 });
        playNoise(audio, { start: start + 0.06, duration: 0.05, volume: 0.14, freq: 1000, q: 0.9 });
        this.quack({ startFreq: 280, endFreq: 160, duration: 0.12, volume: 0.2, delay: 0.12 });
      },
      play() {
        this.quack({ startFreq: 340, endFreq: 180, duration: 0.1, volume: 0.24 });
        this.quack({ startFreq: 390, endFreq: 210, duration: 0.1, volume: 0.22, delay: 0.12 });
        this.quack({ startFreq: 300, endFreq: 150, duration: 0.14, volume: 0.2, delay: 0.26 });
      },
      walk() {
        if (muted) return;
        const audio = ensure();
        if (!audio) return;
        const start = audio.currentTime + 0.01;
        playNoise(audio, { start, duration: 0.06, volume: 0.1, freq: 500, q: 0.7 });
        playNoise(audio, { start: start + 0.1, duration: 0.06, volume: 0.09, freq: 480, q: 0.7 });
        this.quack({ startFreq: 310, endFreq: 170, duration: 0.12, volume: 0.2, delay: 0.18 });
      },
      sleep() {
        if (muted) return;
        const audio = ensure();
        if (!audio) return;
        const start = audio.currentTime + 0.01;
        playTone(audio, {
          type: "sine",
          startFreq: 160,
          endFreq: 90,
          start,
          duration: 0.35,
          volume: 0.08,
        });
        playTone(audio, {
          type: "sine",
          startFreq: 140,
          endFreq: 80,
          start: start + 0.4,
          duration: 0.3,
          volume: 0.06,
        });
      },
      whimper() {
        this.quack({ startFreq: 260, endFreq: 140, duration: 0.22, volume: 0.16 });
      },
    },

    totoro: {
      rumble({ startFreq = 120, endFreq = 70, duration = 0.35, volume = 0.18, delay = 0 } = {}) {
        if (muted) return;
        const audio = ensure();
        if (!audio) return;
        const start = audio.currentTime + 0.01 + delay;
        playTone(audio, {
          type: "sine",
          startFreq,
          endFreq,
          start,
          duration,
          volume,
        });
        playTone(audio, {
          type: "triangle",
          startFreq: startFreq * 1.5,
          endFreq: endFreq * 1.4,
          start,
          duration: duration * 0.85,
          volume: volume * 0.4,
        });
        playNoise(audio, {
          start,
          duration: duration * 0.6,
          volume: volume * 0.25,
          freq: 180,
          q: 0.5,
          type: "lowpass",
        });
      },
      bark(opts) {
        this.rumble(opts);
      },
      happy() {
        if (muted) return;
        const audio = ensure();
        if (!audio) return;
        const start = audio.currentTime + 0.01;
        // Soft magical chimes
        [523, 659, 784].forEach((freq, i) => {
          playTone(audio, {
            type: "sine",
            startFreq: freq,
            endFreq: freq * 0.95,
            start: start + i * 0.12,
            duration: 0.28,
            volume: 0.1,
          });
        });
        this.rumble({ startFreq: 140, endFreq: 90, duration: 0.3, volume: 0.12, delay: 0.2 });
      },
      pet() {
        this.rumble({ startFreq: 150, endFreq: 95, duration: 0.28, volume: 0.14 });
      },
      eat() {
        if (muted) return;
        const audio = ensure();
        if (!audio) return;
        const start = audio.currentTime + 0.01;
        playNoise(audio, { start, duration: 0.06, volume: 0.12, freq: 900, q: 0.7 });
        playNoise(audio, { start: start + 0.07, duration: 0.06, volume: 0.1, freq: 700, q: 0.7 });
        this.rumble({ startFreq: 130, endFreq: 80, duration: 0.28, volume: 0.14, delay: 0.14 });
      },
      play() {
        if (muted) return;
        const audio = ensure();
        if (!audio) return;
        const start = audio.currentTime + 0.01;
        [392, 494, 587, 698].forEach((freq, i) => {
          playTone(audio, {
            type: "triangle",
            startFreq: freq,
            endFreq: freq * 0.9,
            start: start + i * 0.1,
            duration: 0.18,
            volume: 0.1,
          });
        });
        this.rumble({ startFreq: 160, endFreq: 100, duration: 0.25, volume: 0.12, delay: 0.35 });
      },
      walk() {
        if (muted) return;
        const audio = ensure();
        if (!audio) return;
        const start = audio.currentTime + 0.01;
        playNoise(audio, {
          start,
          duration: 0.12,
          volume: 0.1,
          freq: 140,
          q: 0.4,
          type: "lowpass",
        });
        playNoise(audio, {
          start: start + 0.16,
          duration: 0.12,
          volume: 0.09,
          freq: 120,
          q: 0.4,
          type: "lowpass",
        });
        this.rumble({ startFreq: 110, endFreq: 75, duration: 0.25, volume: 0.12, delay: 0.22 });
      },
      sleep() {
        if (muted) return;
        const audio = ensure();
        if (!audio) return;
        const start = audio.currentTime + 0.01;
        playTone(audio, {
          type: "sine",
          startFreq: 90,
          endFreq: 55,
          start,
          duration: 0.5,
          volume: 0.09,
        });
        playTone(audio, {
          type: "sine",
          startFreq: 80,
          endFreq: 50,
          start: start + 0.55,
          duration: 0.45,
          volume: 0.07,
        });
      },
      whimper() {
        if (muted) return;
        const audio = ensure();
        if (!audio) return;
        const start = audio.currentTime + 0.01;
        playTone(audio, {
          type: "sine",
          startFreq: 280,
          endFreq: 140,
          start,
          duration: 0.35,
          volume: 0.1,
        });
      },
    },
  };

  function voice() {
    return PETS_VOICES[species] || PETS_VOICES.corgi;
  }

  function bark(opts) {
    voice().bark(opts);
  }

  function happy() {
    voice().happy();
  }

  function pet() {
    voice().pet();
  }

  function eat() {
    voice().eat();
  }

  function play() {
    voice().play();
  }

  function walk() {
    voice().walk();
  }

  function sleep() {
    voice().sleep();
  }

  function whimper() {
    voice().whimper();
  }

  return {
    unlock,
    isMuted,
    setMuted,
    setSpecies,
    getSpecies,
    happy,
    pet,
    eat,
    play,
    walk,
    sleep,
    whimper,
    bark,
  };
})();
