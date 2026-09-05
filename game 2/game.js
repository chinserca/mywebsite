(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("scoreValue");
  const bestEl = document.getElementById("bestValue");
  const stageEl = document.getElementById("stageValue");
  const stageNameEl = document.getElementById("stageName");
  const titleScreen = document.getElementById("titleScreen");
  const lockScreen = document.getElementById("lockScreen");
  const passwordInput = document.getElementById("passwordInput");
  const passwordStatus = document.getElementById("passwordStatus");
  const unlockBtn = document.getElementById("unlockBtn");
  const pauseScreen = document.getElementById("pauseScreen");
  const overScreen = document.getElementById("overScreen");
  const overText = document.getElementById("overText");
  const finalScore = document.getElementById("finalScore");
  const finalStage = document.getElementById("finalStage");
  const newBest = document.getElementById("newBest");
  const muteBtn = document.getElementById("muteBtn");
  const toastEl = document.getElementById("toast");
  const healthFill = document.getElementById("healthFill");
  const healthValue = document.getElementById("healthValue");
  const serverScreen = document.getElementById("serverScreen");
  const serverBtn = document.getElementById("serverBtn");
  const serverBackBtn = document.getElementById("serverBackBtn");
  const serverStatus = document.getElementById("serverStatus");
  const serverList = document.getElementById("serverList");
  const playerNameInput = document.getElementById("playerName");
  const customRoomInput = document.getElementById("customRoom");
  const customJoinBtn = document.getElementById("customJoinBtn");
  const onlineChip = document.getElementById("onlineChip");
  const onlineCount = document.getElementById("onlineCount");
  const hintText = document.getElementById("hintText");

  const BEST_KEY = "hamsterDashBest";
  const STAGE_KEY = "hamsterDashBestStage";
  const MUTE_KEY = "hamsterDashMuted";
  const NAME_KEY = "hamsterDashName";
  const STATE = { TITLE: "title", PLAY: "play", PAUSE: "pause", OVER: "over" };
  const GAME_PASSWORD = "dash";
  let unlocked = false;
  const BASE_GROUND = 430;

  const STAGES = [
    {
      name: "Sunny Yard",
      unlock: 0,
      baseSpeed: 4.2,
      maxSpeed: 5.6,
      gapChance: 0.12,
      floatChance: 0.18,
      enemies: { bug: 1 },
      sky: ["#8fd3f0", "#c8ebf8", "#f6d7a4"],
    },
    {
      name: "Sock Storm",
      unlock: 250,
      baseSpeed: 4.8,
      maxSpeed: 6.4,
      gapChance: 0.18,
      floatChance: 0.25,
      enemies: { bug: 0.55, sock: 0.45 },
      sky: ["#7ec8e8", "#b9dff5", "#f0cfa0"],
    },
    {
      name: "Crate Clash",
      unlock: 600,
      baseSpeed: 5.3,
      maxSpeed: 7.2,
      gapChance: 0.22,
      floatChance: 0.32,
      enemies: { bug: 0.35, sock: 0.3, crate: 0.35 },
      sky: ["#6eb8d8", "#a8d4ef", "#e8c090"],
    },
    {
      name: "Speedy Nest",
      unlock: 1100,
      baseSpeed: 6.0,
      maxSpeed: 8.2,
      gapChance: 0.28,
      floatChance: 0.4,
      enemies: { bug: 0.3, sock: 0.25, crate: 0.3, bat: 0.15 },
      sky: ["#5aa8d0", "#98c8e8", "#e0b888"],
    },
    {
      name: "Chaos Cage",
      unlock: 1800,
      baseSpeed: 6.8,
      maxSpeed: 9.4,
      gapChance: 0.34,
      floatChance: 0.48,
      enemies: { bug: 0.25, sock: 0.2, crate: 0.25, bat: 0.2, cat: 0.1 },
      sky: ["#4a90c0", "#88b8e0", "#d8a878"],
    },
    {
      name: "Mega Munch",
      unlock: 2800,
      baseSpeed: 7.6,
      maxSpeed: 11,
      gapChance: 0.4,
      floatChance: 0.55,
      enemies: { bug: 0.2, sock: 0.15, crate: 0.25, bat: 0.2, cat: 0.2 },
      sky: ["#3a78b0", "#78a8d8", "#d09868"],
    },
  ];

  const ENEMY_POINTS = { bug: 25, sock: 30, crate: 40, bat: 45, cat: 70 };
  const ENEMY_DAMAGE = { bug: 8, sock: 10, crate: 12, bat: 10, cat: 16 };
  const ENEMY_SPEED = { bug: 1.6, sock: 1.3, crate: 0.9, bat: 2.1, cat: 1.8 };
  const ENEMY_HP = { bug: 2, sock: 3, crate: 4, bat: 2, cat: 5 };
  const MAX_HP = 100;

  const world = {
    state: STATE.TITLE,
    width: 960,
    height: 540,
    ground: BASE_GROUND,
    t: 0,
    score: 0,
    best: Number(localStorage.getItem(BEST_KEY) || 0),
    bestStage: Number(localStorage.getItem(STAGE_KEY) || 0),
    stage: 0,
    speed: 4.2,
    scoreAcc: 0,
    hamster: null,
    platforms: [],
    obstacles: [],
    seeds: [],
    pickups: [],
    dust: [],
    hills: [],
    hits: [],
    flags: [],
    checkpoint: null,
    genX: 0,
    distance: 0,
    toastAt: 0,
    muted: localStorage.getItem(MUTE_KEY) === "1",
    audio: null,
    theme: null,
    keys: { left: false, right: false, jump: false },
    rng: Math.random,
  };

  const net = {
    online: false,
    id: "",
    token: "",
    room: "nest",
    roomName: "",
    seed: 0,
    name: localStorage.getItem(NAME_KEY) || "",
    tint: "#e89a4a",
    others: [],
    count: 1,
    timer: 0,
    busy: false,
    listTimer: 0,
  };

  if (playerNameInput) playerNameInput.value = net.name;

  bestEl.textContent = String(world.best);
  updateStageHud();
  updateMuteLabel();

  function stageDef(index = world.stage) {
    return STAGES[Math.min(index, STAGES.length - 1)];
  }

  function updateStageHud() {
    const stage = stageDef();
    stageEl.textContent = String(world.stage + 1);
    stageNameEl.textContent = stage.name;
  }

  function showToast(text) {
    toastEl.textContent = text;
    toastEl.classList.remove("is-hidden");
    world.toastAt = 90;
  }

  function updateHealthHud() {
    const h = world.hamster;
    const hp = h ? Math.max(0, Math.round(h.hp)) : MAX_HP;
    const pct = Math.max(0, Math.min(100, (hp / MAX_HP) * 100));
    healthValue.textContent = String(hp);
    healthFill.style.width = `${pct}%`;
    healthFill.classList.toggle("is-mid", hp <= 50 && hp > 25);
    healthFill.classList.toggle("is-low", hp <= 25);
  }

  function hurtHamster(amount, fromX) {
    const h = world.hamster;
    if (!h || world.state !== STATE.PLAY || h.hurt > 0 || world.grace > 0) return;
    h.hp = Math.max(0, h.hp - amount);
    h.hurt = 40;
    h.squash = 0.78;
    if (fromX != null) {
      h.x += fromX < h.x ? 18 : -18;
      h.x = Math.max(40, Math.min(world.width - 50, h.x));
    }
    updateHealthHud();
    playTone(180, 80, 0.16, 0.1);
    if (h.hp <= 0) {
      return loseLife("The hamster ran out of health.");
    }
  }

  function enemyAttackBox(obs) {
    const reach = obs.type === "cat" ? 48 : 36;
    const dir = obs.facing >= 0 ? 1 : -1;
    return {
      x: dir >= 0 ? obs.x + obs.w - 8 : obs.x - reach + 8,
      y: obs.y - obs.h,
      w: reach,
      h: obs.h,
    };
  }

  function makeHamster() {
    return {
      x: 180,
      y: BASE_GROUND,
      w: 86,
      h: 70,
      vy: 0,
      onGround: true,
      run: 0,
      squash: 1,
      facing: 1,
      attack: 0,
      attackCool: 0,
      swing: 0,
      hp: MAX_HP,
      hurt: 0,
    };
  }

  function makeRng(seed) {
    let a = seed >>> 0;
    return function () {
      a += 0x6D2B79F5;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function roll() {
    return world.rng();
  }

  function chance(n) {
    return roll() < n;
  }

  function rand(min, max) {
    return min + roll() * (max - min);
  }

  function flair(min, max) {
    return min + Math.random() * (max - min);
  }

  function randInt(min, max) {
    return Math.floor(rand(min, max + 1));
  }

  function pickEnemyType(weights) {
    const entries = Object.entries(weights);
    let roll = world.rng();
    let total = 0;
    for (const [type, weight] of entries) {
      total += weight;
      if (roll <= total) return type;
    }
    return entries[entries.length - 1][0];
  }

  function addPlatform(x, top, w, h = 28) {
    world.platforms.push({ x, y: top, w, h });
  }

  function addEnemyOn(top, x, type) {
    let w = 36;
    let h = 36;
    let y = top;
    if (type === "sock") {
      w = 32;
      h = 48;
    } else if (type === "crate") {
      w = randInt(34, 48);
      h = randInt(34, 48);
    } else if (type === "bat") {
      w = 40;
      h = 28;
      y = top - rand(50, 110);
    } else if (type === "cat") {
      w = 52;
      h = 46;
    } else {
      w = 38;
      h = 34;
    }
    world.obstacles.push({
      type,
      x,
      y,
      w,
      h,
      bob: rand(0, Math.PI * 2),
      baseY: y,
      vy: 0,
      onGround: type !== "bat",
      maxHp: ENEMY_HP[type] || 2,
      hp: ENEMY_HP[type] || 2,
      hurt: 0,
      hitSwing: -1,
      facing: -1,
      attack: 0,
      attackCool: rand(20, 50),
    });
  }

  function platformTopUnder(x, w, nearY, slack = 14) {
    const inset = Math.min(10, w * 0.25);
    const left = x + inset;
    const right = x + w - inset;
    let best = null;
    for (const p of world.platforms) {
      if (right <= p.x + 2 || left >= p.x + p.w - 2) continue;
      if (nearY != null && Math.abs(p.y - nearY) > slack) continue;
      if (best === null || p.y < best) best = p.y;
    }
    return best;
  }

  function resolveEnemyGround(obs, dt) {
    if (obs.type === "bat") {
      obs.onGround = false;
      return;
    }
    const prevY = obs.y;
    const standing = platformTopUnder(obs.x, obs.w, obs.y, 14);
    if (standing !== null && obs.vy >= 0 && Math.abs(obs.y - standing) <= 14) {
      obs.y = standing;
      obs.baseY = standing;
      obs.vy = 0;
      obs.onGround = true;
      return;
    }

    obs.onGround = false;
    obs.vy += 0.72 * dt;
    const nextY = obs.y + obs.vy * dt;
    let land = null;
    const inset = Math.min(10, obs.w * 0.25);
    const left = obs.x + inset;
    const right = obs.x + obs.w - inset;
    for (const p of world.platforms) {
      if (right <= p.x + 2 || left >= p.x + p.w - 2) continue;
      if (prevY <= p.y + 6 && nextY >= p.y) {
        if (land === null || p.y < land) land = p.y;
      }
    }
    if (land !== null) {
      obs.y = land;
      obs.baseY = land;
      obs.vy = 0;
      obs.onGround = true;
      return;
    }
    obs.y = nextY;
    obs.baseY = nextY;
  }

  function addSeedsOn(top, x, count) {
    for (let i = 0; i < count; i += 1) {
      world.seeds.push({
        x: x + i * 28,
        y: top - rand(28, 70),
        r: 12,
        gold: chance(0.15),
        spin: rand(0, Math.PI),
      });
    }
  }

  function addHealthPickup(top, x) {
    const pick = roll();
    let kind = "berry";
    let heal = 12;
    if (pick < 0.28) {
      kind = "heart";
      heal = 30;
    } else if (pick < 0.62) {
      kind = "carrot";
      heal = 18;
    }
    world.pickups.push({
      kind,
      heal,
      x,
      y: top - rand(34, 72),
      bob: rand(0, Math.PI * 2),
    });
  }

  function generateChunk() {
    const stage = stageDef();
    const startX = world.genX;
    const pick = roll();
    let width = 0;

    // Safe flat ground early on
    if (startX < world.width + 80) {
      width = randInt(260, 360);
      addPlatform(startX, BASE_GROUND, width, 110);
      if (roll() < 0.5) addSeedsOn(BASE_GROUND, startX + 80, randInt(1, 3));
      if (roll() < 0.35) addHealthPickup(BASE_GROUND, startX + 140);
      world.genX = startX + width;
      return;
    }

    if (pick < stage.gapChance) {
      // Gap then landing pad
      const gap = randInt(70, 110 + world.stage * 8);
      const land = randInt(140, 220);
      addPlatform(startX + gap, BASE_GROUND, land, 110);
      if (roll() < 0.7) {
        addEnemyOn(BASE_GROUND, startX + gap + land * 0.45, pickEnemyType(stage.enemies));
      }
      if (roll() < 0.8) addSeedsOn(BASE_GROUND, startX + gap + 30, randInt(1, 3));
      if (roll() < 0.4) addHealthPickup(BASE_GROUND, startX + gap + land * 0.7);
      // Optional floating bridge over gap
      if (roll() < 0.45) {
        const floatTop = BASE_GROUND - randInt(70, 130);
        const floatW = Math.min(gap + 40, randInt(90, 140));
        addPlatform(startX + gap * 0.2, floatTop, floatW, 22);
        addSeedsOn(floatTop, startX + gap * 0.25, randInt(1, 2));
        if (roll() < 0.5) addHealthPickup(floatTop, startX + gap * 0.4);
      }
      width = gap + land;
    } else if (pick < stage.gapChance + stage.floatChance) {
      // Stepped / floating platforms
      const groundW = randInt(160, 240);
      addPlatform(startX, BASE_GROUND, groundW, 110);
      const stepTop = BASE_GROUND - randInt(60, 120);
      const stepW = randInt(100, 170);
      const stepX = startX + randInt(40, 90);
      addPlatform(stepX, stepTop, stepW, 22);
      addSeedsOn(stepTop, stepX + 20, randInt(1, 3));
      if (roll() < 0.45) addHealthPickup(stepTop, stepX + stepW * 0.35);
      if (roll() < 0.65) {
        addEnemyOn(stepTop, stepX + stepW * 0.5, pickEnemyType(stage.enemies));
      }
      if (roll() < 0.4 + world.stage * 0.05) {
        const highTop = stepTop - randInt(50, 90);
        addPlatform(stepX + randInt(40, 90), highTop, randInt(80, 130), 22);
        addSeedsOn(highTop, stepX + 50, 1);
      }
      if (roll() < 0.5) {
        addEnemyOn(BASE_GROUND, startX + groundW * 0.7, pickEnemyType(stage.enemies));
      }
      width = Math.max(groundW, stepX + stepW - startX + 40);
    } else if (pick < stage.gapChance + stage.floatChance + 0.15) {
      // Enemy gauntlet on flat ground
      width = randInt(220, 320);
      addPlatform(startX, BASE_GROUND, width, 110);
      const count = randInt(1, 2 + Math.min(2, world.stage));
      for (let i = 0; i < count; i += 1) {
        addEnemyOn(
          BASE_GROUND,
          startX + 60 + i * ((width - 80) / Math.max(1, count)),
          pickEnemyType(stage.enemies)
        );
      }
      addSeedsOn(BASE_GROUND, startX + 40, randInt(2, 4));
      if (roll() < 0.55) addHealthPickup(BASE_GROUND, startX + width * 0.8);
    } else {
      // Mixed flat with small pits and a mid ledge
      width = randInt(240, 340);
      const left = randInt(90, 140);
      const pit = randInt(50, 85);
      const right = width - left - pit;
      addPlatform(startX, BASE_GROUND, left, 110);
      if (right > 60) addPlatform(startX + left + pit, BASE_GROUND, right, 110);
      if (roll() < 0.7) {
        addPlatform(startX + left - 10, BASE_GROUND - randInt(55, 100), pit + 40, 22);
      }
      if (roll() < 0.55) {
        addEnemyOn(BASE_GROUND, startX + left * 0.5, pickEnemyType(stage.enemies));
      }
      addSeedsOn(BASE_GROUND, startX + 20, randInt(1, 3));
      if (roll() < 0.4) addHealthPickup(BASE_GROUND, startX + left * 0.7);
    }

    world.genX = startX + width;
  }

  function fillMapAhead() {
    while (world.genX < world.width + 500) {
      generateChunk();
    }
  }

  function resetPlay() {
    world.state = STATE.PLAY;
    world.t = 0;
    world.score = 0;
    world.scoreAcc = 0;
    world.stage = 0;
    world.speed = stageDef(0).baseSpeed;
    world.grace = 110;
    world.obstacles = [];
    world.seeds = [];
    world.pickups = [];
    world.dust = [];
    world.hits = [];
    world.flags = [];
    world.checkpoint = null;
    world.platforms = [];
    world.rng = net.online ? makeRng(net.seed) : Math.random;
    world.genX = -40;
    world.distance = 0;
    world.toastAt = 0;
    toastEl.classList.add("is-hidden");
    world.hills = [
      { x: 0, h: 90 },
      { x: 280, h: 130 },
      { x: 560, h: 80 },
      { x: 820, h: 120 },
    ];
    fillMapAhead();
    world.hamster = makeHamster();
    scoreEl.textContent = "0";
    updateHealthHud();
    newBest.hidden = true;
    updateStageHud();
    showScreen(null);
    saveCheckpoint();
    showToast(net.online ? `Joined ${net.roomName}` : "Stage 1: Sunny Yard");
    updateOnlineHud();
    updateHint();
  }

  function showScreen(which) {
    if (!unlocked && which !== "lock") which = "lock";
    lockScreen.classList.toggle("is-hidden", which !== "lock");
    titleScreen.classList.toggle("is-hidden", which !== "title");
    serverScreen.classList.toggle("is-hidden", which !== "server");
    pauseScreen.classList.toggle("is-hidden", which !== "pause");
    overScreen.classList.toggle("is-hidden", which !== "over");
    if (which === "server") refreshServerList();
    if (which === "lock") {
      passwordInput.focus();
    }
  }

  function tryUnlock() {
    const typed = (passwordInput.value || "").trim().toLowerCase();
    if (typed === GAME_PASSWORD) {
      unlocked = true;
      passwordStatus.textContent = "";
      passwordInput.classList.remove("is-wrong");
      passwordInput.value = "";
      showScreen("title");
      return;
    }
    passwordInput.classList.add("is-wrong");
    passwordStatus.textContent = "Wrong password.";
    passwordInput.focus();
    passwordInput.select();
  }

  function updateOnlineHud() {
    onlineChip.classList.toggle("is-hidden", !net.online);
    onlineCount.textContent = String(Math.max(1, net.count));
  }

  function updateHint() {
    hintText.textContent = net.online
      ? "A D move · W jump · S hit · Esc pause · other hamsters share this nest"
      : "A D move · W jump · S hit · Esc pause";
  }

  function playerName() {
    const typed = (playerNameInput.value || "").trim();
    return typed.slice(0, 14) || "Hamster";
  }

  let lastRoomKey = "";

  async function refreshServerList() {
    if (!serverList.children.length) serverStatus.textContent = "Looking for nests...";
    try {
      const res = await fetch("/nest/rooms");
      const data = await res.json();
      const rooms = Array.isArray(data.rooms) ? data.rooms : data.rooms ? [data.rooms] : [];
      const key = rooms.map((room) => `${room.id}:${room.players}`).join("|");
      if (!rooms.length) {
        lastRoomKey = "";
        serverList.innerHTML = "";
        serverStatus.textContent = "No nests yet. Make one below.";
        return;
      }
      serverStatus.textContent = "Pick a nest and go in.";
      if (key === lastRoomKey && serverList.children.length) return;
      lastRoomKey = key;
      serverList.innerHTML = "";
      for (const room of rooms) {
        const item = document.createElement("li");
        const meta = document.createElement("div");
        meta.className = "nest-meta";
        const title = document.createElement("strong");
        title.textContent = room.name;
        const count = document.createElement("span");
        const n = room.players || 0;
        count.textContent = n === 1 ? "1 hamster inside" : `${n} hamsters inside`;
        meta.append(title, count);
        const go = document.createElement("button");
        go.type = "button";
        go.className = "btn play";
        go.textContent = "Go in";
        go.addEventListener("click", () => joinServer(room.id));
        item.append(meta, go);
        serverList.append(item);
      }
    } catch {
      serverStatus.textContent = "Could not find the nest server. Start the game server first.";
    }
  }

  async function joinServer(roomId) {
    const name = playerName();
    net.name = name;
    localStorage.setItem(NAME_KEY, name);
    serverStatus.textContent = "Going in...";
    if (net.online) await leaveServer();
    try {
      const res = await fetch("/nest/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room: roomId || "nest", name }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error("join failed");
      net.online = true;
      net.id = data.id;
      net.token = data.token;
      net.room = data.room;
      net.roomName = data.roomName;
      net.seed = Number(data.seed) || 1;
      net.tint = data.tint || "#e89a4a";
      net.name = data.name || name;
      net.others = [];
      net.count = 1;
      startGame();
    } catch {
      net.online = false;
      serverStatus.textContent = "Could not go in. Is the game server running?";
    }
  }

  async function leaveServer() {
    if (!net.online) return;
    const payload = JSON.stringify({ id: net.id, token: net.token, room: net.room });
    net.online = false;
    net.others = [];
    net.count = 1;
    updateOnlineHud();
    updateHint();
    try {
      await fetch("/nest/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      });
    } catch {
      // leave quietly
    }
  }

  async function sendNetUpdate() {
    if (!net.online || net.busy) return;
    const h = world.hamster;
    if (!h) return;
    net.busy = true;
    try {
      const res = await fetch("/nest/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: net.id,
          token: net.token,
          room: net.room,
          worldX: world.distance + h.x,
          y: h.y,
          facing: h.facing,
          hp: h.hp,
          run: h.run,
          squash: h.squash,
          attack: h.attack,
          hurt: h.hurt,
          score: world.score,
          alive: world.state === STATE.PLAY,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        net.others = Array.isArray(data.players) ? data.players : data.players ? [data.players] : [];
        net.count = data.count || 1;
        updateOnlineHud();
      }
    } catch {
      // keep last seen hamsters
    }
    net.busy = false;
  }

  function startGame() {
    if (!unlocked) {
      showScreen("lock");
      return;
    }
    unlockAudio();
    playTone(520, 340, 0.12, 0.08);
    resetPlay();
  }

  function startSolo() {
    if (!unlocked) {
      showScreen("lock");
      return;
    }
    leaveServer();
    startGame();
  }

  function checkStageUnlock() {
    let next = world.stage;
    while (next + 1 < STAGES.length && world.score >= STAGES[next + 1].unlock) {
      next += 1;
    }
    if (next !== world.stage) {
      world.stage = next;
      const stage = stageDef();
      updateStageHud();
      saveCheckpoint();
      showToast(`Stage ${world.stage + 1}: ${stage.name} — checkpoint!`);
      playTone(560, 920, 0.18, 0.08);
      if (world.stage > world.bestStage) {
        world.bestStage = world.stage;
        localStorage.setItem(STAGE_KEY, String(world.bestStage));
      }
    }
  }

  function cloneList(list) {
    return list.map((item) => Object.assign({}, item));
  }

  function safeSpot(h) {
    const x = h ? h.x : 180;
    const y = h ? h.y : BASE_GROUND;
    const standing = platformTopUnder(x - 18, 36, y, 90);
    if (standing != null) return { x, y: standing };
    let best = null;
    for (const p of world.platforms) {
      if (p.w < 50) continue;
      const cx = p.x + Math.min(40, p.w * 0.35);
      const dx = Math.abs(cx - x);
      if (best === null || dx < best.dx) best = { dx, x: cx, y: p.y };
    }
    return best ? { x: best.x, y: best.y } : { x: 180, y: BASE_GROUND };
  }

  function saveCheckpoint() {
    const h = world.hamster;
    const spot = safeSpot(h);
    if (!world.flags.some((flag) => flag.stage === world.stage)) {
      world.flags.push({
        x: spot.x - 48,
        y: spot.y,
        stage: world.stage,
      });
    }
    world.checkpoint = {
      stage: world.stage,
      score: world.score,
      scoreAcc: world.scoreAcc,
      t: world.t,
      genX: world.genX,
      distance: world.distance,
      platforms: cloneList(world.platforms),
      obstacles: cloneList(world.obstacles),
      seeds: cloneList(world.seeds),
      pickups: cloneList(world.pickups),
      hills: cloneList(world.hills),
      flags: cloneList(world.flags),
      hamsterX: spot.x,
      hamsterY: spot.y,
    };
  }

  function restoreCheckpoint() {
    const point = world.checkpoint;
    if (!point) {
      gameOver("The hamster ran out of health.");
      return;
    }
    world.state = STATE.PLAY;
    world.stage = point.stage;
    world.score = point.score;
    world.scoreAcc = point.scoreAcc;
    world.t = point.t || 0;
    world.speed = stageDef().baseSpeed;
    world.grace = 110;
    world.genX = point.genX;
    world.distance = point.distance;
    world.platforms = cloneList(point.platforms);
    world.obstacles = cloneList(point.obstacles);
    world.seeds = cloneList(point.seeds);
    world.pickups = cloneList(point.pickups);
    world.hills = cloneList(point.hills);
    world.flags = cloneList(point.flags);
    world.dust = [];
    world.hits = [];
    world.hamster = makeHamster();
    world.hamster.x = point.hamsterX;
    world.hamster.y = point.hamsterY;
    fillMapAhead();
    scoreEl.textContent = String(world.score);
    updateHealthHud();
    updateStageHud();
    showScreen(null);
    showToast(`Back to ${stageDef().name}`);
    playTone(420, 280, 0.12, 0.08);
  }

  function loseLife(message) {
    if (world.state !== STATE.PLAY) return false;
    if (world.score > world.best) {
      world.best = world.score;
      localStorage.setItem(BEST_KEY, String(world.best));
      bestEl.textContent = String(world.best);
    }
    restoreCheckpoint();
    void message;
    return true;
  }

  function gameOver(message) {
    if (world.state !== STATE.PLAY) return;
    world.state = STATE.OVER;
    world.hamster.squash = 0.72;
    playTone(220, 90, 0.28, 0.12);
    finalScore.textContent = String(world.score);
    finalStage.textContent = stageDef().name;
    overText.textContent = message || "The hamster ran out of health.";
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

  function hurtEnemy(obs) {
    const h = world.hamster;
    if (!h) return false;
    if (obs.hitSwing === h.swing) return false;
    obs.hitSwing = h.swing;
    obs.hp -= 1;
    obs.hurt = 14;
    obs.x += h.facing * 22;
    world.hits.push({
      x: obs.x + obs.w / 2,
      y: obs.y - obs.h / 2,
      life: 10,
    });
    if (obs.hp > 0) {
      playTone(480, 360, 0.07, 0.05);
      return false;
    }
    smashEnemy(obs);
    return true;
  }

  function smashEnemy(obs) {
    const points = ENEMY_POINTS[obs.type] || 25;
    world.score += points;
    scoreEl.textContent = String(world.score);
    checkStageUnlock();
    world.hits.push({
      x: obs.x + obs.w / 2,
      y: obs.y - obs.h / 2,
      life: 14,
    });
    for (let i = 0; i < 8; i += 1) {
      world.dust.push({
        x: obs.x + obs.w / 2,
        y: obs.y - obs.h / 2,
        vx: flair(-2.4, 2.4),
        vy: flair(-3.2, -0.6),
        life: 16,
        color: obs.type === "sock" ? "#9ec9e8" : "#ffe08a",
      });
    }
  }

  function attack() {
    const h = world.hamster;
    if (!h || world.state !== STATE.PLAY) return;
    if (h.attackCool > 0 || h.attack > 0) return;
    h.swing += 1;
    h.attack = 12;
    h.attackCool = 18;
    h.squash = 1.12;
    playTone(380, 720, 0.08, 0.07);

    const hit = attackBox();
    let smashed = 0;
    world.obstacles = world.obstacles.filter((obs) => {
      if (!hitBox(hit, obstacleBox(obs))) return true;
      if (hurtEnemy(obs)) {
        smashed += 1;
        return false;
      }
      return true;
    });
    if (smashed > 0) playTone(700, 980, 0.1, 0.06);
  }

  function collectSeed(seed) {
    const value = seed.gold ? 50 : 10;
    world.score += value;
    scoreEl.textContent = String(world.score);
    checkStageUnlock();
    if (seed.gold && world.hamster) {
      world.hamster.hp = Math.min(MAX_HP, world.hamster.hp + 12);
      updateHealthHud();
    }
    playTone(seed.gold ? 780 : 640, seed.gold ? 980 : 820, 0.08, 0.05);
    for (let i = 0; i < 6; i += 1) {
      world.dust.push({
        x: seed.x,
        y: seed.y,
        vx: flair(-1.4, 1.4),
        vy: flair(-2.2, -0.4),
        life: 18,
        color: seed.gold ? "#f4c430" : "#fff4d1",
      });
    }
  }

  function collectPickup(item) {
    const h = world.hamster;
    if (!h) return;
    h.hp = Math.min(MAX_HP, h.hp + item.heal);
    updateHealthHud();
    playTone(520, 860, 0.12, 0.07);
    world.hits.push({
      x: item.x,
      y: item.y,
      life: 16,
    });
    for (let i = 0; i < 8; i += 1) {
      world.dust.push({
        x: item.x,
        y: item.y,
        vx: flair(-1.6, 1.6),
        vy: flair(-2.6, -0.4),
        life: 18,
        color: item.kind === "heart" ? "#fb7185" : item.kind === "carrot" ? "#fb923c" : "#c084fc",
      });
    }
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

  function attackBox() {
    const h = world.hamster;
    const reach = 58;
    const tall = 48;
    return {
      x: h.facing >= 0 ? h.x + 10 : h.x - reach - 10,
      y: h.y - tall - 8,
      w: reach,
      h: tall,
    };
  }

  function obstacleBox(obs) {
    const pad = obs.type === "bug" || obs.type === "bat" ? 8 : 6;
    return {
      x: obs.x + pad,
      y: obs.y - obs.h + pad,
      w: Math.max(8, obs.w - pad * 2),
      h: Math.max(8, obs.h - pad * 2),
    };
  }

  function ensurePlaying() {
    unlockAudio();
    if (!unlocked) return;
    if (!serverScreen.classList.contains("is-hidden")) return;
    if (!lockScreen.classList.contains("is-hidden")) return;
    if (world.state === STATE.TITLE || world.state === STATE.OVER) startGame();
    else if (world.state === STATE.PAUSE) resumeGame();
  }

  function tickNet(dt) {
    if (!serverScreen.classList.contains("is-hidden")) {
      net.listTimer -= dt;
      if (net.listTimer <= 0) {
        net.listTimer = 90;
        refreshServerList();
      }
    }
    if (!net.online) return;
    net.timer -= dt;
    if (net.timer <= 0) {
      net.timer = 8;
      sendNetUpdate();
    }
  }

  function resolvePlatforms(h, dt) {
    const prevY = h.y;
    h.vy += (world.keys.jump && h.vy < 0 ? 0.4 : 0.72) * dt;
    let nextY = h.y + h.vy * dt;
    h.onGround = false;

    const footL = h.x - 16;
    const footR = h.x + 16;

    if (h.vy >= 0) {
      let best = null;
      for (const p of world.platforms) {
        const onX = footR > p.x + 4 && footL < p.x + p.w - 4;
        if (!onX) continue;
        const wasAbove = prevY <= p.y + 6;
        const crossing = nextY >= p.y;
        if (wasAbove && crossing) {
          if (best === null || p.y < best) best = p.y;
        }
      }
      if (best !== null) {
        nextY = best;
        h.vy = 0;
        h.onGround = true;
      }
    }

    h.y = nextY;
  }

  function update(dt) {
    if (world.toastAt > 0) {
      world.toastAt -= dt;
      if (world.toastAt <= 0) toastEl.classList.add("is-hidden");
    }

    if (world.state !== STATE.PLAY) {
      world.t += dt * 0.35;
      tickNet(dt);
      return;
    }

    world.t += dt;
    if (world.grace > 0) world.grace -= dt;

    const stage = stageDef();
    const pace = Math.min(1, world.t * 0.002);
    world.speed = stage.baseSpeed + (stage.maxSpeed - stage.baseSpeed) * pace;

    const h = world.hamster;
    const walkSpeed = 6.2;
    let move = 0;
    if (world.keys.left) move -= 1;
    if (world.keys.right) move += 1;
    if (move !== 0) {
      h.facing = move;
      h.x += move * walkSpeed * dt;
      h.run += 0.38 * dt;
      if (h.onGround) {
        world.dust.push({
          x: h.x - h.facing * 18,
          y: h.y - 4,
          vx: -h.facing * flair(0.4, 1.4),
          vy: flair(-0.8, -0.1),
          life: 12,
          color: "rgba(255, 244, 220, 0.8)",
        });
      }
    } else if (h.onGround) {
      h.run *= 0.85;
    }

    // Camera follows only when the hamster walks. No auto-run.
    const cameraLeft = 140;
    const cameraRight = 380;
    let scroll = 0;
    if (h.x > cameraRight) {
      scroll = h.x - cameraRight;
      h.x = cameraRight;
    } else if (h.x < cameraLeft) {
      scroll = h.x - cameraLeft;
      h.x = cameraLeft;
    }
    if (world.distance + scroll < 0) {
      const allowed = -world.distance;
      h.x -= scroll - allowed;
      scroll = allowed;
    }
    world.distance += scroll;
    h.x = Math.max(40, Math.min(world.width - 50, h.x));

    resolvePlatforms(h, dt);
    h.squash += (1 - h.squash) * 0.12 * dt;
    if (h.attack > 0) h.attack -= dt;
    if (h.attackCool > 0) h.attackCool -= dt;
    if (h.hurt > 0) h.hurt -= dt;

    if (h.y > world.height + 60) {
      loseLife("The hamster fell down a hole!");
      return;
    }

    // Scroll the map only with the hamster's walk
    if (scroll !== 0) {
      world.genX -= scroll;
      for (const p of world.platforms) p.x -= scroll;
      for (const obs of world.obstacles) obs.x -= scroll;
      for (const seed of world.seeds) seed.x -= scroll;
      for (const item of world.pickups) item.x -= scroll;
      for (const flag of world.flags) flag.x -= scroll;
      for (const hill of world.hills) hill.x -= scroll * 0.22;
    }
    for (const hill of world.hills) {
      if (hill.x < -320) {
        hill.x = world.width + flair(20, 120);
        hill.h = flair(70, 150);
      }
    }
    for (const obs of world.obstacles) {
      obs.bob += dt * 0.15;
      if (obs.type === "bat") {
        obs.y = obs.baseY + Math.sin(obs.bob) * 14;
      }
      if (obs.attack > 0) obs.attack -= dt;
      if (obs.attackCool > 0) obs.attackCool -= dt;
      if (obs.hurt > 0) obs.hurt -= dt;

      const dx = h.x - (obs.x + obs.w / 2);
      const dist = Math.abs(dx);
      const onScreen = obs.x > -40 && obs.x < world.width + 40;
      if (onScreen && dist < 260) {
        obs.facing = dx >= 0 ? 1 : -1;
        if (dist > 42) {
          const step = obs.facing * (ENEMY_SPEED[obs.type] || 1.4) * dt;
          const nextX = obs.x + step;
          const canFly = obs.type === "bat";
          const staysGrounded = obs.onGround && platformTopUnder(nextX, obs.w, obs.y, 14) !== null;
          if (canFly || staysGrounded) obs.x = nextX;
        }
        if (dist < 70 && obs.attackCool <= 0 && obs.attack <= 0) {
          obs.attack = 14;
          obs.attackCool = obs.type === "cat" ? 48 : 36;
        }
      }
      resolveEnemyGround(obs, dt);
      if (obs.attack > 4 && obs.attack < 12 && h.hurt <= 0) {
        if (hitBox(hamsterBox(), enemyAttackBox(obs))) {
          if (hurtHamster(ENEMY_DAMAGE[obs.type] || 8, obs.x)) return;
        }
      }
    }
    for (const seed of world.seeds) seed.spin += 0.08 * dt;
    for (const item of world.pickups) item.bob += 0.1 * dt;

    world.platforms = world.platforms.filter((p) => p.x + p.w > -2400);
    world.obstacles = world.obstacles.filter((obs) => obs.x + obs.w > -2400 && obs.y < world.height + 80);
    world.seeds = world.seeds.filter((seed) => seed.x > -2400);
    world.pickups = world.pickups.filter((item) => item.x > -2400);
    fillMapAhead();

    for (const puff of world.dust) {
      puff.x += puff.vx * dt;
      puff.y += puff.vy * dt;
      puff.life -= dt;
    }
    world.dust = world.dust.filter((puff) => puff.life > 0);
    for (const hit of world.hits) hit.life -= dt;
    world.hits = world.hits.filter((hit) => hit.life > 0);

    if (h.attack > 0) {
      const hit = attackBox();
      world.obstacles = world.obstacles.filter((obs) => {
        if (!hitBox(hit, obstacleBox(obs))) return true;
        return !hurtEnemy(obs);
      });
    }

    const box = hamsterBox();
    if (world.grace <= 0 && h.hurt <= 0) {
      for (const obs of world.obstacles) {
        if (hitBox(box, obstacleBox(obs))) {
          if (hurtHamster(Math.max(6, (ENEMY_DAMAGE[obs.type] || 8) - 2), obs.x)) return;
          break;
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

    world.pickups = world.pickups.filter((item) => {
      const p = { x: item.x - 14, y: item.y - 16, w: 28, h: 30 };
      if (hitBox(box, p)) {
        collectPickup(item);
        return false;
      }
      return true;
    });

    world.scoreAcc += move !== 0 ? 0.18 * dt : 0;
    if (world.scoreAcc >= 1) {
      const add = Math.floor(world.scoreAcc);
      world.score += add;
      world.scoreAcc -= add;
      scoreEl.textContent = String(world.score);
      checkStageUnlock();
    }

    tickNet(dt);
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
    const sky = stageDef().sky;
    const g = ctx.createLinearGradient(0, 0, 0, world.height);
    g.addColorStop(0, sky[0]);
    g.addColorStop(0.55, sky[1]);
    g.addColorStop(1, sky[2]);
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
      ctx.ellipse(hill.x, BASE_GROUND + 40, 180, hill.h, 0, Math.PI, 0);
      ctx.fill();
    }

    // Deep pit color under map
    ctx.fillStyle = "#5a3a1e";
    ctx.fillRect(0, BASE_GROUND + 40, world.width, world.height - BASE_GROUND);
  }

  function drawPlatforms() {
    for (const p of world.platforms) {
      const depth = Math.min(p.h, world.height - p.y);
      // Dirt body
      ctx.fillStyle = "#d8a05a";
      ctx.fillRect(p.x, p.y, p.w, depth);
      // Grass top
      ctx.fillStyle = "#7cbc5a";
      ctx.fillRect(p.x, p.y, p.w, 10);
      ctx.fillStyle = "#c48a42";
      ctx.fillRect(p.x, p.y + 10, p.w, 4);
    }
  }

  function drawCheckpoint(flag) {
    if (flag.x < -40 || flag.x > world.width + 40) return;
    const x = flag.x;
    const top = flag.y - 78;
    ctx.fillStyle = "#8b5a2b";
    ctx.fillRect(x - 2, top, 5, 78);
    ctx.fillStyle = "#f0a04b";
    ctx.beginPath();
    ctx.moveTo(x + 3, top + 4);
    ctx.lineTo(x + 36, top + 16);
    ctx.lineTo(x + 3, top + 30);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fffef8";
    ctx.font = "700 12px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(String(flag.stage + 1), x + 16, top + 20);
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

  function drawPickup(item) {
    const y = item.y + Math.sin(item.bob) * 4;
    ctx.save();
    ctx.translate(item.x, y);

    if (item.kind === "heart") {
      ctx.fillStyle = "#fb7185";
      ctx.beginPath();
      ctx.moveTo(0, 8);
      ctx.bezierCurveTo(-16, -4, -10, -16, 0, -8);
      ctx.bezierCurveTo(10, -16, 16, -4, 0, 8);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.beginPath();
      ctx.ellipse(-4, -4, 3.2, 2.2, -0.4, 0, Math.PI * 2);
      ctx.fill();
    } else if (item.kind === "carrot") {
      ctx.fillStyle = "#fb923c";
      ctx.beginPath();
      ctx.moveTo(0, 12);
      ctx.lineTo(-7, -8);
      ctx.lineTo(7, -8);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#ea580c";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-2, 4);
      ctx.lineTo(2, 4);
      ctx.moveTo(-3, -1);
      ctx.lineTo(3, -1);
      ctx.stroke();
      ctx.fillStyle = "#4ade80";
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(-5, -16);
      ctx.lineTo(0, -11);
      ctx.lineTo(5, -16);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = "#c084fc";
      ctx.beginPath();
      ctx.arc(-5, 2, 6, 0, Math.PI * 2);
      ctx.arc(5, 2, 6, 0, Math.PI * 2);
      ctx.arc(0, -5, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#86efac";
      ctx.beginPath();
      ctx.ellipse(0, -12, 3, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function drawObstacle(obs) {
    const x = obs.x;
    const hop = obs.type === "bug" && obs.onGround ? Math.abs(Math.sin(obs.bob)) * 8 : 0;
    const y = obs.y - hop - obs.h;
    const cx = x + obs.w / 2;
    const cy = y + obs.h / 2;

    if (obs.type === "bug") {
      ctx.fillStyle = "#6fcf63";
      ctx.beginPath();
      ctx.ellipse(cx, cy, obs.w * 0.42, obs.h * 0.38, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#4aa83f";
      ctx.beginPath();
      ctx.ellipse(cx - 8, cy - 2, 8, 10, -0.4, 0, Math.PI * 2);
      ctx.ellipse(cx + 8, cy - 2, 8, 10, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#2a211c";
      ctx.beginPath();
      ctx.arc(cx - 6, cy - 2, 2.4, 0, Math.PI * 2);
      ctx.arc(cx + 6, cy - 2, 2.4, 0, Math.PI * 2);
      ctx.fill();
      finishEnemyDraw(obs);
      return;
    }

    if (obs.type === "sock") {
      ctx.fillStyle = "#7eb8da";
      roundRect(x, y + 10, obs.w, obs.h - 10, 12);
      ctx.fill();
      ctx.fillStyle = "#f7e7c8";
      roundRect(x, y, obs.w, 16, 8);
      ctx.fill();
      ctx.fillStyle = "#2a211c";
      ctx.beginPath();
      ctx.arc(cx - 6, cy, 2.5, 0, Math.PI * 2);
      ctx.arc(cx + 6, cy, 2.5, 0, Math.PI * 2);
      ctx.fill();
      finishEnemyDraw(obs);
      return;
    }

    if (obs.type === "crate") {
      ctx.fillStyle = "#c9844a";
      roundRect(x, y, obs.w, obs.h, 8);
      ctx.fill();
      ctx.strokeStyle = "rgba(90, 48, 18, 0.45)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + 6, y + 6);
      ctx.lineTo(x + obs.w - 6, y + obs.h - 6);
      ctx.moveTo(x + obs.w - 6, y + 6);
      ctx.lineTo(x + 6, y + obs.h - 6);
      ctx.stroke();
      ctx.fillStyle = "#2a211c";
      ctx.beginPath();
      ctx.arc(cx - 7, cy - 2, 2.5, 0, Math.PI * 2);
      ctx.arc(cx + 7, cy - 2, 2.5, 0, Math.PI * 2);
      ctx.fill();
      finishEnemyDraw(obs);
      return;
    }

    if (obs.type === "bat") {
      ctx.fillStyle = "#7b6b9e";
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.quadraticCurveTo(cx - 22, cy - 16, cx - 28, cy + 4);
      ctx.quadraticCurveTo(cx - 12, cy - 2, cx, cy + 4);
      ctx.quadraticCurveTo(cx + 12, cy - 2, cx + 28, cy + 4);
      ctx.quadraticCurveTo(cx + 22, cy - 16, cx, cy);
      ctx.fill();
      ctx.fillStyle = "#9b88c4";
      ctx.beginPath();
      ctx.ellipse(cx, cy + 2, 10, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffe66d";
      ctx.beginPath();
      ctx.arc(cx - 4, cy, 2.2, 0, Math.PI * 2);
      ctx.arc(cx + 4, cy, 2.2, 0, Math.PI * 2);
      ctx.fill();
      finishEnemyDraw(obs);
      return;
    }

    ctx.fillStyle = "#f4a261";
    roundRect(x + 4, y + 8, obs.w - 8, obs.h - 8, 14);
    ctx.fill();
    ctx.fillStyle = "#e76f51";
    ctx.beginPath();
    ctx.moveTo(x + 10, y + 16);
    ctx.lineTo(x + 16, y);
    ctx.lineTo(x + 24, y + 16);
    ctx.moveTo(x + obs.w - 10, y + 16);
    ctx.lineTo(x + obs.w - 16, y);
    ctx.lineTo(x + obs.w - 24, y + 16);
    ctx.fill();
    ctx.fillStyle = "#2a211c";
    ctx.beginPath();
    ctx.arc(cx - 8, cy + 2, 3, 0, Math.PI * 2);
    ctx.arc(cx + 8, cy + 2, 3, 0, Math.PI * 2);
    ctx.fill();
    finishEnemyDraw(obs);
  }

  function finishEnemyDraw(obs) {
    drawEnemyHurtFlash(obs);
    drawEnemyStrike(obs);
    drawEnemyHealth(obs);
  }

  function drawEnemyHurtFlash(obs) {
    if (!obs.hurt || obs.hurt <= 0) return;
    const hop = obs.type === "bug" && obs.onGround ? Math.abs(Math.sin(obs.bob)) * 8 : 0;
    const x = obs.x - 3;
    const y = obs.y - hop - obs.h - 3;
    ctx.save();
    ctx.globalAlpha = Math.min(0.5, obs.hurt / 14);
    ctx.fillStyle = "#fb7185";
    roundRect(x, y, obs.w + 6, obs.h + 6, 10);
    ctx.fill();
    ctx.restore();
  }

  function drawEnemyHealth(obs) {
    const hop = obs.type === "bug" && obs.onGround ? Math.abs(Math.sin(obs.bob)) * 8 : 0;
    const max = Math.max(1, obs.maxHp || obs.hp || 1);
    const pct = Math.max(0, Math.min(1, obs.hp / max));
    const barW = Math.max(34, obs.w);
    const barH = 8;
    const bx = obs.x + obs.w / 2 - barW / 2;
    const by = obs.y - hop - obs.h - 16;

    ctx.save();
    ctx.fillStyle = "rgba(42, 33, 28, 0.72)";
    roundRect(bx - 2, by - 2, barW + 4, barH + 4, 5);
    ctx.fill();
    ctx.fillStyle = "#4a3428";
    roundRect(bx, by, barW, barH, 4);
    ctx.fill();
    if (pct > 0) {
      ctx.fillStyle = pct > 0.55 ? "#86ef64" : pct > 0.3 ? "#f5d06a" : "#fb7185";
      roundRect(bx, by, Math.max(4, barW * pct), barH, 4);
      ctx.fill();
    }
    ctx.fillStyle = "#4a3428";
    ctx.font = "700 11px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(`${Math.max(0, Math.ceil(obs.hp))}/${max}`, bx + barW / 2, by - 3);
    ctx.restore();
  }

  function drawEnemyStrike(obs) {
    if (!obs.attack || obs.attack <= 0) return;
    const dir = obs.facing >= 0 ? 1 : -1;
    const punch = (14 - obs.attack) / 14;
    const cx = obs.x + obs.w / 2 + dir * (18 + punch * 22);
    const cy = obs.y - obs.h * 0.45;
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = "#e11d48";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(cx, cy, 16, dir > 0 ? -0.8 : Math.PI - 0.8, dir > 0 ? 0.8 : Math.PI + 0.8);
    ctx.stroke();
    ctx.fillStyle = "#fb7185";
    ctx.beginPath();
    ctx.arc(cx + dir * 8, cy, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawHits() {
    for (const hit of world.hits) {
      const a = Math.max(0, hit.life / 14);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(hit.x, hit.y);
      ctx.strokeStyle = "#ffb703";
      ctx.fillStyle = "#ffe08a";
      ctx.lineWidth = 3;
      for (let i = 0; i < 6; i += 1) {
        const ang = (Math.PI * 2 * i) / 6 + (1 - a);
        ctx.beginPath();
        ctx.moveTo(Math.cos(ang) * 6, Math.sin(ang) * 6);
        ctx.lineTo(Math.cos(ang) * 18, Math.sin(ang) * 18);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawHamster(h) {
    if (h.hurt > 0 && Math.floor(world.t / 3) % 2 === 0) return;
    const run = Math.sin(h.run);
    const bob = h.onGround ? Math.abs(run) * 2.2 : 0;
    const lean = h.onGround ? 0 : Math.min(0.18, -h.vy * 0.012);
    const punch = h.attack > 0 ? (12 - h.attack) / 12 : 0;
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.scale(h.facing * 1.18, 1.18 * h.squash);
    ctx.rotate(lean);

    ctx.fillStyle = "#d8904a";
    ctx.beginPath();
    ctx.ellipse(-14, -6 + Math.abs(run) * 5, 11, 7, 0.2, 0, Math.PI * 2);
    ctx.ellipse(16, -5 + (1 - Math.abs(run)) * 5, 11, 7, -0.15, 0, Math.PI * 2);
    ctx.fill();

    const bodyGrad = ctx.createRadialGradient(-8, -40, 8, 0, -30, 42);
    bodyGrad.addColorStop(0, "#f3b36a");
    bodyGrad.addColorStop(0.55, "#e89a4a");
    bodyGrad.addColorStop(1, "#d48138");
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(0, -30 - bob, 38, 30, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffe3bf";
    ctx.beginPath();
    ctx.ellipse(6, -24 - bob, 20, 18, 0.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#f0b06a";
    ctx.beginPath();
    ctx.ellipse(-24, -28 - bob, 16, 15, 0, 0, Math.PI * 2);
    ctx.ellipse(26, -29 - bob, 17, 16, 0, 0, Math.PI * 2);
    ctx.fill();

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

    ctx.fillStyle = "#ffe8c8";
    ctx.beginPath();
    ctx.ellipse(10, -34 - bob, 20, 17, 0, 0, Math.PI * 2);
    ctx.fill();

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

    ctx.fillStyle = "#ff8fa8";
    ctx.beginPath();
    ctx.ellipse(16, -30 - bob, 3.4, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#4a3428";
    ctx.lineWidth = 2.1;
    ctx.beginPath();
    ctx.arc(16, -25 - bob, 7, 0.2, Math.PI - 0.2);
    ctx.stroke();

    const pawX = 18 + punch * 28;
    const pawY = -18 - bob - punch * 4;
    ctx.fillStyle = "#e8a15a";
    ctx.beginPath();
    ctx.ellipse(pawX, pawY, 9, 7, -0.2 + punch * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffe0b8";
    ctx.beginPath();
    ctx.ellipse(pawX + 1, pawY, 4.5, 3.2, -0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#d48138";
    ctx.beginPath();
    ctx.ellipse(-34, -18 - bob, 7, 5, 0.6, 0, Math.PI * 2);
    ctx.fill();

    if (h.tint) {
      ctx.fillStyle = h.tint;
      ctx.beginPath();
      ctx.ellipse(2, -44 - bob, 16, 5.5, -0.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    if (h.name) {
      ctx.save();
      ctx.font = "700 14px Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255, 250, 243, 0.92)";
      ctx.strokeStyle = "rgba(74, 52, 40, 0.35)";
      ctx.lineWidth = 4;
      ctx.strokeText(h.name, h.x, h.y - 78);
      ctx.fillStyle = "#4a3428";
      ctx.fillText(h.name, h.x, h.y - 78);
      ctx.restore();
    }
  }

  function drawRemoteHamster(player) {
    const screenX = player.worldX - world.distance;
    if (screenX < -90 || screenX > world.width + 90) return;
    ctx.save();
    ctx.globalAlpha = player.alive === false ? 0.4 : 0.92;
    drawHamster({
      x: screenX,
      y: player.y,
      run: player.run || 0,
      onGround: true,
      vy: 0,
      squash: player.squash || 1,
      facing: player.facing >= 0 ? 1 : -1,
      attack: player.attack || 0,
      hurt: player.hurt || 0,
      tint: player.tint,
      name: player.name,
    });
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
    if (!world.platforms.length) {
      world.genX = -40;
      fillMapAhead();
    }
    drawBackground();
    drawPlatforms();
    for (const seed of world.seeds) drawSeed(seed);
    for (const item of world.pickups) drawPickup(item);
    for (const obs of world.obstacles) drawObstacle(obs);
    drawDust();
    drawHits();
    if (net.online) {
      for (const player of net.others) drawRemoteHamster(player);
    }
    if (world.hamster) {
      if (net.online) {
        world.hamster.name = net.name;
        world.hamster.tint = net.tint;
      } else {
        world.hamster.name = "";
        world.hamster.tint = "";
      }
      drawHamster(world.hamster);
    } else {
      world.hamster = makeHamster();
      drawHamster(world.hamster);
    }
    for (const flag of world.flags) drawCheckpoint(flag);
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
    if (!world.audio) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) world.audio = new AudioCtx();
    }
    if (world.audio && world.audio.state === "suspended") {
      world.audio.resume();
    }
    startTheme();
  }

  function startTheme() {
    if (!world.theme) {
      world.theme = new Audio("assets/theme.wav");
      world.theme.loop = true;
      world.theme.volume = 0.45;
    }
    if (world.muted) {
      world.theme.pause();
      return;
    }
    const play = world.theme.play();
    if (play && typeof play.catch === "function") play.catch(() => {});
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
    if (world.muted) {
      if (world.theme) world.theme.pause();
      return;
    }
    unlockAudio();
  }

  document.getElementById("playBtn").addEventListener("click", startSolo);
  document.getElementById("retryBtn").addEventListener("click", startGame);
  document.getElementById("resumeBtn").addEventListener("click", resumeGame);
  unlockBtn.addEventListener("click", tryUnlock);
  passwordInput.addEventListener("keydown", (event) => {
    if (event.code === "Enter") {
      event.preventDefault();
      tryUnlock();
    }
  });
  serverBtn.addEventListener("click", () => showScreen("server"));
  serverBackBtn.addEventListener("click", () => showScreen("title"));
  customJoinBtn.addEventListener("click", () => joinServer(customRoomInput.value));
  customRoomInput.addEventListener("keydown", (event) => {
    if (event.code === "Enter") {
      event.preventDefault();
      joinServer(customRoomInput.value);
    }
  });
  muteBtn.addEventListener("click", toggleMute);
  window.addEventListener("pagehide", leaveServer);

  window.addEventListener("keydown", (event) => {
    if (event.target && (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA")) {
      return;
    }
    if (event.repeat) {
      if (event.code === "KeyA" || event.code === "KeyD" || event.code === "ArrowLeft" || event.code === "ArrowRight") {
        event.preventDefault();
      }
      return;
    }

    if (event.code === "KeyA" || event.code === "ArrowLeft") {
      event.preventDefault();
      ensurePlaying();
      world.keys.left = true;
    }
    if (event.code === "KeyD" || event.code === "ArrowRight") {
      event.preventDefault();
      ensurePlaying();
      world.keys.right = true;
    }
    if (event.code === "KeyW" || event.code === "ArrowUp" || event.code === "Space") {
      event.preventDefault();
      ensurePlaying();
      world.keys.jump = true;
      if (world.state === STATE.PLAY) jump();
    }
    if (event.code === "KeyS" || event.code === "ArrowDown") {
      event.preventDefault();
      ensurePlaying();
      if (world.state === STATE.PLAY) attack();
    }
    if (event.code === "Escape") {
      if (world.state === STATE.PLAY) pauseGame();
      else if (world.state === STATE.PAUSE) resumeGame();
    }
  });

  window.addEventListener("keyup", (event) => {
    if (event.code === "KeyA" || event.code === "ArrowLeft") world.keys.left = false;
    if (event.code === "KeyD" || event.code === "ArrowRight") world.keys.right = false;
    if (event.code === "KeyW" || event.code === "ArrowUp" || event.code === "Space") {
      world.keys.jump = false;
    }
  });

  window.addEventListener("blur", () => {
    world.keys.left = false;
    world.keys.right = false;
    world.keys.jump = false;
  });

  canvas.addEventListener("pointerdown", () => {
    ensurePlaying();
    if (world.state === STATE.PLAY) attack();
  });

  window.addEventListener("pointerdown", unlockAudio, { once: true });
  window.addEventListener("keydown", unlockAudio, { once: true });

  showScreen("lock");
  world.genX = -40;
  fillMapAhead();
  world.hamster = makeHamster();
  requestAnimationFrame(loop);
})();
