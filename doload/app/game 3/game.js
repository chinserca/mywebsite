(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const seedEl = document.getElementById("seedValue");
  const hamsterEl = document.getElementById("hamsterValue");
  const titleScreen = document.getElementById("titleScreen");
  const pauseScreen = document.getElementById("pauseScreen");
  const muteBtn = document.getElementById("muteBtn");
  const foodRow = document.getElementById("foodRow");
  const shopGrid = document.getElementById("shopGrid");
  const shopNote = document.getElementById("shopNote");
  const hintText = document.getElementById("hintText");
  const toastEl = document.getElementById("toast");
  const newParkBtn = document.getElementById("newParkBtn");

  const SAVE_KEY = "hamsterPlaygroundSave";
  const MUTE_KEY = "hamsterPlaygroundMuted";
  const STATE = { TITLE: "title", PLAY: "play", PAUSE: "pause" };

  const FOODS = [
    { id: "seeds", name: "Seed mix", emoji: "🌻", hunger: 28, reward: 5, cool: 0 },
    { id: "pellets", name: "Pellets", emoji: "🟤", hunger: 40, reward: 8, cool: 0 },
    { id: "veggie", name: "Veggie", emoji: "🥦", hunger: 34, reward: 7, cool: 0 },
    { id: "treat", name: "Treat", emoji: "🍓", hunger: 22, reward: 12, cool: 90 },
  ];

  const TOYS = [
    { id: "chew", name: "Chew block", emoji: "🪵", cost: 12, w: 46, h: 40 },
    { id: "water", name: "Water bottle", emoji: "💧", cost: 15, w: 28, h: 70 },
    { id: "flowers", name: "Flower pot", emoji: "🌼", cost: 18, w: 44, h: 48 },
    { id: "wheel", name: "Wheel", emoji: "🎡", cost: 22, w: 96, h: 96 },
    { id: "sand", name: "Sand bath", emoji: "🥣", cost: 24, w: 78, h: 28 },
    { id: "house", name: "Hideout", emoji: "🏠", cost: 28, w: 88, h: 62 },
    { id: "tube", name: "Tube", emoji: "🟠", cost: 32, w: 130, h: 42 },
    { id: "ladder", name: "Ladder", emoji: "🪜", cost: 36, w: 36, h: 110 },
    { id: "platform", name: "Platform", emoji: "📦", cost: 40, w: 120, h: 54 },
    { id: "bounce", name: "Trampoline", emoji: "🟢", cost: 45, w: 84, h: 22 },
    { id: "slide", name: "Slide", emoji: "🛝", cost: 50, w: 120, h: 92 },
    { id: "balls", name: "Ball pit", emoji: "🎱", cost: 60, w: 100, h: 42 },
  ];

  const HAMSTER_TYPES = [
    { name: "Pip", fur: "#e8a15a", belly: "#f6d7b0", ear: "#d98b42" },
    { name: "Nibbles", fur: "#c9b8a6", belly: "#f3ebe3", ear: "#b39b86" },
    { name: "Peanut", fur: "#c47a3a", belly: "#f0c49a", ear: "#a85d28" },
    { name: "Mochi", fur: "#f3d7c0", belly: "#fff6ee", ear: "#e8b7a0" },
    { name: "Bean", fur: "#8d6e54", belly: "#e7d3b8", ear: "#6f5340" },
    { name: "Puff", fur: "#f0b27a", belly: "#ffe4c4", ear: "#e08964" },
  ];

  const world = {
    state: STATE.TITLE,
    width: 960,
    height: 540,
    ground: 430,
    left: 70,
    right: 890,
    t: 0,
    seeds: 10,
    food: "seeds",
    placing: null,
    hamsters: [],
    toys: [],
    bits: [],
    snacks: [],
    muted: localStorage.getItem(MUTE_KEY) === "1",
    audio: null,
    pointer: { x: 480, y: 270 },
    toastAt: 0,
    saved: false,
  };

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function toyDef(id) {
    return TOYS.find((toy) => toy.id === id);
  }

  function makeHamster(index, x) {
    const look = HAMSTER_TYPES[index % HAMSTER_TYPES.length];
    return {
      name: look.name,
      fur: look.fur,
      belly: look.belly,
      ear: look.ear,
      x: x ?? rand(180, 760),
      y: world.ground,
      vx: rand(-1.1, 1.1) || 0.7,
      facing: 1,
      hunger: 58,
      blink: 0,
      squash: 1,
      bob: rand(0, 20),
      state: "walk",
      timer: rand(40, 90),
      toy: null,
      playT: 0,
      arrived: false,
      cool: {},
      fed: 0,
    };
  }

  function hasSave() {
    return Boolean(localStorage.getItem(SAVE_KEY));
  }

  function saveGame() {
    if (world.state === STATE.TITLE) return;
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      seeds: world.seeds,
      hamsters: world.hamsters.map((h) => ({
        name: h.name,
        hunger: Math.round(h.hunger),
        x: Math.round(h.x),
        fed: h.fed,
      })),
      toys: world.toys.map((t) => ({ id: t.id, x: Math.round(t.x) })),
    }));
    world.saved = true;
  }

  function loadGame() {
    try {
      const data = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
      if (!data) return false;
      world.seeds = Number(data.seeds) || 10;
      world.toys = (data.toys || []).map((t) => {
        const def = toyDef(t.id);
        return def ? { id: t.id, x: t.x, y: world.ground } : null;
      }).filter(Boolean);
      world.hamsters = (data.hamsters || []).map((saved, i) => {
        const lookIndex = HAMSTER_TYPES.findIndex((h) => h.name === saved.name);
        const h = makeHamster(lookIndex < 0 ? i : lookIndex, saved.x);
        h.hunger = clamp(Number(saved.hunger) || 58, 8, 100);
        h.fed = Number(saved.fed) || 0;
        return h;
      });
      if (!world.hamsters.length) world.hamsters = [makeHamster(0, 240)];
      return true;
    } catch {
      return false;
    }
  }

  function freshPark() {
    world.seeds = 10;
    world.toys = [];
    world.hamsters = [makeHamster(0, 260)];
    world.bits = [];
    world.snacks = [];
    world.placing = null;
    world.food = "seeds";
    world.t = 0;
    localStorage.removeItem(SAVE_KEY);
    world.saved = false;
  }

  function startPlay(fromSave) {
    unlockAudio();
    playTone(520, 720, 0.12, 0.08);
    if (fromSave && loadGame()) {
      showToast("Welcome back to the park!");
    } else {
      freshPark();
    }
    world.state = STATE.PLAY;
    showScreen(null);
    renderShop();
    renderFood();
    syncStats();
    updateHint();
  }

  function showScreen(which) {
    titleScreen.classList.toggle("is-hidden", which !== "title");
    pauseScreen.classList.toggle("is-hidden", which !== "pause");
  }

  function pauseGame() {
    if (world.state !== STATE.PLAY) return;
    world.state = STATE.PAUSE;
    world.placing = null;
    showScreen("pause");
    saveGame();
  }

  function resumeGame() {
    if (world.state !== STATE.PAUSE) return;
    world.state = STATE.PLAY;
    showScreen(null);
  }

  function syncStats() {
    seedEl.textContent = String(world.seeds);
    hamsterEl.textContent = String(world.hamsters.length);
  }

  function showToast(text) {
    toastEl.textContent = text;
    toastEl.classList.remove("is-hidden");
    world.toastAt = 160;
  }

  function updateHint() {
    if (world.placing) {
      hintText.textContent = "Click the bedding to place your toy · Right-click or Esc to cancel";
      shopNote.textContent = "Place it somewhere the hamsters can reach.";
      return;
    }
    hintText.textContent = "Pick a snack and click a hamster · Esc to pause";
    const left = TOYS.filter((toy) => !world.toys.some((t) => t.id === toy.id)).length;
    if (left === 0) {
      shopNote.textContent = "Dream playground complete! Keep feeding so everyone stays happy.";
    } else {
      shopNote.textContent = `${left} toy${left === 1 ? "" : "s"} left to build. Feed hamsters for seeds.`;
    }
  }

  function owned(id) {
    return world.toys.some((t) => t.id === id);
  }

  function renderFood() {
    foodRow.innerHTML = "";
    for (const food of FOODS) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "food-btn" + (world.food === food.id ? " is-selected" : "");
      btn.innerHTML = `<span class="emoji">${food.emoji}</span><span class="name">${food.name}</span><span class="meta">+${food.reward} seeds</span>`;
      btn.addEventListener("click", () => {
        world.food = food.id;
        world.placing = null;
        renderFood();
        renderShop();
        updateHint();
        playTone(480, 640, 0.08, 0.05);
      });
      foodRow.appendChild(btn);
    }
  }

  function renderShop() {
    shopGrid.innerHTML = "";
    for (const toy of TOYS) {
      const has = owned(toy.id);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "shop-item" + (world.placing === toy.id ? " is-selected" : "");
      btn.disabled = has || (world.seeds < toy.cost && world.placing !== toy.id);
      btn.innerHTML = `<span class="emoji">${toy.emoji}</span><span class="name">${toy.name}</span><span class="price">${has ? "Built" : toy.cost + " seeds"}</span>`;
      btn.addEventListener("click", () => {
        if (has) return;
        if (world.placing === toy.id) {
          world.placing = null;
        } else if (world.seeds >= toy.cost) {
          world.placing = toy.id;
          playTone(500, 760, 0.1, 0.06);
        } else {
          showToast("Feed a hamster to earn more seeds.");
          playTone(180, 120, 0.12, 0.08);
        }
        renderShop();
        updateHint();
      });
      shopGrid.appendChild(btn);
    }
    updateHint();
  }

  function maybeInviteHamster() {
    const want = 1 + Math.min(5, Math.floor(world.toys.length / 2));
    if (world.hamsters.length >= want) return;
    const next = world.hamsters.length;
    const buddy = makeHamster(next, world.left + 50);
    buddy.vx = 1.4;
    world.hamsters.push(buddy);
    syncStats();
    showToast(`${buddy.name} moved in!`);
    playTone(620, 980, 0.18, 0.09);
  }

  function spawnBits(x, y, color, count) {
    for (let i = 0; i < count; i += 1) {
      world.bits.push({
        x,
        y,
        vx: rand(-1.8, 1.8),
        vy: rand(-3.2, -0.6),
        life: rand(16, 28),
        color,
      });
    }
  }

  function feedHamster(h) {
    const food = FOODS.find((f) => f.id === world.food) || FOODS[0];
    const cool = h.cool[food.id] || 0;
    if (cool > 0) {
      showToast(`${h.name} wants a different snack first.`);
      playTone(220, 160, 0.1, 0.06);
      return;
    }
    if (h.hunger >= 100) {
      showToast(`${h.name} is already stuffed.`);
      return;
    }
    h.hunger = clamp(h.hunger + food.hunger, 0, 100);
    h.state = "eat";
    h.timer = 36;
    h.toy = null;
    h.squash = 1.16;
    h.fed += 1;
    h.cool[food.id] = food.cool;
    world.seeds += food.reward;
    world.snacks.push({
      x: h.x + 18,
      y: h.y - 58,
      emoji: food.emoji,
      life: 22,
    });
    spawnBits(h.x, h.y - 40, food.id === "treat" ? "#f4c430" : "#fff4d1", 8);
    syncStats();
    renderShop();
    playTone(food.id === "treat" ? 760 : 620, food.id === "treat" ? 980 : 840, 0.1, 0.07);
    saveGame();
  }

  function placeToy(x) {
    const def = toyDef(world.placing);
    if (!def) return;
    if (world.seeds < def.cost) {
      showToast("Not enough seeds yet.");
      return;
    }
    const px = clamp(x, world.left + def.w / 2, world.right - def.w / 2);
    world.toys.push({ id: def.id, x: px, y: world.ground });
    world.seeds -= def.cost;
    world.placing = null;
    spawnBits(px, world.ground - 20, "#f4c430", 12);
    syncStats();
    renderShop();
    playTone(440, 880, 0.16, 0.08);
    maybeInviteHamster();
    if (world.toys.length === TOYS.length) {
      showToast("Dream playground complete!");
      playTone(520, 1040, 0.28, 0.1);
    } else {
      showToast(`${def.name} is in!`);
    }
    saveGame();
  }

  function hamsterAt(x, y) {
    for (let i = world.hamsters.length - 1; i >= 0; i -= 1) {
      const h = world.hamsters[i];
      if (Math.abs(x - h.x) < 36 && y < h.y + 8 && y > h.y - 70) return h;
    }
    return null;
  }

  function nearestToy(h) {
    const ready = world.toys.filter((toy) => {
      const busy = world.hamsters.some((other) => other !== h && other.toy === toy);
      return !busy;
    });
    if (!ready.length) return null;
    return ready.slice().sort((a, b) => Math.abs(a.x - h.x) - Math.abs(b.x - h.x))[0];
  }

  function beginPlay(h, toy) {
    h.state = "play";
    h.toy = toy;
    h.playT = 0;
    h.timer = rand(90, 150);
    h.vx = 0;
    h.arrived = false;
  }

  function playStandX(toy) {
    const id = toy.id;
    if (id === "water" || id === "flowers" || id === "chew") return toy.x + 18;
    if (id === "tube") return toy.x - 50;
    if (id === "slide") return toy.x + 16;
    return toy.x;
  }

  function endPlay(h) {
    h.state = "walk";
    h.toy = null;
    h.arrived = false;
    h.y = world.ground;
    h.vx = h.facing * 0.9;
  }

  function updateHamster(h, dt) {
    h.bob += dt;
    h.squash += (1 - h.squash) * 0.14 * dt;
    h.hunger = Math.max(0, h.hunger - 0.018 * dt);
    for (const key of Object.keys(h.cool)) {
      h.cool[key] = Math.max(0, h.cool[key] - dt);
    }

    if (h.state === "eat") {
      h.timer -= dt;
      h.vx = 0;
      if (h.timer <= 0) h.state = "walk";
      return;
    }

    if (h.state === "play" && h.toy) {
      h.playT += dt;
      h.timer -= dt;
      const def = toyDef(h.toy.id);
      const target = playStandX(h.toy);
      // Wheel starts in place. Other toys walk over once, then keep playing
      // even if the animation moves them away from the approach point.
      if (!h.arrived && def.id !== "wheel") {
        if (Math.abs(h.x - target) > 10) {
          h.vx = Math.sign(target - h.x) * 1.6;
          h.x += h.vx * dt;
          h.facing = Math.sign(h.vx) || h.facing;
          h.y = world.ground;
          if (h.timer <= 0 || h.hunger < 28) endPlay(h);
          return;
        }
        h.arrived = true;
        h.playT = 0;
      } else if (!h.arrived) {
        h.arrived = true;
        h.playT = 0;
      }

      h.vx = 0;
      if (def.id === "wheel") {
        h.x = h.toy.x;
        h.y = world.ground - 28 + Math.sin(h.playT * 0.22) * 18;
      } else if (def.id === "tube") {
        // One smooth pass left -> right. No wrap, so no teleport glitch.
        const dur = 90;
        const t = Math.min(1, h.playT / dur);
        h.facing = 1;
        h.x = h.toy.x - 50 + t * 100;
        h.y = world.ground - 6;
        h.squash = t > 0.12 && t < 0.88 ? 0.74 : 1;
        if (t >= 1 || h.hunger < 28) {
          endPlay(h);
          return;
        }
      } else if (def.id === "house") {
        h.x = h.toy.x;
        h.y = world.ground;
        h.squash = 0.78 + Math.sin(h.playT * 0.1) * 0.04;
      } else if (def.id === "sand") {
        h.x = h.toy.x + Math.sin(h.playT * 0.1) * 12;
        h.y = world.ground;
      } else if (def.id === "balls") {
        // Soft nestle/bounce in place. Wide left-right snaps looked like a glitch
        // against the fixed ball sprites.
        h.x = h.toy.x + Math.sin(h.playT * 0.05) * 8;
        h.y = world.ground - Math.abs(Math.sin(h.playT * 0.14)) * 6;
        h.squash = 0.86 + Math.abs(Math.sin(h.playT * 0.14)) * 0.12;
      } else if (def.id === "slide") {
        // Climb once, then slide down once. The old abs(sin) loop sent the
        // hamster back up the ramp and looked like a teleport glitch.
        const climbDur = 36;
        const slideDur = 72;
        if (h.playT < climbDur) {
          const t = h.playT / climbDur;
          h.facing = 1;
          h.x = h.toy.x + 16;
          h.y = world.ground - t * 78;
        } else {
          const t = Math.min(1, (h.playT - climbDur) / slideDur);
          h.facing = -1;
          h.x = h.toy.x + 16 - t * 56;
          h.y = world.ground - 78 + t * 78;
          h.squash = 0.92 + t * 0.08;
          if (t >= 1 || h.hunger < 28) {
            endPlay(h);
            return;
          }
        }
      } else if (def.id === "ladder" || def.id === "platform") {
        const climb = Math.abs(Math.sin(h.playT * 0.06));
        h.x = h.toy.x;
        h.y = world.ground - climb * 70;
      } else if (def.id === "bounce") {
        h.x = h.toy.x;
        h.y = world.ground - Math.abs(Math.sin(h.playT * 0.18)) * 54;
      } else if (def.id === "water" || def.id === "flowers" || def.id === "chew") {
        h.x = target;
        h.y = world.ground;
      }
      if (h.timer <= 0 || h.hunger < 28) endPlay(h);
      return;
    }

    if (h.hunger < 28) {
      h.state = "hungry";
      h.vx *= 0.4;
    } else if (h.state === "hungry") {
      h.state = "walk";
    }

    h.timer -= dt;
    if (h.timer <= 0) {
      if (h.hunger > 45 && Math.random() < 0.55 && world.toys.length) {
        const toy = nearestToy(h);
        if (toy) {
          beginPlay(h, toy);
          return;
        }
      }
      h.state = Math.random() < 0.22 ? "idle" : "walk";
      h.timer = h.state === "idle" ? rand(30, 70) : rand(50, 120);
      if (h.state === "walk") h.vx = (Math.random() < 0.5 ? -1 : 1) * rand(0.6, 1.5);
    }

    if (h.state === "idle") {
      h.vx *= 0.8;
    } else {
      h.x += h.vx * dt;
      if (h.x < world.left + 30 || h.x > world.right - 30) {
        h.vx *= -1;
        h.x = clamp(h.x, world.left + 30, world.right - 30);
      }
      h.facing = h.vx >= 0 ? 1 : -1;
    }
    h.y = world.ground;
  }

  function update(dt) {
    world.t += dt;
    if (world.toastAt > 0) {
      world.toastAt -= dt;
      if (world.toastAt <= 0) toastEl.classList.add("is-hidden");
    }
    if (world.state !== STATE.PLAY) return;

    for (const h of world.hamsters) updateHamster(h, dt);
    for (const bit of world.bits) {
      bit.x += bit.vx * dt;
      bit.y += bit.vy * dt;
      bit.vy += 0.12 * dt;
      bit.life -= dt;
    }
    world.bits = world.bits.filter((bit) => bit.life > 0);
    for (const snack of world.snacks) {
      snack.y -= 0.8 * dt;
      snack.life -= dt;
    }
    world.snacks = world.snacks.filter((snack) => snack.life > 0);
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
    g.addColorStop(0, "#9fd6f0");
    g.addColorStop(0.55, "#d7f0c8");
    g.addColorStop(1, "#f3d7a6");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, world.width, world.height);

    ctx.fillStyle = "rgba(255,255,255,0.85)";
    for (const cloud of [
      { x: 160 + Math.sin(world.t * 0.01) * 12, y: 64, s: 1 },
      { x: 520, y: 96, s: 0.8 },
      { x: 820, y: 58, s: 1.05 },
    ]) {
      ctx.beginPath();
      ctx.ellipse(cloud.x, cloud.y, 46 * cloud.s, 22 * cloud.s, 0, 0, Math.PI * 2);
      ctx.ellipse(cloud.x + 28, cloud.y + 4, 34 * cloud.s, 18 * cloud.s, 0, 0, Math.PI * 2);
      ctx.ellipse(cloud.x - 26, cloud.y + 6, 28 * cloud.s, 16 * cloud.s, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "#c48a4a";
    roundRect(42, 118, 876, 390, 28);
    ctx.fill();
    ctx.fillStyle = "#f3e1c0";
    roundRect(62, 138, 836, 348, 22);
    ctx.fill();

    ctx.fillStyle = "#e7c58a";
    ctx.fillRect(62, world.ground, 836, 126);
    ctx.fillStyle = "#d8a05a";
    ctx.fillRect(62, world.ground, 836, 12);

    ctx.strokeStyle = "rgba(180, 120, 50, 0.28)";
    ctx.lineWidth = 2;
    for (let x = 80; x < 890; x += 28) {
      ctx.beginPath();
      ctx.moveTo(x, world.ground + 18);
      ctx.lineTo(x + 12, world.ground + 36);
      ctx.stroke();
    }
  }

  function drawToy(toy, ghost, layer = "full") {
    const def = toyDef(toy.id);
    const x = toy.x;
    const y = toy.y;
    ctx.globalAlpha = ghost ? 0.45 : 1;

    if (toy.id === "wheel") {
      ctx.strokeStyle = "#c9844a";
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(x, y - 48, 44, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "#e8b56a";
      ctx.lineWidth = 3;
      for (let i = 0; i < 6; i += 1) {
        const a = i * Math.PI / 3 + world.t * 0.03;
        ctx.beginPath();
        ctx.moveTo(x, y - 48);
        ctx.lineTo(x + Math.cos(a) * 40, y - 48 + Math.sin(a) * 40);
        ctx.stroke();
      }
    } else if (toy.id === "tube") {
      ctx.fillStyle = "#f0a04b";
      roundRect(x - 65, y - 40, 130, 40, 18);
      ctx.fill();
      ctx.fillStyle = "#7a4318";
      ctx.beginPath();
      ctx.ellipse(x - 65, y - 20, 10, 16, 0, 0, Math.PI * 2);
      ctx.ellipse(x + 65, y - 20, 10, 16, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (toy.id === "house") {
      ctx.fillStyle = "#c9844a";
      roundRect(x - 44, y - 46, 88, 46, 8);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x - 52, y - 44);
      ctx.lineTo(x, y - 82);
      ctx.lineTo(x + 52, y - 44);
      ctx.closePath();
      ctx.fillStyle = "#a85d28";
      ctx.fill();
      ctx.fillStyle = "#5c3310";
      ctx.beginPath();
      ctx.ellipse(x, y - 8, 16, 18, 0, Math.PI, 0, true);
      ctx.fill();
    } else if (toy.id === "sand") {
      ctx.fillStyle = "#e8d39a";
      roundRect(x - 39, y - 18, 78, 22, 11);
      ctx.fill();
      ctx.fillStyle = "#d4b36a";
      ctx.beginPath();
      ctx.ellipse(x, y - 8, 30, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (toy.id === "ladder") {
      ctx.strokeStyle = "#b7783a";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(x - 12, y);
      ctx.lineTo(x - 12, y - 110);
      ctx.moveTo(x + 12, y);
      ctx.lineTo(x + 12, y - 110);
      ctx.stroke();
      ctx.lineWidth = 4;
      for (let i = 0; i < 6; i += 1) {
        const ly = y - 14 - i * 16;
        ctx.beginPath();
        ctx.moveTo(x - 12, ly);
        ctx.lineTo(x + 12, ly);
        ctx.stroke();
      }
    } else if (toy.id === "platform") {
      ctx.fillStyle = "#c9844a";
      ctx.fillRect(x - 4, y - 54, 8, 54);
      roundRect(x - 60, y - 62, 120, 16, 6);
      ctx.fill();
    } else if (toy.id === "slide") {
      ctx.fillStyle = "#5bbb7a";
      ctx.beginPath();
      ctx.moveTo(x - 50, y);
      ctx.lineTo(x + 10, y - 84);
      ctx.lineTo(x + 28, y - 76);
      ctx.lineTo(x - 20, y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#c9844a";
      ctx.fillRect(x + 8, y - 88, 10, 88);
    } else if (toy.id === "bounce") {
      ctx.fillStyle = "#7ecf6a";
      roundRect(x - 42, y - 14, 84, 16, 8);
      ctx.fill();
      ctx.strokeStyle = "#e56b6f";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x - 30, y - 14);
      ctx.lineTo(x - 30, y);
      ctx.moveTo(x + 30, y - 14);
      ctx.lineTo(x + 30, y);
      ctx.stroke();
    } else if (toy.id === "balls") {
      if (layer === "full" || layer === "back") {
        ctx.fillStyle = "#7eb8da";
        roundRect(x - 50, y - 28, 100, 30, 10);
        ctx.fill();
      }
      if (layer === "full" || layer === "front") {
        const colors = ["#e56b6f", "#f4c430", "#7ecf6a", "#7eb8da", "#f0a04b"];
        const busy = world.hamsters.some((h) => h.state === "play" && h.toy === toy);
        for (let i = 0; i < 5; i += 1) {
          const jiggle = busy ? Math.sin(world.t * 0.25 + i * 1.3) * 2.2 : 0;
          ctx.fillStyle = colors[i];
          ctx.beginPath();
          ctx.arc(x - 30 + i * 15 + jiggle, y - 16 - Math.abs(jiggle), 8, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (toy.id === "water") {
      ctx.fillStyle = "#9fd0ea";
      roundRect(x - 10, y - 70, 20, 42, 8);
      ctx.fill();
      ctx.fillStyle = "#c9844a";
      ctx.fillRect(x + 8, y - 78, 6, 78);
      ctx.fillStyle = "#5bbbda";
      ctx.fillRect(x - 4, y - 18, 6, 18);
    } else if (toy.id === "flowers") {
      ctx.fillStyle = "#c9844a";
      roundRect(x - 16, y - 22, 32, 22, 6);
      ctx.fill();
      ctx.fillStyle = "#7ecf6a";
      ctx.fillRect(x - 3, y - 48, 6, 28);
      ctx.fillStyle = "#f4c430";
      ctx.beginPath();
      ctx.arc(x, y - 52, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(x, y - 52, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (toy.id === "chew") {
      ctx.fillStyle = "#c9a06a";
      roundRect(x - 20, y - 36, 40, 36, 6);
      ctx.fill();
      ctx.strokeStyle = "rgba(90, 48, 18, 0.35)";
      ctx.strokeRect(x - 20, y - 36, 40, 36);
    }

    ctx.globalAlpha = 1;
    if (!ghost && def && layer !== "front") {
      ctx.fillStyle = "rgba(74, 52, 40, 0.55)";
      ctx.font = "700 12px Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(def.name, x, y + 18);
    }
  }

  function drawHamster(h) {
    const run = Math.sin(h.bob * 0.25) * (h.state === "walk" ? 1 : 0.15);
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.scale(h.facing, h.squash);

    ctx.fillStyle = "rgba(90, 50, 20, 0.16)";
    ctx.beginPath();
    ctx.ellipse(0, 4, 30, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = h.ear;
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-8, -8);
    ctx.lineTo(-16 + run * 8, -2 + Math.abs(run) * 5);
    ctx.moveTo(10, -8);
    ctx.lineTo(20 - run * 8, -2 + Math.abs(run) * 5);
    ctx.stroke();

    ctx.fillStyle = h.fur;
    ctx.beginPath();
    ctx.ellipse(0, -26, 30, 23, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = h.belly;
    ctx.beginPath();
    ctx.ellipse(-18, -24, 12, 11, 0, 0, Math.PI * 2);
    ctx.ellipse(18, -24, 12, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = h.ear;
    ctx.beginPath();
    ctx.ellipse(-16, -46, 9, 8, -0.4, 0, Math.PI * 2);
    ctx.ellipse(8, -48, 8, 7, 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f6c2d4";
    ctx.beginPath();
    ctx.ellipse(-16, -46, 4.5, 4, -0.4, 0, Math.PI * 2);
    ctx.ellipse(8, -48, 4, 3.5, 0.35, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = h.belly;
    ctx.beginPath();
    ctx.ellipse(8, -28, 16, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    const blink = Math.floor((world.t + h.bob) / 18) % 46 === 0;
    ctx.fillStyle = "#2b211c";
    if (blink) {
      ctx.fillRect(8, -34, 7, 2);
      ctx.fillRect(20, -35, 6, 2);
    } else {
      ctx.beginPath();
      ctx.arc(11, -33, 2.8, 0, Math.PI * 2);
      ctx.arc(23, -34, 2.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(12, -34.2, 1, 0, Math.PI * 2);
      ctx.arc(24, -35.2, 1, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "#f4a6b8";
    ctx.beginPath();
    ctx.ellipse(18, -25, 2.8, 2.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#2b211c";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(20, -20, 5, 0.15, Math.PI - 0.15);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = "#4a3428";
    ctx.font = "700 13px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(h.name, h.x, h.y + 20);

    const hx = h.x - 22;
    const hy = h.y - 72;
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    roundRect(hx, hy, 44, 8, 4);
    ctx.fill();
    ctx.fillStyle = h.hunger < 30 ? "#e56b6f" : h.hunger < 60 ? "#f0a04b" : "#7ecf6a";
    roundRect(hx + 1, hy + 1, 42 * (h.hunger / 100), 6, 3);
    ctx.fill();

    if (h.hunger < 30) {
      ctx.font = "16px Segoe UI, sans-serif";
      ctx.fillText("🍽️", h.x, h.y - 84 + Math.sin(world.t * 0.12) * 3);
    }
  }

  function drawBits() {
    for (const bit of world.bits) {
      ctx.globalAlpha = Math.max(0, bit.life / 24);
      ctx.fillStyle = bit.color;
      ctx.beginPath();
      ctx.arc(bit.x, bit.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.font = "18px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    for (const snack of world.snacks) {
      ctx.globalAlpha = Math.max(0, snack.life / 22);
      ctx.fillText(snack.emoji, snack.x, snack.y);
      ctx.globalAlpha = 1;
    }
  }

  function drawPlaceGhost() {
    if (!world.placing || world.state !== STATE.PLAY) return;
    const def = toyDef(world.placing);
    const x = clamp(world.pointer.x, world.left + def.w / 2, world.right - def.w / 2);
    drawToy({ id: def.id, x, y: world.ground }, true);
    ctx.fillStyle = "rgba(74, 52, 40, 0.7)";
    ctx.font = "700 16px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Click to place " + def.name, x, 160);
  }

  function draw() {
    drawBackground();
    const sortedToys = world.toys.slice().sort((a, b) => a.x - b.x);
    for (const toy of sortedToys) {
      drawToy(toy, false, toy.id === "balls" ? "back" : "full");
    }
    drawPlaceGhost();
    const sorted = world.hamsters.slice().sort((a, b) => a.y - b.y);
    for (const h of sorted) drawHamster(h);
    // Balls draw above the hamster so it looks tucked into the pit.
    for (const toy of sortedToys) {
      if (toy.id === "balls") drawToy(toy, false, "front");
    }
    drawBits();
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

  function canvasPos(event) {
    const r = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - r.left) * (world.width / r.width),
      y: (event.clientY - r.top) * (world.height / r.height),
    };
  }

  function onCanvasClick(event) {
    if (world.state !== STATE.PLAY) return;
    const pos = canvasPos(event);
    if (world.placing) {
      if (pos.y > 150) placeToy(pos.x);
      return;
    }
    const h = hamsterAt(pos.x, pos.y);
    if (h) feedHamster(h);
  }

  document.getElementById("playBtn").addEventListener("click", () => startPlay(hasSave()));
  document.getElementById("resumeBtn").addEventListener("click", resumeGame);
  newParkBtn.addEventListener("click", () => startPlay(false));
  muteBtn.addEventListener("click", () => {
    world.muted = !world.muted;
    localStorage.setItem(MUTE_KEY, world.muted ? "1" : "0");
    updateMuteLabel();
    if (!world.muted) unlockAudio();
  });

  canvas.addEventListener("pointermove", (event) => {
    world.pointer = canvasPos(event);
  });
  canvas.addEventListener("pointerdown", onCanvasClick);
  canvas.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    world.placing = null;
    renderShop();
    updateHint();
  });

  window.addEventListener("keydown", (event) => {
    if (event.code === "Escape") {
      if (world.placing) {
        world.placing = null;
        renderShop();
        updateHint();
      } else if (world.state === STATE.PLAY) pauseGame();
      else if (world.state === STATE.PAUSE) resumeGame();
    }
    const foodKeys = { Digit1: "seeds", Digit2: "pellets", Digit3: "veggie", Digit4: "treat" };
    if (foodKeys[event.code]) {
      world.food = foodKeys[event.code];
      renderFood();
    }
  });

  window.addEventListener("beforeunload", saveGame);

  if (hasSave()) {
    newParkBtn.classList.remove("is-hidden");
    document.getElementById("playBtn").textContent = "Continue";
  }

  renderFood();
  renderShop();
  updateMuteLabel();
  syncStats();
  world.hamsters = [makeHamster(0, 300)];
  showScreen("title");
  requestAnimationFrame(loop);
})();
