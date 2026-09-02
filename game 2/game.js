(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("scoreValue");
  const bestEl = document.getElementById("bestValue");
  const titleScreen = document.getElementById("titleScreen");
  const pauseScreen = document.getElementById("pauseScreen");
  const overScreen = document.getElementById("overScreen");
  const overText = document.getElementById("overText");
  const finalScore = document.getElementById("finalScore");
  const newBest = document.getElementById("newBest");
  const muteBtn = document.getElementById("muteBtn");

  const BEST_KEY = "hamsterDashBest";
  const MUTE_KEY = "hamsterDashMuted";
  const STATE = { TITLE: "title", PLAY: "play", PAUSE: "pause", OVER: "over" };

  const world = {
    state: STATE.TITLE,
    width: 960,
    height: 540,
    ground: 430,
    t: 0,
    score: 0,
    best: Number(localStorage.getItem(BEST_KEY) || 0),
    speed: 4.4,
    spawn: 0,
    seedSpawn: 0,
    scoreAcc: 0,
    hamster: null,
    obstacles: [],
    seeds: [],
    dust: [],
    hills: [],
    muted: localStorage.getItem(MUTE_KEY) === "1",
    audio: null,
    jumpHeld: false,
  };

  bestEl.textContent = String(world.best);
  updateMuteLabel();

  function makeHamster() {
    return {
      x: 150,
      y: world.ground,
      w: 86,
      h: 70,
      vy: 0,
      onGround: true,
      run: 0,
      blink: 0,
      squash: 1,
    };
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function resetPlay() {
    world.state = STATE.PLAY;
    world.t = 0;
    world.score = 0;
    world.scoreAcc = 0;
    world.speed = 4.4;
    world.spawn = 210;
    world.seedSpawn = 40;
    world.grace = 110;
    world.obstacles = [];
    world.seeds = [];
    world.dust = [];
    world.hills = [
      { x: 0, h: 90 },
      { x: 280, h: 130 },
      { x: 560, h: 80 },
      { x: 820, h: 120 },
    ];
    world.hamster = makeHamster();
    scoreEl.textContent = "0";
    newBest.hidden = true;
    showScreen(null);
  }

  function showScreen(which) {
    titleScreen.classList.toggle("is-hidden", which !== "title");
    pauseScreen.classList.toggle("is-hidden", which !== "pause");
    overScreen.classList.toggle("is-hidden", which !== "over");
  }

  function startGame() {
    unlockAudio();
    playTone(520, 340, 0.12, 0.08);
    resetPlay();
  }

  function gameOver() {
    if (world.state !== STATE.PLAY) return;
    world.state = STATE.OVER;
    world.hamster.squash = 0.72;
    playTone(220, 90, 0.28, 0.12);
    finalScore.textContent = String(world.score);
    overText.textContent = "The hamster bumped a toy.";
    if (world.score > world.best) {
      world.best = world.score;
      localStorage.setItem(BEST_KEY, String(world.best));
      bestEl.textContent = String(world.best);
      newBest.hidden = false;
    }
    showScreen("over");
  }

  function pauseGame() {
    if (world.state !== STATE.PLAY) return;
    world.state = STATE.PAUSE;
    showScreen("pause");
  }

  function resumeGame() {
    if (world.state !== STATE.PAUSE) return;
    world.state = STATE.PLAY;
    showScreen(null);
  }

  function jump() {
    const h = world.hamster;
    if (!h || world.state !== STATE.PLAY || !h.onGround) return;
    h.vy = -17.8;
    h.onGround = false;
    h.squash = 1.18;
    playTone(420, 640, 0.1, 0.06);
  }

  function collectSeed(seed) {
    const value = seed.gold ? 50 : 10;
    world.score += value;
    scoreEl.textContent = String(world.score);
    playTone(seed.gold ? 780 : 640, seed.gold ? 980 : 820, 0.08, 0.05);
    for (let i = 0; i < 6; i += 1) {
      world.dust.push({
        x: seed.x,
        y: seed.y,
        vx: rand(-1.4, 1.4),
        vy: rand(-2.2, -0.4),
        life: 18,
        color: seed.gold ? "#f4c430" : "#fff4d1",
      });
    }
  }

  function spawnObstacle() {
    const kind = Math.random();
    let w = 34;
    let h = 34;
    let type = "ball";
    if (kind < 0.28) {
      type = "block";
      w = rand(28, 48);
      h = rand(28, 48);
    } else if (kind < 0.55) {
      type = "sock";
      w = 30;
      h = 44;
    }
    world.obstacles.push({
      type,
      x: world.width + 60,
      y: world.ground,
      w,
      h,
    });
  }

  function spawnSeed() {
    world.seeds.push({
      x: world.width + 20,
      y: world.ground - rand(24, 120),
      r: 12,
      gold: Math.random() < 0.18,
      spin: rand(0, Math.PI),
    });
  }

  function hitBox(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function hamsterBox() {
    const h = world.hamster;
    return {
      x: h.x - h.w * 0.22,
      y: h.y - h.h * 0.72,
      w: h.w * 0.48,
      h: h.h * 0.52,
    };
  }

  function update(dt) {
    if (world.state !== STATE.PLAY) {
      world.t += dt * 0.35;
      return;
    }

    world.t += dt;
    if (world.grace > 0) world.grace -= dt;
    world.speed = Math.min(9.2, 4.4 + world.t * 0.008);
    const h = world.hamster;
    const gravity = world.jumpHeld && h.vy < 0 ? 0.4 : 0.68;

    h.vy += gravity * dt;
    h.y += h.vy * dt;
    h.run += world.speed * 0.09 * dt;
    h.squash += (1 - h.squash) * 0.12 * dt;
    if (h.y >= world.ground) {
      if (!h.onGround) h.squash = 0.82;
      h.y = world.ground;
      h.vy = 0;
      h.onGround = true;
    }

    world.spawn -= dt;
    world.seedSpawn -= dt;
    if (world.spawn <= 0) {
      spawnObstacle();
      world.spawn = rand(130, 210) - world.speed * 2.2;
    }
    if (world.seedSpawn <= 0) {
      spawnSeed();
      world.seedSpawn = rand(28, 58);
    }

    for (const hill of world.hills) {
      hill.x -= world.speed * 0.22 * dt;
      if (hill.x < -320) {
        hill.x = world.width + rand(20, 120);
        hill.h = rand(70, 150);
      }
    }

    for (const obs of world.obstacles) obs.x -= world.speed * dt;
    world.obstacles = world.obstacles.filter((obs) => obs.x + obs.w > -40);

    for (const seed of world.seeds) {
      seed.x -= world.speed * dt;
      seed.spin += 0.08 * dt;
    }
    world.seeds = world.seeds.filter((seed) => seed.x > -30);

    if (h.onGround && Math.random() < 0.35) {
      world.dust.push({
        x: h.x - 28,
        y: world.ground - 4,
        vx: rand(-1.6, -0.4),
        vy: rand(-0.8, -0.1),
        life: 14,
        color: "rgba(255, 244, 220, 0.8)",
      });
    }
    for (const puff of world.dust) {
      puff.x += puff.vx * dt;
      puff.y += puff.vy * dt;
      puff.life -= dt;
    }
    world.dust = world.dust.filter((puff) => puff.life > 0);

    const box = hamsterBox();
    if (world.grace <= 0) {
      for (const obs of world.obstacles) {
        const pad = obs.type === "ball" ? 10 : 8;
        const o = {
          x: obs.x + pad,
          y: obs.y - obs.h + pad,
          w: Math.max(8, obs.w - pad * 2),
          h: Math.max(8, obs.h - pad * 2),
        };
        if (hitBox(box, o)) {
          gameOver();
          return;
        }
      }
    }
    world.seeds = world.seeds.filter((seed) => {
      const s = { x: seed.x - seed.r, y: seed.y - seed.r, w: seed.r * 2, h: seed.r * 2 };
      if (hitBox(box, s)) {
        collectSeed(seed);
        return false;
      }
      return true;
    });

    world.scoreAcc += world.speed * 0.12 * dt;
    if (world.scoreAcc >= 1) {
      const add = Math.floor(world.scoreAcc);
      world.score += add;
      world.scoreAcc -= add;
      scoreEl.textContent = String(world.score);
    }
  }

  function roundRect(x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  function drawBackground() {
    const g = ctx.createLinearGradient(0, 0, 0, world.height);
    g.addColorStop(0, "#8fd3f0");
    g.addColorStop(0.55, "#c8ebf8");
    g.addColorStop(1, "#f6d7a4");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, world.width, world.height);

    ctx.fillStyle = "rgba(255,255,255,0.85)";
    const wrap = world.width + 200;
    const cloudX = (base, speed) => {
      let x = (base - world.t * speed) % wrap;
      if (x < -80) x += wrap;
      return x;
    };
    for (const cloud of [
      { x: cloudX(180, 0.4), y: 70, s: 1 },
      { x: cloudX(520, 0.28), y: 110, s: 0.8 },
      { x: cloudX(860, 0.34), y: 58, s: 1.1 },
    ]) {
      ctx.beginPath();
      ctx.ellipse(cloud.x, cloud.y, 46 * cloud.s, 22 * cloud.s, 0, 0, Math.PI * 2);
      ctx.ellipse(cloud.x + 28, cloud.y + 4, 34 * cloud.s, 18 * cloud.s, 0, 0, Math.PI * 2);
      ctx.ellipse(cloud.x - 26, cloud.y + 6, 28 * cloud.s, 16 * cloud.s, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "#8fbf7a";
    for (const hill of world.hills) {
      ctx.beginPath();
      ctx.ellipse(hill.x, world.ground + 20, 180, hill.h, 0, Math.PI, 0);
      ctx.fill();
    }

    ctx.fillStyle = "#d8a05a";
    ctx.fillRect(0, world.ground, world.width, world.height - world.ground);
    ctx.fillStyle = "#c48a42";
    ctx.fillRect(0, world.ground, world.width, 10);

    ctx.strokeStyle = "rgba(255, 236, 196, 0.5)";
    ctx.lineWidth = 3;
    const shift = (world.t * world.speed) % 36;
    for (let x = -shift; x < world.width; x += 36) {
      ctx.beginPath();
      ctx.moveTo(x, world.ground + 18);
      ctx.lineTo(x + 18, world.ground + 34);
      ctx.stroke();
    }
  }

  function drawSeed(seed) {
    ctx.save();
    ctx.translate(seed.x, seed.y);
    ctx.rotate(Math.sin(seed.spin) * 0.25);
    ctx.fillStyle = seed.gold ? "#f2c014" : "#e6b422";
    ctx.beginPath();
    ctx.ellipse(0, 0, seed.r, seed.r * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = seed.gold ? "#8a5a12" : "#6b4a18";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-seed.r * 0.55, 0);
    ctx.lineTo(seed.r * 0.55, 0);
    ctx.stroke();
    ctx.restore();
  }

  function drawObstacle(obs) {
    const x = obs.x;
    const y = obs.y - obs.h;
    if (obs.type === "ball") {
      ctx.fillStyle = "#e56b6f";
      ctx.beginPath();
      ctx.arc(x + obs.w / 2, obs.y - obs.w / 2, obs.w / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff6";
      ctx.beginPath();
      ctx.arc(x + obs.w * 0.35, obs.y - obs.w * 0.68, obs.w * 0.16, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    if (obs.type === "sock") {
      ctx.fillStyle = "#7eb8da";
      roundRect(x, y + 8, obs.w, obs.h - 8, 12);
      ctx.fill();
      ctx.fillStyle = "#f7e7c8";
      roundRect(x, y, obs.w, 16, 8);
      ctx.fill();
      return;
    }
    ctx.fillStyle = "#c9844a";
    roundRect(x, y, obs.w, obs.h, 8);
    ctx.fill();
    ctx.strokeStyle = "rgba(90, 48, 18, 0.35)";
    ctx.stroke();
  }

  function drawHamster(h) {
    const run = Math.sin(h.run);
    const bob = h.onGround ? Math.abs(run) * 2.2 : 0;
    const lean = h.onGround ? 0 : Math.min(0.18, -h.vy * 0.012);
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.scale(1.18, 1.18 * h.squash);
    ctx.rotate(lean);

    // Soft ground shadow
    ctx.fillStyle = "rgba(90, 50, 20, 0.18)";
    ctx.beginPath();
    ctx.ellipse(0, 5, 36, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Back feet
    ctx.fillStyle = "#d8904a";
    ctx.beginPath();
    ctx.ellipse(-14, -6 + Math.abs(run) * 5, 11, 7, 0.2, 0, Math.PI * 2);
    ctx.ellipse(16, -5 + (1 - Math.abs(run)) * 5, 11, 7, -0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f3c6a0";
    ctx.beginPath();
    ctx.ellipse(-16, -3 + Math.abs(run) * 5, 5, 3.2, 0.2, 0, Math.PI * 2);
    ctx.ellipse(18, -2 + (1 - Math.abs(run)) * 5, 5, 3.2, -0.15, 0, Math.PI * 2);
    ctx.fill();

    // Fluffy body
    const bodyGrad = ctx.createRadialGradient(-8, -40, 8, 0, -30, 42);
    bodyGrad.addColorStop(0, "#f3b36a");
    bodyGrad.addColorStop(0.55, "#e89a4a");
    bodyGrad.addColorStop(1, "#d48138");
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(0, -30 - bob, 38, 30, 0, 0, Math.PI * 2);
    ctx.fill();

    // Soft belly
    ctx.fillStyle = "#ffe3bf";
    ctx.beginPath();
    ctx.ellipse(6, -24 - bob, 20, 18, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Giant cheek pouches
    ctx.fillStyle = "#f0b06a";
    ctx.beginPath();
    ctx.ellipse(-24, -28 - bob, 16, 15, 0, 0, Math.PI * 2);
    ctx.ellipse(26, -29 - bob, 17, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffe0b8";
    ctx.beginPath();
    ctx.ellipse(-24, -26 - bob, 10, 9, 0, 0, Math.PI * 2);
    ctx.ellipse(27, -27 - bob, 11, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ears
    ctx.fillStyle = "#e2954a";
    ctx.beginPath();
    ctx.ellipse(-16, -56 - bob, 11, 12, -0.35, 0, Math.PI * 2);
    ctx.ellipse(12, -58 - bob, 10, 11, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffb7c9";
    ctx.beginPath();
    ctx.ellipse(-16, -56 - bob, 5.5, 6, -0.35, 0, Math.PI * 2);
    ctx.ellipse(12, -58 - bob, 5, 5.5, 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Face plate
    ctx.fillStyle = "#ffe8c8";
    ctx.beginPath();
    ctx.ellipse(10, -34 - bob, 20, 17, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    const blink = Math.floor(world.t / 16) % 48 === 0;
    if (blink) {
      ctx.strokeStyle = "#3a2a22";
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(4, -38 - bob);
      ctx.lineTo(12, -38 - bob);
      ctx.moveTo(20, -39 - bob);
      ctx.lineTo(28, -39 - bob);
      ctx.stroke();
    } else {
      ctx.fillStyle = "#2a211c";
      ctx.beginPath();
      ctx.ellipse(8, -38 - bob, 4.2, 5.2, 0, 0, Math.PI * 2);
      ctx.ellipse(24, -39 - bob, 4.2, 5.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(9.4, -40 - bob, 1.6, 0, Math.PI * 2);
      ctx.arc(25.4, -41 - bob, 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(7, -36.5 - bob, 0.8, 0, Math.PI * 2);
      ctx.arc(23, -37.5 - bob, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Blush
    ctx.fillStyle = "rgba(255, 140, 170, 0.55)";
    ctx.beginPath();
    ctx.ellipse(2, -30 - bob, 5, 3.2, 0, 0, Math.PI * 2);
    ctx.ellipse(30, -31 - bob, 5, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Nose and smile
    ctx.fillStyle = "#ff8fa8";
    ctx.beginPath();
    ctx.ellipse(16, -30 - bob, 3.4, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#4a3428";
    ctx.lineWidth = 2.1;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(16, -25 - bob, 7, 0.2, Math.PI - 0.2);
    ctx.stroke();

    // Whiskers
    ctx.strokeStyle = "rgba(90, 60, 40, 0.45)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(2, -28 - bob);
    ctx.lineTo(-12, -26 - bob);
    ctx.moveTo(2, -24 - bob);
    ctx.lineTo(-11, -21 - bob);
    ctx.moveTo(28, -29 - bob);
    ctx.lineTo(42, -27 - bob);
    ctx.moveTo(28, -25 - bob);
    ctx.lineTo(41, -22 - bob);
    ctx.stroke();

    // Front paws
    ctx.fillStyle = "#e8a15a";
    ctx.beginPath();
    ctx.ellipse(4 + run * 3, -12 - bob, 7, 5.5, 0.3, 0, Math.PI * 2);
    ctx.ellipse(18 - run * 3, -11 - bob, 7, 5.5, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffe0b8";
    ctx.beginPath();
    ctx.ellipse(4 + run * 3, -11 - bob, 3.5, 2.6, 0.3, 0, Math.PI * 2);
    ctx.ellipse(18 - run * 3, -10 - bob, 3.5, 2.6, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Tiny tail
    ctx.fillStyle = "#d48138";
    ctx.beginPath();
    ctx.ellipse(-34, -18 - bob, 7, 5, 0.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawDust() {
    for (const puff of world.dust) {
      ctx.globalAlpha = Math.max(0, puff.life / 16);
      ctx.fillStyle = puff.color;
      ctx.beginPath();
      ctx.arc(puff.x, puff.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function draw() {
    drawBackground();
    for (const seed of world.seeds) drawSeed(seed);
    for (const obs of world.obstacles) drawObstacle(obs);
    drawDust();
    if (world.hamster) drawHamster(world.hamster);
    else {
      world.hamster = makeHamster();
      drawHamster(world.hamster);
    }
  }

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(3.2, (now - last) / 16.67);
    last = now;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  function unlockAudio() {
    if (world.audio) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    world.audio = new AudioCtx();
  }

  function playTone(startFreq, endFreq, duration, volume) {
    if (world.muted || !world.audio) return;
    const start = world.audio.currentTime;
    const osc = world.audio.createOscillator();
    const gain = world.audio.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(startFreq, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(world.audio.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  function updateMuteLabel() {
    muteBtn.textContent = world.muted ? "🔇" : "🔊";
    muteBtn.setAttribute("aria-label", world.muted ? "Unmute sounds" : "Mute sounds");
  }

  function toggleMute() {
    world.muted = !world.muted;
    localStorage.setItem(MUTE_KEY, world.muted ? "1" : "0");
    updateMuteLabel();
    if (!world.muted) unlockAudio();
  }

  function onJumpInput() {
    unlockAudio();
    if (world.state === STATE.TITLE) startGame();
    else if (world.state === STATE.OVER) startGame();
    else if (world.state === STATE.PAUSE) resumeGame();
    else jump();
  }

  document.getElementById("playBtn").addEventListener("click", startGame);
  document.getElementById("retryBtn").addEventListener("click", startGame);
  document.getElementById("resumeBtn").addEventListener("click", resumeGame);
  muteBtn.addEventListener("click", toggleMute);

  window.addEventListener("keydown", (event) => {
    if (event.code === "Space" || event.code === "ArrowUp" || event.code === "KeyW") {
      event.preventDefault();
      world.jumpHeld = true;
      onJumpInput();
    }
    if (event.code === "Escape") {
      if (world.state === STATE.PLAY) pauseGame();
      else if (world.state === STATE.PAUSE) resumeGame();
    }
  });
  window.addEventListener("keyup", (event) => {
    if (event.code === "Space" || event.code === "ArrowUp" || event.code === "KeyW") {
      world.jumpHeld = false;
    }
  });

  canvas.addEventListener("pointerdown", () => {
    world.jumpHeld = true;
    onJumpInput();
  });
  window.addEventListener("pointerup", () => {
    world.jumpHeld = false;
  });

  showScreen("title");
  world.hamster = makeHamster();
  requestAnimationFrame(loop);
})();
