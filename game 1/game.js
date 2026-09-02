const PRICES = {
  food: 8,
  treat: 12,
  toy: 12,
  bed: 25,
};

const SLEEP_COOLDOWN_MS = 60_000;
const BED_SLEEP_COOLDOWN_MS = 30_000;

function sleepCooldownMs() {
  return state.hasBed ? BED_SLEEP_COOLDOWN_MS : SLEEP_COOLDOWN_MS;
}
const ACTION_COOLDOWN_MS = 2_000;

const ACTION_LABELS = {
  feed: "Feed",
  treat: "Treat",
  play: "Play",
  walk: "Walk (+coins)",
};

const PETS = {
  totoro: {
    id: "totoro",
    name: "Totoro",
    src: "assets/totoro.png",
    alt: "Totoro",
  },
  duck: {
    id: "duck",
    name: "Duck",
    src: "assets/duck.png",
    alt: "Cute duck with a balloon",
  },
  kitten: {
    id: "kitten",
    name: "Kitten",
    src: "assets/kitten.png",
    alt: "Cute kitten",
  },
  corgi: {
    id: "corgi",
    name: "Corgi",
    src: "assets/corgi.png",
    alt: "Cute corgi",
  },
};

const state = {
  hunger: 80,
  happiness: 80,
  energy: 80,
  coins: 40,
  food: 1,
  treats: 0,
  toys: 0,
  hasBed: false,
  sleepReadyAt: 0,
  currentAction: null,
  actingUntil: 0,
  petX: 0,
  petY: 0,
  facing: 1,
  roaming: true,
  gameStarted: false,
  selectedPet: null,
  actionReadyAt: {
    feed: 0,
    treat: 0,
    play: 0,
    walk: 0,
    pet: 0,
  },
};

const petSelect = document.getElementById("petSelect");
const gameApp = document.getElementById("gameApp");
const pet = document.getElementById("pet");
const petWrap = document.getElementById("petWrap");
const petArea = document.querySelector(".pet-area");
const reaction = document.getElementById("reaction");
const statusText = document.getElementById("statusText");

function petName() {
  return state.selectedPet ? state.selectedPet.name : "your pet";
}

function applyPetVoice() {
  DogSounds.setSpecies(state.selectedPet ? state.selectedPet.id : "corgi");
}

const hungerBar = document.getElementById("hungerBar");
const happinessBar = document.getElementById("happinessBar");
const energyBar = document.getElementById("energyBar");

const hungerValue = document.getElementById("hungerValue");
const happinessValue = document.getElementById("happinessValue");
const energyValue = document.getElementById("energyValue");
const coinValue = document.getElementById("coinValue");
const foodCount = document.getElementById("foodCount");
const treatCount = document.getElementById("treatCount");
const toyCount = document.getElementById("toyCount");
const bedPrice = document.getElementById("bedPrice");
const bedBtn = document.getElementById("bedBtn");

const feedBtn = document.getElementById("feedBtn");
const treatBtn = document.getElementById("treatBtn");
const playBtn = document.getElementById("playBtn");
const sleepBtn = document.getElementById("sleepBtn");
const wakeBtn = document.getElementById("wakeBtn");
const earnBtn = document.getElementById("earnBtn");
const muteBtn = document.getElementById("muteBtn");
const leaveBtn = document.getElementById("leaveBtn");

const accountLabel = document.getElementById("accountLabel");
const gameAccountLabel = document.getElementById("gameAccountLabel");
const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const logoutBtn = document.getElementById("logoutBtn");
const authModal = document.getElementById("authModal");
const authForm = document.getElementById("authForm");
const authTitle = document.getElementById("authTitle");
const authError = document.getElementById("authError");
const authUsername = document.getElementById("authUsername");
const authPassword = document.getElementById("authPassword");
const authConfirm = document.getElementById("authConfirm");
const authConfirmLabel = document.getElementById("authConfirmLabel");
const authSubmit = document.getElementById("authSubmit");
const authClose = document.getElementById("authClose");

let authMode = "login";

function clamp(value) {
  return Math.max(0, Math.min(100, value));
}

function remainingMs(readyAt) {
  return Math.max(0, readyAt - Date.now());
}

function isSleeping() {
  return remainingMs(state.sleepReadyAt) > 0 || state.currentAction === "nap";
}

function isActing() {
  return state.currentAction && remainingMs(state.actingUntil) > 0;
}

function isActionReady(key) {
  return remainingMs(state.actionReadyAt[key]) <= 0;
}

function startActionCooldown(key) {
  state.actionReadyAt[key] = Date.now() + ACTION_COOLDOWN_MS;
}

function cooldownLabel(key) {
  const waitMs = remainingMs(state.actionReadyAt[key]);
  if (waitMs > 0) {
    return `${ACTION_LABELS[key]} (${Math.ceil(waitMs / 1000)}s)`;
  }
  return ACTION_LABELS[key];
}

function updateMuteButton() {
  const muted = DogSounds.isMuted();
  muteBtn.textContent = muted ? "🔇" : "🔊";
  muteBtn.setAttribute("aria-label", muted ? "Unmute sounds" : "Mute sounds");
}

function showReaction(emoji) {
  reaction.textContent = emoji;
  reaction.classList.add("show");
  window.clearTimeout(showReaction.timer);
  showReaction.timer = window.setTimeout(() => {
    reaction.classList.remove("show");
  }, 900);
}

function roamBounds() {
  const pad = 6;
  const maxX = Math.max(pad, petArea.clientWidth - petWrap.offsetWidth - pad);
  const maxY = Math.max(pad, petArea.clientHeight - petWrap.offsetHeight - pad);
  return { minX: pad, minY: pad, maxX, maxY };
}

function applyPetPlace() {
  petWrap.style.left = `${state.petX}px`;
  petWrap.style.top = `${state.petY}px`;
  petWrap.style.transform = `scaleX(${state.facing})`;
  petWrap.classList.toggle("face-left", state.facing === -1);
}

function movePetTo(x, y, speed = 95) {
  const bounds = roamBounds();
  x = Math.min(bounds.maxX, Math.max(bounds.minX, x));
  y = Math.min(bounds.maxY, Math.max(bounds.minY, y));
  const dist = Math.hypot(x - state.petX, y - state.petY);
  const duration = Math.max(0.45, dist / speed);
  if (x !== state.petX) {
    state.facing = x >= state.petX ? 1 : -1;
  }
  state.petX = x;
  state.petY = y;
  petWrap.style.transition = `left ${duration}s linear, top ${duration}s linear`;
  applyPetPlace();
  return duration * 1000;
}

function randomRoomPoint() {
  const bounds = roamBounds();
  return {
    x: bounds.minX + Math.random() * (bounds.maxX - bounds.minX),
    y: bounds.minY + Math.random() * (bounds.maxY - bounds.minY),
  };
}

function centerPet() {
  const bounds = roamBounds();
  state.petX = (bounds.minX + bounds.maxX) / 2;
  state.petY = (bounds.minY + bounds.maxY) / 2;
  petWrap.style.transition = "none";
  applyPetPlace();
}

function isInGame() {
  return !gameApp.classList.contains("is-hidden");
}

function canRoam() {
  if (document.hidden || !isInGame()) return false;
  if (remainingMs(state.sleepReadyAt) > 0) return false;
  if (isActing()) return false;
  const stayPut = ["sit", "nap", "sniff", "scratch", "stretch", "spin", "eat", "sleep", "sleep-toss", "play", "walk"];
  return !stayPut.includes(state.currentAction);
}

function continueRoaming() {
  window.clearTimeout(continueRoaming.timer);
  if (!canRoam()) {
    continueRoaming.timer = window.setTimeout(continueRoaming, 400);
    return;
  }

  if (!pet.classList.contains("act-walk") && !isActing()) {
    pet.classList.add("act-walk");
  }

  const spot = randomRoomPoint();
  const travelMs = movePetTo(spot.x, spot.y);
  continueRoaming.timer = window.setTimeout(continueRoaming, travelMs + 180);
}

function clearDogActionClasses() {
  pet.classList.remove(
    "act-walk",
    "act-eat",
    "act-sleep",
    "act-sleep-toss",
    "act-sniff",
    "act-stretch",
    "act-scratch",
    "act-spin",
    "act-sit",
    "act-nap",
    "act-zoomies",
    "is-asleep"
  );
}

function updateMood() {
  if (isActing()) return;

  const average = (state.hunger + state.happiness + state.energy) / 3;
  pet.classList.remove("happy", "sleepy", "sad", "is-asleep");

  if (remainingMs(state.sleepReadyAt) > 0) {
    pet.classList.add("is-asleep");
  } else if (state.currentAction === "nap" || state.energy < 25) {
    pet.classList.add("sleepy");
  } else if (average < 35) {
    pet.classList.add("sad");
  }
}

function runWalkPath() {
  const points = [randomRoomPoint(), randomRoomPoint(), randomRoomPoint()];
  points.forEach((point, index) => {
    window.setTimeout(() => movePetTo(point.x, point.y, 115), index * 700);
  });
}

function settleForSleep() {
  const bounds = roamBounds();
  movePetTo((bounds.minX + bounds.maxX) / 2, bounds.maxY * 0.72, 70);
}

function stopSleepFidgets() {
  window.clearTimeout(stopSleepFidgets.timer);
}

function startSleepFidgets() {
  stopSleepFidgets();
  if (remainingMs(state.sleepReadyAt) <= 0 || !isInGame()) return;

  stopSleepFidgets.timer = window.setTimeout(() => {
    if (remainingMs(state.sleepReadyAt) <= 0 || !isInGame()) return;

    clearDogActionClasses();
    pet.classList.remove("happy", "sleepy", "sad", "is-asleep");
    pet.classList.add("act-sleep-toss");
    state.currentAction = "sleep-toss";
    state.actingUntil = Date.now() + 1000;

    const bounds = roamBounds();
    const nextX = Math.min(
      bounds.maxX,
      Math.max(bounds.minX, state.petX + (Math.random() * 50 - 25))
    );
    const nextY = Math.min(
      bounds.maxY,
      Math.max(bounds.minY, state.petY + (Math.random() * 24 - 8))
    );
    movePetTo(nextX, nextY, 35);
    showReaction("💤");

    window.setTimeout(() => {
      if (state.currentAction === "sleep-toss") {
        finishDogAction();
        if (remainingMs(state.sleepReadyAt) > 0) {
          pet.classList.add("is-asleep");
        }
      }
      startSleepFidgets();
    }, 1000);
  }, 3500 + Math.random() * 3500);
}

function performActionMotion(kind) {
  const configs = {
    eat: { className: "act-eat", duration: 1400 },
    play: { className: "act-zoomies", duration: 1800, move: "play" },
    walk: { className: "act-walk", duration: 2200, move: "walk" },
    sleep: { className: "act-sleep", duration: 1200, move: "sleep" },
  };
  const config = configs[kind];
  if (!config) return;

  clearDogActionClasses();
  pet.classList.remove("happy", "sleepy", "sad", "is-asleep");
  state.currentAction = kind;
  state.actingUntil = Date.now() + config.duration;
  pet.classList.add(config.className);

  if (config.move === "walk") {
    runWalkPath();
  } else if (config.move === "play") {
    runZoomies();
  } else if (config.move === "sleep") {
    settleForSleep();
  }

  window.clearTimeout(performActionMotion.timer);
  performActionMotion.timer = window.setTimeout(() => {
    if (state.currentAction !== kind) return;
    finishDogAction();
    if (kind === "sleep" || remainingMs(state.sleepReadyAt) > 0) {
      pet.classList.add("is-asleep");
      startSleepFidgets();
    }
    updateMood();
  }, config.duration);
}

function render() {
  hungerBar.style.width = `${state.hunger}%`;
  happinessBar.style.width = `${state.happiness}%`;
  energyBar.style.width = `${state.energy}%`;

  hungerValue.textContent = Math.round(state.hunger);
  happinessValue.textContent = Math.round(state.happiness);
  energyValue.textContent = Math.round(state.energy);
  coinValue.textContent = state.coins;
  foodCount.textContent = state.food;
  treatCount.textContent = state.treats;
  toyCount.textContent = state.toys;

  const feedWait = !isActionReady("feed");
  const treatWait = !isActionReady("treat");
  const playWait = !isActionReady("play");
  const walkWait = !isActionReady("walk");
  const sleeping = isSleeping();

  feedBtn.disabled = state.food < 1 || feedWait;
  treatBtn.disabled = state.treats < 1 || treatWait;
  playBtn.disabled = state.toys < 1 || state.energy < 12 || playWait;
  feedBtn.textContent = cooldownLabel("feed");
  treatBtn.textContent = cooldownLabel("treat");
  playBtn.textContent = cooldownLabel("play");

  if (sleeping) {
    earnBtn.disabled = true;
    earnBtn.textContent = "Walk (sleeping)";
  } else {
    earnBtn.disabled = walkWait;
    earnBtn.textContent = cooldownLabel("walk");
  }

  const sleepRemainingMs = remainingMs(state.sleepReadyAt);
  if (sleepRemainingMs > 0) {
    const secondsLeft = Math.ceil(sleepRemainingMs / 1000);
    sleepBtn.disabled = true;
    sleepBtn.textContent = `Sleep (${secondsLeft}s)`;
  } else {
    sleepBtn.disabled = false;
    sleepBtn.textContent = "Sleep";
  }

  wakeBtn.disabled = !sleeping;

  if (state.hasBed) {
    bedBtn.disabled = true;
    bedPrice.textContent = "Owned";
    bedBtn.classList.add("owned");
  } else {
    bedBtn.disabled = state.coins < PRICES.bed;
    bedPrice.textContent = `${PRICES.bed} coins`;
    bedBtn.classList.remove("owned");
  }

  document.querySelectorAll(".shop-item[data-item]").forEach((btn) => {
    const item = btn.dataset.item;
    if (item === "bed") return;
    btn.disabled = state.coins < PRICES[item];
  });

  updateMood();
}

function celebrate() {
  pet.classList.remove("happy");
  void pet.offsetWidth;
  pet.classList.add("happy");
}

function feed() {
  if (!isActionReady("feed")) {
    return;
  }

  if (state.food < 1) {
    statusText.textContent = "No food left — buy some in the shop!";
    showReaction("🛒");
    DogSounds.whimper();
    return;
  }

  state.food -= 1;
  state.hunger = clamp(state.hunger + 5);
  state.happiness = clamp(state.happiness + 4);
  state.energy = clamp(state.energy + 3);
  startActionCooldown("feed");
  statusText.textContent = "Yum! Dinner time.";
  showReaction("🍖");
  DogSounds.eat();
  performActionMotion("eat");
  render();
  saveProgress();
}

function giveTreat() {
  if (!isActionReady("treat")) {
    return;
  }

  if (state.treats < 1) {
    statusText.textContent = "No treats left — buy some first!";
    showReaction("🛒");
    DogSounds.whimper();
    return;
  }

  state.treats -= 1;
  state.happiness = clamp(state.happiness + 18);
  state.hunger = clamp(state.hunger + 10);
  startActionCooldown("treat");
  statusText.textContent = "Crunchy treat! Tail wagging!";
  showReaction("🦴");
  DogSounds.happy();
  celebrate();
  render();
  saveProgress();
}

function play() {
  if (!isActionReady("play")) {
    return;
  }

  if (state.toys < 1) {
    statusText.textContent = "Buy a toy before playtime!";
    showReaction("🛒");
    DogSounds.whimper();
    return;
  }

  if (state.energy < 12) {
    statusText.textContent = "Too tired to play right now.";
    showReaction("💤");
    DogSounds.whimper();
    return;
  }

  state.toys -= 1;
  state.happiness = clamp(state.happiness + 22);
  state.energy = clamp(state.energy - 10);
  state.hunger = clamp(state.hunger - 4);
  startActionCooldown("play");
  statusText.textContent = "Fetch! That was fun.";
  showReaction("🎾");
  DogSounds.play();
  performActionMotion("play");
  render();
  saveProgress();
}

function sleep() {
  const sleepRemainingMs = state.sleepReadyAt - Date.now();
  if (sleepRemainingMs > 0) {
    const secondsLeft = Math.ceil(sleepRemainingMs / 1000);
    statusText.textContent = `Still resting — wait ${secondsLeft}s.`;
    showReaction("⏳");
    return;
  }

  const energyGain = state.hasBed ? 34 : 20;
  const happinessGain = state.hasBed ? 8 : 3;

  state.energy = clamp(state.energy + energyGain);
  state.hunger = clamp(state.hunger - 3);
  state.happiness = clamp(state.happiness + happinessGain);
  state.sleepReadyAt = Date.now() + sleepCooldownMs();
  statusText.textContent = state.hasBed
    ? "Cozy bed nap... zzz"
    : "Nap time... a real bed would help!";
  showReaction("😴");
  DogSounds.sleep();
  performActionMotion("sleep");
  render();
  saveProgress();
}

function wakeUp() {
  if (!isSleeping()) {
    statusText.textContent = `${petName()} is already awake.`;
    showReaction("☀️");
    return;
  }

  state.sleepReadyAt = 0;
  stopSleepFidgets();
  if (state.currentAction === "nap" || state.currentAction === "sleep" || state.currentAction === "sleep-toss") {
    finishDogAction();
  }

  pet.classList.remove("sleepy", "is-asleep", "act-sleep", "act-sleep-toss");
  statusText.textContent = `${petName()} woke up!`;
  showReaction("☀️");
  DogSounds.happy();
  celebrate();
  render();
  saveProgress();
}

function earn() {
  if (isSleeping()) {
    statusText.textContent = "Can't walk while sleeping.";
    showReaction("😴");
    DogSounds.sleep();
    return;
  }

  if (!isActionReady("walk")) {
    return;
  }

  if (state.energy < 10) {
    statusText.textContent = "Too tired for a walk.";
    showReaction("💤");
    DogSounds.whimper();
    return;
  }

  const payout = 5 + Math.floor(Math.random() * 4);
  state.coins += payout;
  state.energy = clamp(state.energy - 8);
  state.happiness = clamp(state.happiness + 5);
  state.hunger = clamp(state.hunger - 2);
  startActionCooldown("walk");
  statusText.textContent = `Nice walk! You earned ${payout} coins.`;
  showReaction("🪙");
  DogSounds.walk();
  performActionMotion("walk");
  render();
  saveProgress();
}

function buy(item) {
  if (item === "bed") {
    if (state.hasBed) {
      statusText.textContent = `${petName()} already has a cozy bed.`;
      return;
    }
    if (state.coins < PRICES.bed) {
      statusText.textContent = "Not enough coins for a bed.";
      showReaction("💸");
      return;
    }
    state.coins -= PRICES.bed;
    state.hasBed = true;
    statusText.textContent = "Bought a cozy bed!";
    showReaction("🛏️");
    render();
    saveProgress();
    return;
  }

  const price = PRICES[item];
  if (state.coins < price) {
    statusText.textContent = "Not enough coins — try a walk!";
    showReaction("💸");
    return;
  }

  state.coins -= price;
  if (item === "food") {
    state.food += 1;
    statusText.textContent = "Bought food!";
    showReaction("🍖");
  } else if (item === "treat") {
    state.treats += 1;
    statusText.textContent = "Bought a treat!";
    showReaction("🦴");
  } else if (item === "toy") {
    state.toys += 1;
    statusText.textContent = "Bought a toy!";
    showReaction("🎾");
  }

  render();
  saveProgress();
}

function tick() {
  // Hunger drops slowly so you have time to earn and shop.
  state.hunger = clamp(state.hunger - 0.35);
  state.happiness = clamp(state.happiness - 0.45);

  // Energy regen speed = 100 - hunger
  // Example: hunger 24 → speed 76; hunger 80 → speed 20
  const regenSpeed = 100 - state.hunger;
  const energyGain = (regenSpeed / 100) * 5;
  state.energy = clamp(state.energy + energyGain);

  render();
  saveProgress();
}

feedBtn.addEventListener("click", feed);
treatBtn.addEventListener("click", giveTreat);
playBtn.addEventListener("click", play);
sleepBtn.addEventListener("click", sleep);
wakeBtn.addEventListener("click", wakeUp);
earnBtn.addEventListener("click", earn);

document.querySelectorAll(".shop-item").forEach((btn) => {
  btn.addEventListener("click", () => buy(btn.dataset.item));
});

pet.addEventListener("click", () => {
  if (!isActionReady("pet")) {
    return;
  }

  state.happiness = clamp(state.happiness + 3);
  startActionCooldown("pet");
  statusText.textContent = `${petName()} loves pets!`;
  showReaction("❤️");
  DogSounds.pet();
  celebrate();
  render();
});

muteBtn.addEventListener("click", () => {
  DogSounds.setMuted(!DogSounds.isMuted());
  updateMuteButton();
});

document.addEventListener("pointerdown", () => DogSounds.unlock());

function finishDogAction() {
  clearDogActionClasses();
  state.currentAction = null;
  state.actingUntil = 0;
  applyPetPlace();
  updateMood();
}

function startDogAction(action) {
  clearDogActionClasses();
  pet.classList.remove("happy", "sleepy", "sad");
  state.currentAction = action.name;
  state.actingUntil = Date.now() + action.duration;

  if (action.className) {
    pet.classList.add(action.className);
  }

  statusText.textContent = action.text;
  showReaction(action.emoji);
  action.sound();
  if (action.stats) action.stats();
  render();

  window.clearTimeout(startDogAction.timer);
  startDogAction.timer = window.setTimeout(() => {
    if (state.currentAction === action.name) {
      finishDogAction();
      render();
    }
  }, action.duration);
}

function wanderSomewhere() {
  const spot = randomRoomPoint();
  movePetTo(spot.x, spot.y, 90);
}

function runZoomies() {
  const bounds = roamBounds();
  const points = [
    { x: bounds.minX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.maxY },
    { x: bounds.minX, y: bounds.maxY },
    { x: bounds.maxX, y: bounds.minY },
    { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 },
  ];
  points.forEach((point, index) => {
    window.setTimeout(() => movePetTo(point.x, point.y, 240), index * 320);
  });
}

function pickDogAction() {
  if (state.energy < 28) return "nap";
  if (state.hunger < 30) return Math.random() < 0.6 ? "sniff" : "sit";
  if (state.happiness > 70 && state.energy > 40 && Math.random() < 0.4) {
    return Math.random() < 0.5 ? "zoomies" : "spin";
  }

  const options = ["wander", "wander", "wander", "bark", "sniff", "stretch", "scratch", "sit", "spin"];
  return options[Math.floor(Math.random() * options.length)];
}

function doDogAction() {
  if (document.hidden || !isInGame() || remainingMs(state.sleepReadyAt) > 0 || isActing()) {
    return;
  }

  const actions = {
    wander: {
      name: "wander",
      className: "act-walk",
      duration: 2200,
      text: "Walking around...",
      emoji: "🐾",
      sound: () => DogSounds.walk(),
      stats() {
        wanderSomewhere();
        state.happiness = clamp(state.happiness + 1);
      },
    },
    sniff: {
      name: "sniff",
      className: "act-sniff",
      duration: 1400,
      text: "What's that smell?",
      emoji: "👃",
      sound: () => DogSounds.bark({ startFreq: 340, endFreq: 140, duration: 0.1, volume: 0.16 }),
      stats() {
        state.happiness = clamp(state.happiness + 1);
      },
    },
    stretch: {
      name: "stretch",
      className: "act-stretch",
      duration: 1300,
      text: "Big stretch!",
      emoji: "✨",
      sound: () => DogSounds.walk(),
      stats() {
        state.energy = clamp(state.energy + 2);
      },
    },
    scratch: {
      name: "scratch",
      className: "act-scratch",
      duration: 1100,
      text: "Scratch, scratch...",
      emoji: "🐾",
      sound: () => DogSounds.pet(),
      stats() {
        state.happiness = clamp(state.happiness + 2);
      },
    },
    spin: {
      name: "spin",
      className: "act-spin",
      duration: 1200,
      text: "Chasing that tail!",
      emoji: "🌀",
      sound: () => DogSounds.play(),
      stats() {
        state.happiness = clamp(state.happiness + 3);
        state.energy = clamp(state.energy - 3);
      },
    },
    sit: {
      name: "sit",
      className: "act-sit",
      duration: 2200,
      text: `Sitting like a good ${petName()}.`,
      emoji: "⭐",
      sound: () => DogSounds.pet(),
      stats() {
        state.energy = clamp(state.energy + 1);
      },
    },
    bark: {
      name: "bark",
      className: "happy",
      duration: 700,
      text: "Woof!",
      emoji: "💬",
      sound: () => DogSounds.bark(),
      stats() {
        state.happiness = clamp(state.happiness + 1);
      },
    },
    zoomies: {
      name: "zoomies",
      className: "act-zoomies",
      duration: 1800,
      text: "Zoomies!!",
      emoji: "💨",
      sound: () => DogSounds.play(),
      stats() {
        state.happiness = clamp(state.happiness + 4);
        state.energy = clamp(state.energy - 6);
        state.hunger = clamp(state.hunger - 2);
        runZoomies();
      },
    },
    nap: {
      name: "nap",
      className: "act-nap",
      duration: 8000,
      text: "Took a little nap...",
      emoji: "😴",
      sound: () => DogSounds.sleep(),
      stats() {
        state.energy = clamp(state.energy + 8);
        state.hunger = clamp(state.hunger - 1);
      },
    },
  };

  startDogAction(actions[pickDogAction()]);
}

function scheduleDogActions() {
  const delay = 6000 + Math.random() * 4000;
  window.setTimeout(() => {
    doDogAction();
    scheduleDogActions();
  }, delay);
}

function hasActiveCooldown() {
  if (isSleeping() || isActing()) return true;
  return Object.values(state.actionReadyAt).some((readyAt) => remainingMs(readyAt) > 0);
}

function updateAccountUI() {
  const username = Auth.currentUser();
  if (username) {
    accountLabel.textContent = `Hi, ${username}!`;
    gameAccountLabel.textContent = username;
    gameAccountLabel.classList.remove("is-hidden");
    loginBtn.classList.add("is-hidden");
    signupBtn.classList.add("is-hidden");
    logoutBtn.classList.remove("is-hidden");
  } else {
    accountLabel.textContent = "Playing as Guest";
    gameAccountLabel.textContent = "";
    gameAccountLabel.classList.add("is-hidden");
    loginBtn.classList.remove("is-hidden");
    signupBtn.classList.remove("is-hidden");
    logoutBtn.classList.add("is-hidden");
  }
}

function showAuthError(message) {
  if (!message) {
    authError.hidden = true;
    authError.textContent = "";
    return;
  }
  authError.hidden = false;
  authError.textContent = message;
}

function openAuthModal(mode) {
  authMode = mode;
  showAuthError("");
  authForm.reset();
  authTitle.textContent = mode === "signup" ? "Sign Up" : "Log In";
  authSubmit.textContent = mode === "signup" ? "Create Account" : "Log In";
  authConfirmLabel.classList.toggle("is-hidden", mode !== "signup");
  authConfirm.required = mode === "signup";
  authPassword.autocomplete = mode === "signup" ? "new-password" : "current-password";
  authModal.classList.remove("is-hidden");
  authUsername.focus();
}

function closeAuthModal() {
  authModal.classList.add("is-hidden");
  showAuthError("");
}

function collectSaveData() {
  return {
    petId: state.selectedPet ? state.selectedPet.id : null,
    hunger: state.hunger,
    happiness: state.happiness,
    energy: state.energy,
    coins: state.coins,
    food: state.food,
    treats: state.treats,
    toys: state.toys,
    hasBed: state.hasBed,
    savedAt: Date.now(),
  };
}

function applySaveData(save) {
  if (!save) return false;
  if (save.petId && PETS[save.petId]) {
    state.selectedPet = PETS[save.petId];
    pet.src = state.selectedPet.src;
    pet.alt = state.selectedPet.alt;
    applyPetVoice();
  }
  state.hunger = clamp(Number(save.hunger ?? state.hunger));
  state.happiness = clamp(Number(save.happiness ?? state.happiness));
  state.energy = clamp(Number(save.energy ?? state.energy));
  state.coins = Math.max(0, Number(save.coins ?? state.coins));
  state.food = Math.max(0, Number(save.food ?? state.food));
  state.treats = Math.max(0, Number(save.treats ?? state.treats));
  state.toys = Math.max(0, Number(save.toys ?? state.toys));
  state.hasBed = Boolean(save.hasBed);
  return Boolean(state.selectedPet);
}

function saveProgress() {
  if (!Auth.currentUser() || !state.selectedPet) return;
  Auth.saveGame(collectSaveData());
}

function enterGameScreen(message) {
  petSelect.classList.add("is-hidden");
  gameApp.classList.remove("is-hidden");
  if (message) {
    statusText.textContent = message;
  }
}

function resumeFromSave(save, message) {
  if (!applySaveData(save) || !state.selectedPet) {
    return false;
  }

  enterGameScreen(message || `Welcome back! ${petName()} missed you!`);
  startGame();
  render();
  saveProgress();
  return true;
}

function leaveGame() {
  if (!isInGame()) return;

  saveProgress();
  stopSleepFidgets();
  if (typeof finishDogAction === "function") {
    finishDogAction();
  }

  gameApp.classList.add("is-hidden");
  petSelect.classList.remove("is-hidden");
  updateAccountUI();

  const username = Auth.currentUser();
  accountLabel.textContent = username
    ? `Hi, ${username}! Pick a pet.`
    : "Playing as Guest";
}

function choosePet(petId) {
  const chosen = PETS[petId];
  if (!chosen) return;
  if (isInGame()) return;

  // Keep coins/items if this account already has a save.
  const existingSave = Auth.currentUser() ? Auth.loadSave() : null;
  if (existingSave && !state.gameStarted) {
    applySaveData(existingSave);
  }

  state.selectedPet = chosen;
  pet.src = chosen.src;
  pet.alt = chosen.alt;
  applyPetVoice();

  enterGameScreen(`${chosen.name} is ready to play!`);
  showReaction("❤️");
  DogSounds.happy();

  if (!state.gameStarted) {
    startGame();
  } else {
    updateAccountUI();
    render();
    window.requestAnimationFrame(() => centerPet());
  }
  saveProgress();
}

function startGame() {
  if (state.gameStarted) return;
  state.gameStarted = true;

  updateMuteButton();
  updateAccountUI();
  render();
  saveProgress();

  window.requestAnimationFrame(() => {
    centerPet();
    continueRoaming();
  });

  window.addEventListener("resize", () => {
    const bounds = roamBounds();
    state.petX = Math.min(bounds.maxX, Math.max(bounds.minX, state.petX));
    state.petY = Math.min(bounds.maxY, Math.max(bounds.minY, state.petY));
    applyPetPlace();
  });

  window.setTimeout(() => {
    doDogAction();
    scheduleDogActions();
  }, 2500);

  window.setInterval(tick, 5000);
  window.setInterval(() => {
    if (hasActiveCooldown() || sleepBtn.textContent !== "Sleep") {
      render();
    }
  }, 250);
  window.setInterval(saveProgress, 60_000);
  window.addEventListener("beforeunload", saveProgress);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) saveProgress();
  });
}

document.querySelectorAll(".pet-choice").forEach((btn) => {
  btn.addEventListener("click", () => choosePet(btn.dataset.pet));
});

leaveBtn.addEventListener("click", leaveGame);

loginBtn.addEventListener("click", () => openAuthModal("login"));
signupBtn.addEventListener("click", () => openAuthModal("signup"));
authClose.addEventListener("click", closeAuthModal);
authModal.addEventListener("click", (event) => {
  if (event.target === authModal) closeAuthModal();
});

logoutBtn.addEventListener("click", () => {
  saveProgress();
  Auth.logout();
  updateAccountUI();
  if (state.gameStarted) {
    statusText.textContent = "Logged out. Progress stays on this account.";
  } else {
    accountLabel.textContent = "Playing as Guest";
  }
});

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  showAuthError("");

  const username = authUsername.value;
  const password = authPassword.value;

  if (authMode === "signup") {
    if (password !== authConfirm.value) {
      showAuthError("Passwords do not match.");
      return;
    }
    const result = await Auth.signup(username, password);
    if (!result.ok) {
      showAuthError(result.error);
      return;
    }
    closeAuthModal();
    updateAccountUI();
    accountLabel.textContent = `Welcome, ${result.username}!`;

    // If they already started as guest, keep that progress on the new account.
    if (state.gameStarted && state.selectedPet) {
      saveProgress();
      statusText.textContent = `Account created! Progress will be saved for ${result.username}.`;
    }
    return;
  }

  const result = await Auth.login(username, password);
  if (!result.ok) {
    showAuthError(result.error);
    return;
  }

  closeAuthModal();
  updateAccountUI();

  if (result.save?.petId && PETS[result.save.petId]) {
    if (!state.gameStarted) {
      resumeFromSave(result.save, `Welcome back, ${result.username}! Progress restored.`);
    } else {
      applySaveData(result.save);
      render();
      saveProgress();
      statusText.textContent = `Welcome back, ${result.username}! Progress restored.`;
    }
    return;
  }

  if (state.gameStarted && state.selectedPet) {
    saveProgress();
    statusText.textContent = `Welcome, ${result.username}! Your progress will now be saved.`;
  } else {
    accountLabel.textContent = `Welcome back, ${result.username}! Pick a pet to start saving.`;
  }
});

updateMuteButton();
updateAccountUI();

// Auto-resume saved progress when a logged-in account reopens the site.
(() => {
  const username = Auth.currentUser();
  const save = Auth.loadSave();
  if (username && save?.petId && PETS[save.petId]) {
    resumeFromSave(save, `Welcome back, ${username}! Progress restored.`);
  }
})();
