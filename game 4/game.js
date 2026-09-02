(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const seedEl = document.getElementById("seedValue");
  const pathEl = document.getElementById("pathValue");
  const hamsterEl = document.getElementById("hamsterValue");
  const titleScreen = document.getElementById("titleScreen");
  const pauseScreen = document.getElementById("pauseScreen");
  const muteBtn = document.getElementById("muteBtn");
  const shopGrid = document.getElementById("shopGrid");
  const shopNote = document.getElementById("shopNote");
  const hintText = document.getElementById("hintText");
  const rotateHint = document.getElementById("rotateHint");
  const toastEl = document.getElementById("toast");
  const newParkBtn = document.getElementById("newParkBtn");

  const SAVE_KEY = "tunnelMazeSave";
  const MUTE_KEY = "tunnelMazeMuted";
  const STATE = { TITLE: "title", PLAY: "play", PAUSE: "pause" };
  const COLS = 12;
  const ROWS = 9;
  const MAX_HAMSTERS = 12;
  const DIR = [
    { dx: 0, dy: -1, bit: 1, opp: 4 },
    { dx: 1, dy: 0, bit: 2, opp: 8 },
    { dx: 0, dy: 1, bit: 4, opp: 1 },
    { dx: -1, dy: 0, bit: 8, opp: 2 },
  ];

  const OPEN = [15, 15, 15, 15];

  const PIECES = {
    straight: {
      id: "straight",
      name: "Straight",
      emoji: "🟠",
      cost: 8,
      tab: "tunnels",
      rotate: true,
      color: "#f0a04b",
      mask: [5, 10, 5, 10],
    },
    curve: {
      id: "curve",
      name: "Curve",
      emoji: "🟡",
      cost: 10,
      tab: "tunnels",
      rotate: true,
      color: "#f4c430",
      mask: [3, 6, 12, 9],
    },
    tee: {
      id: "tee",
      name: "T-junction",
      emoji: "🟢",
      cost: 14,
      tab: "tunnels",
      rotate: true,
      color: "#7ecf6a",
      mask: [11, 7, 14, 13],
    },
    cross: {
      id: "cross",
      name: "Cross",
      emoji: "🟣",
      cost: 18,
      tab: "tunnels",
      rotate: false,
      color: "#b57ad6",
      mask: OPEN,
    },
    endcap: {
      id: "endcap",
      name: "End tube",
      emoji: "🟤",
      cost: 6,
      tab: "tunnels",
      rotate: true,
      color: "#c47a3a",
      mask: [1, 2, 4, 8],
    },
    rainbow: {
      id: "rainbow",
      name: "Rainbow",
      emoji: "🌈",
      cost: 16,
      tab: "tunnels",
      rotate: true,
      color: "#e56b8a",
      mask: [5, 10, 5, 10],
    },
    wide: {
      id: "wide",
      name: "Wide hub",
      emoji: "🔵",
      cost: 22,
      tab: "tunnels",
      rotate: false,
      color: "#5bbbda",
      mask: OPEN,
    },
    feeder: {
      id: "feeder",
      name: "Seed bowl",
      emoji: "🌻",
      cost: 12,
      tab: "feeders",
      rotate: false,
      color: "#f6d7a4",
      mask: OPEN,
      open: true,
      feeder: true,
      hunger: 34,
      reward: 5,
      cool: 200,
    },
    pellets: {
      id: "pellets",
      name: "Pellet dish",
      emoji: "🍽️",
      cost: 18,
      tab: "feeders",
      rotate: false,
      color: "#e8d9c4",
      mask: OPEN,
      open: true,
      feeder: true,
      hunger: 46,
      reward: 8,
      cool: 210,
    },
    veggie: {
      id: "veggie",
      name: "Veggie tray",
      emoji: "🥗",
      cost: 22,
      tab: "feeders",
      rotate: false,
      color: "#d7efc8",
      mask: OPEN,
      open: true,
      feeder: true,
      hunger: 40,
      reward: 10,
      cool: 200,
    },
    water: {
      id: "water",
      name: "Water bottle",
      emoji: "💧",
      cost: 14,
      tab: "feeders",
      rotate: false,
      color: "#cfeaf8",
      mask: OPEN,
      open: true,
      feeder: true,
      hunger: 22,
      reward: 4,
      cool: 130,
    },
    treat: {
      id: "treat",
      name: "Treat fountain",
      emoji: "🍓",
      cost: 36,
      tab: "feeders",
      rotate: false,
      color: "#f7c9d8",
      mask: OPEN,
      open: true,
      feeder: true,
      hunger: 28,
      reward: 16,
      cool: 250,
    },
    buffet: {
      id: "buffet",
      name: "Buffet table",
      emoji: "🍱",
      cost: 44,
      tab: "feeders",
      rotate: false,
      color: "#ffe4b8",
      mask: OPEN,
      open: true,
      feeder: true,
      hunger: 54,
      reward: 14,
      cool: 230,
    },
    nestbox: {
      id: "nestbox",
      name: "Nest box",
      emoji: "🐣",
      cost: 30,
      tab: "spawners",
      rotate: false,
      color: "#f0d0a8",
      mask: OPEN,
      open: true,
      spawner: true,
      spawnEvery: 420,
    },
    burrow: {
      id: "burrow",
      name: "Burrow door",
      emoji: "🕳️",
      cost: 42,
      tab: "spawners",
      rotate: false,
      color: "#c9a07a",
      mask: OPEN,
      open: true,
      spawner: true,
      spawnEvery: 300,
    },
    carrier: {
      id: "carrier",
      name: "Pet carrier",
      emoji: "🧳",
      cost: 55,
      tab: "spawners",
      rotate: false,
      color: "#b8d4f0",
      mask: OPEN,
      open: true,
      spawner: true,
      spawnEvery: 220,
    },
    vipden: {
      id: "vipden",
      name: "VIP den",
      emoji: "👑",
      cost: 75,
      tab: "spawners",
      rotate: false,
      color: "#f4d76a",
      mask: OPEN,
      open: true,
      spawner: true,
      spawnEvery: 150,
    },
    floor: {
      id: "floor",
      name: "Room floor",
      emoji: "🟫",
      cost: 6,
      tab: "rooms",
      rotate: false,
      color: "#e8c49a",
      mask: OPEN,
      open: true,
    },
    soft: {
      id: "soft",
      name: "Soft bedding",
      emoji: "🩷",
      cost: 8,
      tab: "rooms",
      rotate: false,
      color: "#f3c6d4",
      mask: OPEN,
      open: true,
    },
    loft: {
      id: "loft",
      name: "Loft pad",
      emoji: "📦",
      cost: 12,
      tab: "rooms",
      rotate: false,
      color: "#c9a06a",
      mask: OPEN,
      open: true,
    },
    garden: {
      id: "garden",
      name: "Garden tile",
      emoji: "🌿",
      cost: 10,
      tab: "rooms",
      rotate: false,
      color: "#bfe3b0",
      mask: OPEN,
      open: true,
    },
    nest: {
      id: "nest",
      name: "Cozy nest",
      emoji: "🪺",
      cost: 12,
      tab: "extras",
      rotate: false,
      color: "#d4a574",
      mask: OPEN,
      open: true,
      play: true,
    },
    wheel: {
      id: "wheel",
      name: "Wheel",
      emoji: "🎡",
      cost: 20,
      tab: "extras",
      rotate: false,
      color: "#c9844a",
      mask: OPEN,
      open: true,
      play: true,
    },
    sand: {
      id: "sand",
      name: "Sand bath",
      emoji: "🛁",
      cost: 14,
      tab: "extras",
      rotate: false,
      color: "#e8d39a",
      mask: OPEN,
      open: true,
      play: true,
    },
    lantern: {
      id: "lantern",
      name: "Lantern",
      emoji: "🏮",
      cost: 10,
      tab: "extras",
      rotate: false,
      color: "#e56b6f",
      mask: OPEN,
      open: true,
      play: true,
    },
    hideout: {
      id: "hideout",
      name: "Hideout",
      emoji: "🏠",
      cost: 18,
      tab: "extras",
      rotate: false,
      color: "#c9844a",
      mask: OPEN,
      open: true,
      play: true,
    },
    hammock: {
      id: "hammock",
      name: "Hammock",
      emoji: "🛏️",
      cost: 16,
      tab: "extras",
      rotate: false,
      color: "#e56b8a",
      mask: OPEN,
      open: true,
      play: true,
    },
    chew: {
      id: "chew",
      name: "Chew block",
      emoji: "🪵",
      cost: 9,
      tab: "extras",
      rotate: false,
      color: "#c9a06a",
      mask: OPEN,
      open: true,
      play: true,
    },
    slide: {
      id: "slide",
      name: "Slide",
      emoji: "🛝",
      cost: 24,
      tab: "extras",
      rotate: false,
      color: "#5bbb7a",
      mask: OPEN,
      open: true,
      play: true,
    },
    bounce: {
      id: "bounce",
      name: "Trampoline",
      emoji: "🟢",
      cost: 22,
      tab: "extras",
      rotate: false,
      color: "#7ecf6a",
      mask: OPEN,
      open: true,
      play: true,
    },
    flowers: {
      id: "flowers",
      name: "Flower pot",
      emoji: "🌼",
      cost: 11,
      tab: "extras",
      rotate: false,
      color: "#f4c430",
      mask: OPEN,
      open: true,
      play: true,
    },
    balls: {
      id: "balls",
      name: "Ball pit",
      emoji: "🎱",
      cost: 26,
      tab: "extras",
      rotate: false,
      color: "#7eb8da",
      mask: OPEN,
      open: true,
      play: true,
    },
  };

  const HAMSTER_TYPES = [
    { name: "Pip", fur: "#e8a15a", belly: "#f6d7b0" },
    { name: "Nibbles", fur: "#c9b8a6", belly: "#f3ebe3" },
    { name: "Peanut", fur: "#c47a3a", belly: "#f0c49a" },
    { name: "Mochi", fur: "#f3d7c0", belly: "#fff6ee" },
    { name: "Bean", fur: "#8d6e54", belly: "#e7d3b8" },
    { name: "Puff", fur: "#f0b27a", belly: "#ffe4c4" },
  ];

  const world = {
    state: STATE.TITLE,
    seeds: 30,
    tab: "tunnels",
    placing: null,
    rot: 0,
    grid: [],
    hamsters: [],
    connected: new Set(),
    t: 0,
    drip: 0,
    muted: localStorage.getItem(MUTE_KEY) === "1",
    audio: null,
    hover: null,
    toastAt: 0,
    cell: 54,
    ox: 0,
    oy: 0,
  };

  function idx(c, r) {
    return r * COLS + c;
  }

  function inBounds(c, r) {
    return c >= 0 && r >= 0 && c < COLS && r < ROWS;
  }

  function pieceDef(id) {
    return PIECES[id];
  }

  function openings(tile) {
    if (!tile) return 0;
    const def = pieceDef(tile.id);
    return def.mask[tile.rot & 3];
  }

  function makeTile(id, rot = 0) {
    const def = pieceDef(id);
    return {
      id,
      rot: rot & 3,
      spawnT: def && def.spawner ? 0 : undefined,
    };
  }

  function emptyGrid() {
    return Array.from({ length: COLS * ROWS }, () => null);
  }

  function makeHamster(index, c, r) {
    const look = HAMSTER_TYPES[index % HAMSTER_TYPES.length];
    return {
      name: look.name,
      fur: look.fur,
      belly: look.belly,
      c,
      r,
      fromC: c,
      fromR: r,
      toC: c,
      toR: r,
      moveT: 1,
      moving: false,
      path: [],
      hunger: 70,
      state: "idle",
      timer: 40,
      bob: Math.random() * 20,
      feedCool: 0,
    };
  }

  function cellCenter(c, r) {
    return {
      x: world.ox + c * world.cell + world.cell / 2,
      y: world.oy + r * world.cell + world.cell / 2,
    };
  }

  function hamsterPos(h) {
    if (!h.moving || h.moveT >= 1) return cellCenter(h.c, h.r);
    const a = cellCenter(h.fromC, h.fromR);
    const b = cellCenter(h.toC, h.toR);
    const t = h.moveT * h.moveT * (3 - 2 * h.moveT);
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
    };
  }

  function stopHamster(h) {
    h.moving = false;
    h.moveT = 1;
    h.path = [];
    h.fromC = h.c;
    h.fromR = h.r;
    h.toC = h.c;
    h.toR = h.r;
  }

  function layout() {
    const pad = 24;
    world.cell = Math.floor(Math.min((canvas.width - pad * 2) / COLS, (canvas.height - pad * 2) / ROWS));
    world.ox = Math.floor((canvas.width - world.cell * COLS) / 2);
    world.oy = Math.floor((canvas.height - world.cell * ROWS) / 2);
  }

  function hasSave() {
    return Boolean(localStorage.getItem(SAVE_KEY));
  }

  function saveGame() {
    if (world.state === STATE.TITLE) return;
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      seeds: world.seeds,
      grid: world.grid.map((tile) => (tile ? { id: tile.id, rot: tile.rot } : null)),
      hamsters: world.hamsters.map((h) => ({
        name: h.name,
        c: h.c,
        r: h.r,
        hunger: Math.round(h.hunger),
      })),
    }));
  }

  function loadGame() {
    try {
      const data = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
      if (!data || !Array.isArray(data.grid) || data.grid.length !== COLS * ROWS) return false;
      world.seeds = Number(data.seeds) || 30;
      world.grid = data.grid.map((tile) => (tile && PIECES[tile.id] ? makeTile(tile.id, tile.rot) : null));
      world.hamsters = (data.hamsters || []).map((saved, i) => {
        const lookIndex = HAMSTER_TYPES.findIndex((h) => h.name === saved.name);
        const h = makeHamster(lookIndex < 0 ? i : lookIndex, saved.c ?? 5, saved.r ?? 4);
        h.hunger = Math.max(8, Math.min(100, Number(saved.hunger) || 70));
        stopHamster(h);
        return h;
      });
      if (!world.hamsters.length) {
        world.hamsters = [makeHamster(0, 5, 4)];
      }
      recomputeConnected();
      return true;
    } catch {
      return false;
    }
  }

  function freshMaze() {
    world.seeds = 30;
    world.grid = emptyGrid();
    world.placing = null;
    world.rot = 0;
    world.tab = "tunnels";
    world.t = 0;
    world.drip = 0;

    // Starter path: feeder room + tunnel corridor
    world.grid[idx(4, 4)] = makeTile("feeder");
    world.grid[idx(5, 4)] = makeTile("floor");
    world.grid[idx(6, 4)] = makeTile("straight", 1);
    world.grid[idx(7, 4)] = makeTile("nest");

    world.hamsters = [makeHamster(0, 5, 4)];
    recomputeConnected();
    localStorage.removeItem(SAVE_KEY);
  }

  function neighborsConnected(c, r) {
    const tile = world.grid[idx(c, r)];
    if (!tile) return [];
    const mask = openings(tile);
    const out = [];
    for (const d of DIR) {
      if (!(mask & d.bit)) continue;
      const nc = c + d.dx;
      const nr = r + d.dy;
      if (!inBounds(nc, nr)) continue;
      const other = world.grid[idx(nc, nr)];
      if (!other) continue;
      if (openings(other) & d.opp) out.push({ c: nc, r: nr });
    }
    return out;
  }

  function recomputeConnected() {
    world.connected = new Set();
    const start = world.grid.findIndex((tile) => tile && pieceDef(tile.id).feeder);
    if (start < 0) return;
    const sc = start % COLS;
    const sr = Math.floor(start / COLS);
    const q = [{ c: sc, r: sr }];
    world.connected.add(start);
    while (q.length) {
      const cur = q.shift();
      for (const n of neighborsConnected(cur.c, cur.r)) {
        const i = idx(n.c, n.r);
        if (world.connected.has(i)) continue;
        world.connected.add(i);
        q.push(n);
      }
    }
  }

  function bfs(fromC, fromR, goalFn) {
    const start = idx(fromC, fromR);
    if (!world.connected.has(start)) return [];
    const q = [{ c: fromC, r: fromR }];
    const prev = new Map([[start, null]]);
    let found = null;
    while (q.length) {
      const cur = q.shift();
      if (goalFn(cur.c, cur.r)) {
        found = cur;
        break;
      }
      for (const n of neighborsConnected(cur.c, cur.r)) {
        const i = idx(n.c, n.r);
        if (!world.connected.has(i) || prev.has(i)) continue;
        prev.set(i, cur);
        q.push(n);
      }
    }
    if (!found) return [];
    const path = [];
    let step = found;
    while (step) {
      path.push(step);
      const p = prev.get(idx(step.c, step.r));
      step = p;
    }
    path.reverse();
    return path.slice(1);
  }

  function showScreen(which) {
    titleScreen.classList.toggle("is-hidden", which !== "title");
    pauseScreen.classList.toggle("is-hidden", which !== "pause");
  }

  function showToast(text) {
    toastEl.textContent = text;
    toastEl.classList.remove("is-hidden");
    world.toastAt = 140;
  }

  function syncStats() {
    seedEl.textContent = String(world.seeds);
    pathEl.textContent = String(world.connected.size);
    hamsterEl.textContent = String(world.hamsters.length);
  }

  function updateHint() {
    const def = world.placing ? pieceDef(world.placing) : null;
    if (def) {
      hintText.textContent = def.rotate
        ? `Click a cell to place ${def.name} · R rotates · Esc cancels`
        : `Click a cell to place ${def.name} · Esc cancels`;
      shopNote.textContent = "Tiles must open toward each other to connect.";
      rotateHint.classList.toggle("is-hidden", !def.rotate);
      rotateHint.textContent = `Facing ${["N", "E", "S", "W"][world.rot]} · press R to rotate`;
    } else {
      hintText.textContent = "Pick a tile and click the grid · R rotates · Esc pauses";
      shopNote.textContent = `${world.connected.size} path · ${feederCount()} feeder${feederCount() === 1 ? "" : "s"} · ${spawnerCount()} spawner${spawnerCount() === 1 ? "" : "s"} · ${world.hamsters.length}/${MAX_HAMSTERS} hamsters`;
      rotateHint.classList.add("is-hidden");
    }
  }

  function catalog() {
    return Object.values(PIECES).filter((p) => p.tab === world.tab);
  }

  function setTab(tab) {
    world.tab = tab;
    world.placing = null;
    for (const btn of document.querySelectorAll(".shop-tab")) {
      btn.classList.toggle("is-active", btn.dataset.tab === tab);
    }
    renderShop();
  }

  function feederCount() {
    return world.grid.filter((tile) => tile && pieceDef(tile.id).feeder).length;
  }

  function spawnerCount() {
    return world.grid.filter((tile) => tile && pieceDef(tile.id).spawner).length;
  }

  function renderShop() {
    shopGrid.innerHTML = "";
    for (const def of catalog()) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "shop-item" + (world.placing === def.id ? " is-selected" : "");
      btn.disabled = world.seeds < def.cost && world.placing !== def.id;
      let meta = `${def.cost} seeds`;
      if (def.feeder) meta = `${def.cost} · +${def.reward} seeds`;
      if (def.spawner) meta = `${def.cost} · auto spawn`;
      btn.innerHTML = `<span class="emoji">${def.emoji}</span><span class="name">${def.name}</span><span class="price">${meta}</span>`;
      btn.addEventListener("click", () => {
        if (world.placing === def.id) {
          world.placing = null;
        } else if (world.seeds >= def.cost) {
          world.placing = def.id;
          world.rot = 0;
          playTone(500, 760, 0.1, 0.06);
        } else {
          showToast("Grow the maze to earn more seeds.");
          playTone(180, 120, 0.12, 0.08);
        }
        renderShop();
        updateHint();
      });
      shopGrid.appendChild(btn);
    }
    updateHint();
  }

  function spawnHamsterAt(c, r, message) {
    if (world.hamsters.length >= MAX_HAMSTERS) return null;
    if (!world.connected.has(idx(c, r))) return null;
    const buddy = makeHamster(world.hamsters.length, c, r);
    world.hamsters.push(buddy);
    showToast(message || `${buddy.name} moved in!`);
    playTone(620, 980, 0.18, 0.09);
    syncStats();
    return buddy;
  }

  function maybeInvite() {
    const want = 1 + Math.min(
      5,
      Math.floor(world.connected.size / 5) + Math.floor(feederCount() / 2)
    );
    if (world.hamsters.length >= want) return;
    const spots = [...world.connected].map((i) => ({ c: i % COLS, r: Math.floor(i / COLS) }));
    const spot = spots[Math.floor(Math.random() * spots.length)];
    spawnHamsterAt(spot.c, spot.r, `${HAMSTER_TYPES[world.hamsters.length % HAMSTER_TYPES.length].name} found the maze!`);
  }

  function updateSpawners(dt) {
    if (world.hamsters.length >= MAX_HAMSTERS) return;
    for (let i = 0; i < world.grid.length; i += 1) {
      const tile = world.grid[i];
      if (!tile) continue;
      const def = pieceDef(tile.id);
      if (!def || !def.spawner) continue;
      if (!world.connected.has(i)) continue;
      tile.spawnT = (tile.spawnT || 0) + dt;
      if (tile.spawnT < def.spawnEvery) continue;
      tile.spawnT = 0;
      const c = i % COLS;
      const r = Math.floor(i / COLS);
      const buddy = spawnHamsterAt(c, r, `${def.name} brought a friend!`);
      if (!buddy) break;
      saveGame();
    }
  }

  function placeAt(c, r) {
    if (!world.placing || !inBounds(c, r)) return;
    const def = pieceDef(world.placing);
    if (!def || world.seeds < def.cost) return;
    if (world.grid[idx(c, r)]) {
      showToast("That cell is full.");
      playTone(180, 120, 0.12, 0.08);
      return;
    }
    world.grid[idx(c, r)] = makeTile(def.id, world.rot);
    world.seeds -= def.cost;
    world.placing = null;
    recomputeConnected();
    maybeInvite();
    let spawned = null;
    if (def.spawner && world.connected.has(idx(c, r))) {
      spawned = spawnHamsterAt(c, r, `${def.name} opened — a hamster arrived!`);
    }
    syncStats();
    renderShop();
    if (!spawned) showToast(`${def.name} added!`);
    playTone(440, 880, 0.16, 0.08);
    saveGame();
  }

  function cellFromEvent(event) {
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (canvas.width / rect.width);
    const y = (event.clientY - rect.top) * (canvas.height / rect.height);
    const c = Math.floor((x - world.ox) / world.cell);
    const r = Math.floor((y - world.oy) / world.cell);
    if (!inBounds(c, r)) return null;
    return { c, r };
  }

  function pickWanderTarget(h) {
    const options = [...world.connected]
      .map((i) => ({ c: i % COLS, r: Math.floor(i / COLS) }))
      .filter((p) => p.c !== h.c || p.r !== h.r);
    if (!options.length) return null;
    return options[Math.floor(Math.random() * options.length)];
  }

  function beginNextStep(h) {
    if (!h.path.length) {
      stopHamster(h);
      if (h.state === "seekFood") {
        if (!eatAt(h)) {
          h.state = "idle";
          h.timer = Math.max(40, h.feedCool || 40);
        }
      } else {
        h.state = "idle";
        h.timer = 55 + Math.random() * 45;
      }
      return;
    }
    const next = h.path.shift();
    // Only step into an orthogonally adjacent connected cell.
    if (Math.abs(next.c - h.c) + Math.abs(next.r - h.r) !== 1) {
      h.path = [];
      stopHamster(h);
      h.state = "idle";
      h.timer = 30;
      return;
    }
    h.fromC = h.c;
    h.fromR = h.r;
    h.toC = next.c;
    h.toR = next.r;
    h.moveT = 0;
    h.moving = true;
  }

  function startPath(h, path, mode) {
    if (!path.length) {
      stopHamster(h);
      h.state = "idle";
      h.timer = 35;
      return;
    }
    h.path = path.slice();
    h.state = mode;
    beginNextStep(h);
  }

  function eatAt(h) {
    const tile = world.grid[idx(h.c, h.r)];
    const def = tile && pieceDef(tile.id);
    if (!def || !def.feeder) return false;
    if (h.feedCool > 0) return false;
    stopHamster(h);
    h.hunger = Math.min(100, h.hunger + (def.hunger || 34));
    h.feedCool = def.cool || 200;
    const bonus = Math.floor(world.connected.size / 10) + Math.max(0, feederCount() - 1);
    world.seeds += (def.reward || 5) + bonus;
    h.state = "eat";
    h.timer = 40;
    syncStats();
    renderShop();
    playTone(def.id === "treat" || def.id === "buffet" ? 760 : 620, def.id === "treat" ? 980 : 840, 0.1, 0.07);
    saveGame();
    return true;
  }

  function updateHamster(h, dt) {
    h.bob += dt;
    h.hunger = Math.max(0, h.hunger - 0.012 * dt);
    if (h.feedCool > 0) h.feedCool = Math.max(0, h.feedCool - dt);

    if (h.moving) {
      h.moveT += dt * 0.09;
      if (h.moveT >= 1) {
        h.moveT = 1;
        h.c = h.toC;
        h.r = h.toR;
        h.moving = false;
        beginNextStep(h);
      }
      return;
    }

    if (h.state === "eat" || h.state === "play") {
      h.timer -= dt;
      if (h.timer <= 0) {
        h.state = "idle";
        h.timer = 35;
      }
      return;
    }

    h.timer -= dt;
    if (h.timer > 0) return;

    const here = world.grid[idx(h.c, h.r)];
    if (!here || !world.connected.has(idx(h.c, h.r))) {
      const rescue = [...world.connected][0];
      if (rescue != null) {
        h.c = rescue % COLS;
        h.r = Math.floor(rescue / COLS);
        stopHamster(h);
      }
      h.timer = 25;
      return;
    }

    if (h.hunger < 35) {
      if (here && pieceDef(here.id).feeder) {
        if (!eatAt(h)) h.timer = Math.max(30, h.feedCool || 30);
        return;
      }
      const path = bfs(h.c, h.r, (c, r) => {
        const tile = world.grid[idx(c, r)];
        return Boolean(tile && pieceDef(tile.id).feeder);
      });
      if (path.length) {
        startPath(h, path, "seekFood");
        return;
      }
      h.state = "hungry";
      h.timer = 45;
      return;
    }

    if (here && pieceDef(here.id).play && Math.random() < 0.3) {
      h.state = "play";
      h.timer = 55 + Math.random() * 35;
      return;
    }

    const target = pickWanderTarget(h);
    if (!target) {
      h.timer = 45;
      return;
    }
    const path = bfs(h.c, h.r, (c, r) => c === target.c && r === target.r);
    if (path.length) startPath(h, path, "walk");
    else h.timer = 35;
  }

  function update(dt) {
    world.t += dt;
    if (world.toastAt > 0) {
      world.toastAt -= dt;
      if (world.toastAt <= 0) toastEl.classList.add("is-hidden");
    }
    if (world.state !== STATE.PLAY) return;
    for (const h of world.hamsters) updateHamster(h, dt);
    updateSpawners(dt);

    world.drip += dt;
    if (world.drip >= 160) {
      world.drip = 0;
      const bonus = Math.floor(world.connected.size / 4) + Math.floor(feederCount() / 2);
      if (bonus > 0) {
        world.seeds += bonus;
        syncStats();
        renderShop();
      }
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
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    g.addColorStop(0, "#b9d9f2");
    g.addColorStop(1, "#8fb7d8");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "rgba(255,255,255,0.35)";
    roundRect(world.ox - 10, world.oy - 10, COLS * world.cell + 20, ROWS * world.cell + 20, 18);
    ctx.fill();
  }

  function drawOpenings(x, y, s, mask, color) {
    const mid = s / 2;
    const t = Math.max(10, s * 0.34);
    ctx.fillStyle = color;
    roundRect(x + 4, y + 4, s - 8, s - 8, 10);
    ctx.fill();
    ctx.fillStyle = "#5c3310";
    if (mask & 1) ctx.fillRect(x + mid - t / 2, y + 2, t, mid);
    if (mask & 4) ctx.fillRect(x + mid - t / 2, y + mid, t, mid - 2);
    if (mask & 8) ctx.fillRect(x + 2, y + mid - t / 2, mid, t);
    if (mask & 2) ctx.fillRect(x + mid, y + mid - t / 2, mid - 2, t);
  }

  function drawTileContent(tile, x, y, s, ghost) {
    const def = pieceDef(tile.id);
    ctx.globalAlpha = ghost ? 0.45 : 1;
    if (def.open) {
      ctx.fillStyle = def.color;
      roundRect(x + 3, y + 3, s - 6, s - 6, 12);
      ctx.fill();
      ctx.font = `${Math.floor(s * 0.42)}px Segoe UI, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(def.emoji, x + s / 2, y + s / 2 + 1);
    } else {
      drawOpenings(x, y, s, openings(tile), def.color);
    }
    ctx.globalAlpha = 1;
  }

  function drawGrid() {
    const s = world.cell;
    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        const x = world.ox + c * s;
        const y = world.oy + r * s;
        const i = idx(c, r);
        ctx.strokeStyle = "rgba(47, 63, 85, 0.12)";
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);

        const tile = world.grid[i];
        if (tile) {
          drawTileContent(tile, x, y, s, false);
          if (world.connected.has(i)) {
            ctx.strokeStyle = "rgba(63, 143, 216, 0.35)";
            ctx.lineWidth = 2;
            roundRect(x + 2, y + 2, s - 4, s - 4, 10);
            ctx.stroke();
          }
        }
      }
    }

    if (world.hover && world.placing && world.state === STATE.PLAY) {
      const { c, r } = world.hover;
      const x = world.ox + c * s;
      const y = world.oy + r * s;
      const ghost = makeTile(world.placing, world.rot);
      drawTileContent(ghost, x, y, s, true);
      ctx.strokeStyle = world.grid[idx(c, r)] ? "#e56b6f" : "#3f8fd8";
      ctx.lineWidth = 3;
      roundRect(x + 2, y + 2, s - 4, s - 4, 10);
      ctx.stroke();
    }
  }

  function drawHamster(h) {
    const pos = hamsterPos(h);
    const s = world.cell;
    const rad = s * 0.22;
    const bob = h.moving ? 0 : Math.sin(h.bob * 0.2) * 1.2;
    ctx.save();
    ctx.translate(pos.x, pos.y + bob);
    ctx.fillStyle = "rgba(47, 63, 85, 0.15)";
    ctx.beginPath();
    ctx.ellipse(0, rad * 0.9, rad * 0.9, rad * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = h.fur;
    ctx.beginPath();
    ctx.ellipse(0, 0, rad * 1.15, rad * 0.95, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = h.belly;
    ctx.beginPath();
    ctx.ellipse(rad * 0.15, rad * 0.1, rad * 0.55, rad * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2b211c";
    ctx.beginPath();
    ctx.arc(rad * 0.25, -rad * 0.15, 2.2, 0, Math.PI * 2);
    ctx.arc(rad * 0.55, -rad * 0.15, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = "#2f3f55";
    ctx.font = "700 11px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(h.name, pos.x, pos.y - rad - 8);

    const barW = s * 0.45;
    const bx = pos.x - barW / 2;
    const by = pos.y + rad + 6;
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    roundRect(bx, by, barW, 5, 3);
    ctx.fill();
    ctx.fillStyle = h.hunger < 30 ? "#e56b6f" : h.hunger < 60 ? "#f0a04b" : "#7ecf6a";
    roundRect(bx + 1, by + 1, (barW - 2) * (h.hunger / 100), 3, 2);
    ctx.fill();
  }

  function draw() {
    layout();
    drawBackground();
    drawGrid();
    for (const h of world.hamsters) drawHamster(h);
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

  function startPlay(fromSave) {
    unlockAudio();
    playTone(520, 720, 0.12, 0.08);
    layout();
    if (fromSave && loadGame()) showToast("Welcome back to the maze!");
    else freshMaze();
    world.state = STATE.PLAY;
    showScreen(null);
    setTab("tunnels");
    syncStats();
    updateHint();
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
    renderShop();
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

  for (const btn of document.querySelectorAll(".shop-tab")) {
    btn.addEventListener("click", () => setTab(btn.dataset.tab));
  }

  canvas.addEventListener("pointermove", (event) => {
    world.hover = cellFromEvent(event);
  });
  canvas.addEventListener("pointerleave", () => {
    world.hover = null;
  });
  canvas.addEventListener("pointerdown", (event) => {
    if (world.state !== STATE.PLAY || !world.placing) return;
    const cell = cellFromEvent(event);
    if (cell) placeAt(cell.c, cell.r);
  });
  canvas.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    world.placing = null;
    renderShop();
    updateHint();
  });

  window.addEventListener("keydown", (event) => {
    if (event.code === "KeyR" && world.placing) {
      const def = pieceDef(world.placing);
      if (def && def.rotate) {
        world.rot = (world.rot + 1) & 3;
        updateHint();
        playTone(480, 640, 0.06, 0.04);
      }
    }
    if (event.code === "Escape") {
      if (world.placing) {
        world.placing = null;
        renderShop();
        updateHint();
      } else if (world.state === STATE.PLAY) pauseGame();
      else if (world.state === STATE.PAUSE) resumeGame();
    }
  });

  window.addEventListener("beforeunload", saveGame);
  window.addEventListener("resize", layout);

  if (hasSave()) {
    newParkBtn.classList.remove("is-hidden");
    document.getElementById("playBtn").textContent = "Continue";
  }

  layout();
  freshMaze();
  world.state = STATE.TITLE;
  renderShop();
  updateMuteLabel();
  syncStats();
  showScreen("title");
  requestAnimationFrame(loop);
})();
