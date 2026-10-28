'use strict';
/*
 ═══════════════════════════════════════════════════════════════════
  FRIENDSLOP TRUCK — MULTIPLAYER · server.js
  Server-authoritative co-op pre 2 hráčov: ŠOFÉR (id 1) + STRELEC (id 2).
  Klienti posielajú len input, server počíta všetko a každých 50 ms
  rozošle stav (tick).

  HOST:
    1. Nainštaluj Node.js 18+ a Hamachi
    2. V Hamachi: Sieť → Vytvoriť novú sieť, daj heslo kamarátovi
    3. npm install && node server.js
    4. Otvor client.html v prehliadači (adresa: localhost)
    5. Svoju Hamachi IP (25.x.x.x) pošli kamarátovi
  CLIENT:
    1. Nainštaluj Hamachi, pripoj sa do hostovej siete
    2. V client.html zmeň HOST_IP na Hamachi IP hostu
       (alebo ju napíš na úvodnej obrazovke klienta)
    3. Otvor client.html v prehliadači
    4. Počkaj na "Pripojený ako Strelec 🎯"
 ═══════════════════════════════════════════════════════════════════
*/
'use strict';
const { WebSocketServer, WebSocket } = require('ws');
const os = require('os');

// ─── 1. KONŠTANTY ─────────────────────────────────────────────────
const PORT = 3000;
const TICK_MS = 100;                      // ZMENA: Znížené z 50 na 100 (10x za sekundu = polovičná záťaž siete)
const MAX_DT = 0.1;
const RECONNECT_TIMEOUT = 10;
const HEARTBEAT_MS = 5000;
const COLORS = { 1: '#FF6B35', 2: '#4FC3F7' };
const ROLES = { 1: 'driver', 2: 'gunner' };

// ACT 1 — sklad
const WH = { minX: -10.8, maxX: 10.8, minZ: -7.4, maxZ: 9.2 };
const PLAYER_SPEED = 7;
const PICKUP_RADIUS = 1.5;
const LOAD_ZONE = { minX: -3, maxX: 3, minZ: 6.5, maxZ: 9.5 };
const WAREHOUSE_COMPLETE_DELAY = 1.8;
const BOX_SPOTS = (() => {
  const spots = [];
  for (const x of [-10, -5, 0, 5, 10]) {
    spots.push({ x: x - 0.8, z: -8.6 }, { x: x + 0.8, z: -8.6 });
  }
  for (const side of [-1, 1]) {
    for (const z of [-3, 2]) spots.push({ x: side * 11.8, z: z - 0.8 }, { x: side * 11.8, z: z + 0.8 });
  }
  return spots;
})();

// ACT 2 — diaľnica
const TRIP_DIST = 600;
const STEER_SPEED = 6;
const TRUCK_CLAMP = 2.5;
const BASE_SPEED = 14;
const SPEED_PER_ENGINE = 4;
const FUEL_DRAIN = 0.008;
const TRUCK_HALF_W = 1.3;
const TRUCK_HALF_L = 4.6;
const DESPAWN_BEHIND = 40;
const MAX_THREATS = 10;
const GUN_CAM = { fov: 60, y: 10, back: 12, lookY: 1, lookAhead: 25 };
const THREAT_AIM_Y = 1.0;
const AIM_TOLERANCE = 0.08;
const THREAT_RADIUS = 1.1;
const GUN_COOLDOWN = 0.4;
const GUN_COOLDOWN_PER_HORN = 0.08;
const HORN_RANGE = 18, HORN_RANGE_PER = 6;
const HORN_STUN = 2, HORN_STUN_PER = 0.5;
const HORN_CD = 3, HORN_CD_PER = 0.5;
const ARMOR_REDUCTION = 0.2;

// ACT 3 — shop
const UPGRADE_KEYS = ['engine', 'armor', 'horn', 'warehouse'];
const UPGRADE_COST = [100, 200, 350];
const MAX_LEVEL = 3;
const PAY_BASE = 40;
const PAY_PER_BOX = 30;

// ─── 2. STATE ─────────────────────────────────────────────────────
function makePlayer(id) {
  return { x: id === 1 ? -2 : 2, z: 3, color: COLORS[id], role: ROLES[id], connected: false };
}

function freshState() {
  return {
    phase: 'waiting',
    players: { 1: makePlayer(1), 2: makePlayer(2) },
    boxes: [],
    threats: [],
    cargo: 1,
    fuel: 1,
    dist: 0,
    cash: 0,
    upgrades: { engine: 0, armor: 0, horn: 0, warehouse: 0 },
    gunCooldown: 0,
    hornCooldown: 0,
    spawnTimer: 2.5,
    threatId: 1,
    truckX: 0,
    trip: 1,
    kills: 0,
    totalBoxes: 0,
    loadedCount: 0,
    completeTimer: -1,
    pausedFor: 0,
    pauseTimer: 0,
    lastTrip: null,
    totalEarned: 0,
    reason: '',
  };
}

let state = freshState();
const sockets = { 1: null, 2: null };
const inputs = { 1: blankInput(), 2: blankInput() };
let events = [];
let shotHits = [];

// ZMENA: Sieťový monitor pre konzolu
const netStats = { rx1: 0, rx2: 0, txBytes: 0 };
setInterval(() => {
  const kbps = (netStats.txBytes / 1024).toFixed(2);
  console.log(`[NET LOG] Prijaté: Hráč1 (${netStats.rx1}x), Hráč2 (${netStats.rx2}x) | Server odosiela: ${kbps} KB/s`);
  netStats.rx1 = 0; netStats.rx2 = 0; netStats.txBytes = 0;
}, 1000);

function blankInput() {
  return { left: false, right: false, horn: false, moveX: 0, moveZ: 0, aspect: 16 / 9 };
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const num = (v, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const r3 = (v) => Math.round(v * 1000) / 1000;

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const truckSpeed = () => BASE_SPEED + state.upgrades.engine * SPEED_PER_ENGINE;
const gunCooldownMax = () => Math.max(0.08, GUN_COOLDOWN - state.upgrades.horn * GUN_COOLDOWN_PER_HORN);
const hornRange = () => HORN_RANGE + state.upgrades.horn * HORN_RANGE_PER;
const hornStun = () => HORN_STUN + state.upgrades.horn * HORN_STUN_PER;
const hornCooldownMax = () => HORN_CD - state.upgrades.horn * HORN_CD_PER;
const bothConnected = () => state.players[1].connected && state.players[2].connected;

function emit(t, data = {}) { events.push({ t, ...data }); }

function send(ws, obj) {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
}

function trailerSlot(i) {
  return { x: ((i % 3) - 1) * 1.05, z: 10.9 + Math.floor(i / 3) * 1.1 };
}

function inLoadZone(p) {
  return p.x >= LOAD_ZONE.minX && p.x <= LOAD_ZONE.maxX && p.z >= LOAD_ZONE.minZ && p.z <= LOAD_ZONE.maxZ;
}

function setGameover(reason) {
  state.phase = 'gameover';
  state.reason = reason;
  state.pausedFor = 0;
  state.threats = [];
  emit('gameover', { reason });
  console.log(`[game] GAME OVER — ${reason}`);
}

function startWarehouse() {
  const s = state;
  s.phase = 'warehouse';
  s.totalBoxes = 8 + s.upgrades.warehouse * 2;
  s.loadedCount = 0;
  s.completeTimer = -1;
  s.boxes = shuffle(BOX_SPOTS.slice()).slice(0, s.totalBoxes)
    .map((p, i) => ({ id: i, x: p.x, z: p.z, loaded: false, carriedBy: null }));
  s.players[1].x = -2; s.players[1].z = 3;
  s.players[2].x = 2; s.players[2].z = 3;
  for (const id of [1, 2]) { inputs[id].absX = undefined; inputs[id].absZ = undefined; }
  s.threats = [];
  s.cargo = 1; s.fuel = 1; s.dist = 0; s.truckX = 0;
  console.log(`[game] Jazda #${s.trip}: sklad`);
}

function startDriving() {
  const s = state;
  s.phase = 'driving';
  s.completeTimer = -1;
  s.truckX = 0; s.dist = 0; s.cargo = 1; s.fuel = 1;
  inputs[1].absTruckX = undefined;
  s.threats = [];
  s.spawnTimer = 2.5;
  s.gunCooldown = 0; s.hornCooldown = 0;
  s.kills = 0;
  console.log(`[game] Jazda #${s.trip}: diaľnica`);
}

function spawnThreat() {
  const s = state;
  const speed = truckSpeed();
  const truckZ = -s.dist;
  const side = Math.random() < 0.5 ? -1 : 1;
  const banditChance = Math.min(0.6, 0.3 + (s.trip - 1) * 0.06);

  if (Math.random() < banditChance) {
    s.threats.push({ id: s.threatId++, type: 'bandit', x: side * rand(6, 8), z: truckZ - rand(50, 75), dir: -side, stunned: 0, hp: 1, speed: rand(2.5, 3.6), fwd: speed * rand(0.35, 0.55), damage: 0.2 });
  } else {
    const ahead = rand(75, 110);
    const tArrive = ahead / speed;
    const spd = rand(3.5, 5.5);
    s.threats.push({ id: s.threatId++, type: 'deer', x: side * clamp(spd * tArrive + rand(-3, 1), 8, 28), z: truckZ - ahead, dir: -side, stunned: 0, hp: 1, speed: spd, fwd: 0, damage: 0.12 });
  }
}

function threatTick(dt) {
  const s = state;
  const truckZ = -s.dist;
  s.spawnTimer -= dt;
  if (s.spawnTimer <= 0) {
    if (s.dist < TRIP_DIST - 80 && s.threats.length < MAX_THREATS) spawnThreat();
    const base = 2.4 - (s.dist / TRIP_DIST) * 0.8 - (s.trip - 1) * 0.15;
    s.spawnTimer = Math.max(0.7, base) * rand(0.7, 1.3);
  }

  for (const t of s.threats) {
    if (t.stunned > 0) { t.stunned = Math.max(0, t.stunned - dt); continue; }
    if (t.type === 'deer') {
      t.x += t.dir * t.speed * dt;
    } else {
      t.z -= t.fwd * dt;
      const dz = t.z - truckZ;
      if (dz > -30 && dz < 6) {
        const dx = s.truckX - t.x;
        t.x += clamp(dx, -t.speed * dt, t.speed * dt);
      }
    }
  }

  for (const t of s.threats) {
    if (t.hp <= 0) continue;
    if (Math.abs(t.x - s.truckX) < TRUCK_HALF_W + 0.5 && Math.abs(t.z - truckZ) < TRUCK_HALF_L) {
      t.hp = 0;
      const dmg = t.damage * (1 - s.upgrades.armor * ARMOR_REDUCTION);
      s.cargo = Math.max(0, s.cargo - dmg);
      emit('crash', { id: t.id, type: t.type, dmg: r3(dmg) });
    }
  }

  s.threats = s.threats.filter((t) => t.hp > 0 && t.z < truckZ + DESPAWN_BEHIND && Math.abs(t.x) < 34);
}

function tryHorn() {
  const s = state;
  if (s.phase !== 'driving' || s.pausedFor || s.hornCooldown > 0) return;
  s.hornCooldown = hornCooldownMax();
  const range = hornRange();
  const stun = hornStun();
  const truckZ = -s.dist;
  let n = 0;
  for (const t of s.threats) {
    if (Math.hypot(t.x - s.truckX, t.z - truckZ) <= range) { t.stunned = stun; n++; }
  }
  emit('horn', { stunned: n, range });
}

function projectToGunner(t, aspect) {
  const truckZ = -state.dist;
  const cx = state.truckX, cy = GUN_CAM.y, cz = truckZ + GUN_CAM.back;
  let fx = state.truckX - cx, fy = GUN_CAM.lookY - cy, fz = truckZ - GUN_CAM.lookAhead - cz;
  const fl = Math.hypot(fx, fy, fz); fx /= fl; fy /= fl; fz /= fl;
  let rx = -fz, ry = 0, rz = fx;
  const rl = Math.hypot(rx, ry, rz); rx /= rl; rz /= rl;
  const ux = ry * fz - rz * fy, uy = rz * fx - rx * fz, uz = rx * fy - ry * fx;
  const dx = t.x - cx, dy = THREAT_AIM_Y - cy, dz = t.z - cz;
  const xc = dx * rx + dy * ry + dz * rz;
  const yc = dx * ux + dy * uy + dz * uz;
  const zc = dx * fx + dy * fy + dz * fz;
  if (zc < 0.5) return null;
  const tanHalf = Math.tan((GUN_CAM.fov * Math.PI) / 360);
  return { x: xc / (zc * tanHalf * aspect), y: yc / (zc * tanHalf), depth: zc, tanHalf };
}

function tryShoot(aimX, aimY, aspect) {
  const s = state;
  if (s.phase !== 'driving' || s.pausedFor || s.gunCooldown > TICK_MS / 1000) return;
  s.gunCooldown = gunCooldownMax();
  aimX = clamp(aimX, -1, 1);
  aimY = clamp(aimY, -1, 1);
  let best = null, bestScore = Infinity;
  for (const t of s.threats) {
    if (t.hp <= 0) continue;
    const p = projectToGunner(t, aspect);
    if (!p || Math.abs(p.x) > 1.3 || Math.abs(p.y) > 1.3) continue;
    const tolX = Math.max(AIM_TOLERANCE, THREAT_RADIUS / (p.depth * p.tanHalf * aspect));
    const tolY = Math.max(AIM_TOLERANCE, THREAT_RADIUS / (p.depth * p.tanHalf));
    const ex = Math.abs(p.x - aimX), ey = Math.abs(p.y - aimY);
    if (ex < tolX && ey < tolY) {
      const score = ex / tolX + ey / tolY;
      if (score < bestScore) { bestScore = score; best = t; }
    }
  }
  if (best) {
    best.hp = 0;
    s.threats = s.threats.filter((t) => t !== best);
    shotHits.push(best.id);
    s.kills++;
  }
  emit('shot', { hit: !!best });
}

function warehouseTick(dt) {
  const s = state;
  for (const id of [1, 2]) {
    const p = s.players[id];
    if (!p.connected) continue;
    const inp = inputs[id];
    if (inp.absX !== undefined) {
      const maxStep = PLAYER_SPEED * 1.5 * dt;
      p.x += clamp(clamp(inp.absX, WH.minX, WH.maxX) - p.x, -maxStep, maxStep);
      p.z += clamp(clamp(inp.absZ, WH.minZ, WH.maxZ) - p.z, -maxStep, maxStep);
    }
    const carried = s.boxes.find((b) => b.carriedBy === id);
    if (carried) {
      carried.x = p.x; carried.z = p.z;
      if (inLoadZone(p)) {
        const slot = trailerSlot(s.loadedCount);
        carried.carriedBy = null;
        carried.loaded = true;
        carried.x = slot.x; carried.z = slot.z;
        s.loadedCount++;
        emit('loaded', { by: id, n: s.loadedCount });
      }
    } else if (s.completeTimer < 0) {
      let best = null, bd = PICKUP_RADIUS;
      for (const b of s.boxes) {
        if (b.loaded || b.carriedBy) continue;
        const d = Math.hypot(b.x - p.x, b.z - p.z);
        if (d < bd) { bd = d; best = b; }
      }
      if (best) { best.carriedBy = id; emit('pickup', { by: id }); }
    }
  }

  if (s.completeTimer < 0) {
    if (s.loadedCount >= s.totalBoxes) {
      s.completeTimer = WAREHOUSE_COMPLETE_DELAY;
      emit('warehouseComplete');
    }
  } else {
    s.completeTimer -= dt;
    if (s.completeTimer <= 0) startDriving();
  }
}

function drivingTick(dt) {
  const s = state;
  const inp = inputs[1];
  if (inp.absTruckX !== undefined) {
    const maxStep = STEER_SPEED * 1.5 * dt;
    s.truckX += clamp(clamp(inp.absTruckX, -TRUCK_CLAMP, TRUCK_CLAMP) - s.truckX, -maxStep, maxStep);
  }
  s.dist = Math.min(TRIP_DIST, s.dist + truckSpeed() * dt);
  s.fuel = Math.max(0, s.fuel - (FUEL_DRAIN / (1 + s.upgrades.engine * 0.1)) * dt);
  s.gunCooldown = Math.max(0, s.gunCooldown - dt);
  s.hornCooldown = Math.max(0, s.hornCooldown - dt);

  threatTick(dt);

  if (s.cargo <= 0) return setGameover('Náklad je zničený 📦💥');
  if (s.fuel <= 0) return setGameover('Došlo palivo ⛽');

  if (s.dist >= TRIP_DIST) {
    const pay = Math.round(PAY_BASE + s.totalBoxes * PAY_PER_BOX * s.cargo);
    s.cash += pay;
    s.totalEarned += pay;
    s.lastTrip = { trip: s.trip, pay, cargo: r3(s.cargo), boxes: s.totalBoxes, kills: s.kills };
    s.phase = 'shop';
    s.threats = [];
    emit('arrived', { pay });
  }
}

function handleShop(id, msg) {
  const s = state;
  if (id !== 1) return;
  if (msg.type === 'buy' && s.phase === 'shop' && !s.pausedFor) {
    const key = msg.key;
    if (!UPGRADE_KEYS.includes(key)) return;
    const lvl = s.upgrades[key];
    if (lvl >= MAX_LEVEL) return;
    const cost = UPGRADE_COST[lvl];
    if (s.cash < cost) return;
    s.cash -= cost;
    s.upgrades[key] = lvl + 1;
    emit('upgrade', { key, level: lvl + 1 });
  } else if (msg.type === 'next' && s.phase === 'shop' && !s.pausedFor) {
    s.trip++;
    startWarehouse();
  } else if (msg.type === 'restart' && s.phase === 'gameover') {
    state = freshState();
    state.players[1].connected = !!sockets[1];
    state.players[2].connected = !!sockets[2];
    if (bothConnected()) startWarehouse();
  }
}

function handleMessage(id, msg) {
  if (!msg || typeof msg !== 'object') return;
  if (msg.type === 'input') {
    const inp = inputs[id];
    if (msg.pos && typeof msg.pos === 'object' && Number.isFinite(msg.pos.x) && Number.isFinite(msg.pos.z)) {
      inp.absX = msg.pos.x;
      inp.absZ = msg.pos.z;
    }
    if (id === 1 && Number.isFinite(msg.truckX)) {
      inp.absTruckX = msg.truckX;
    }
    if (id === 1 && msg.keys && typeof msg.keys === 'object') {
      const hornNow = !!msg.keys.horn;
      if (hornNow && !inp.horn) tryHorn();
      inp.horn = hornNow;
    }
    if (id === 2) {
      if (msg.aspect !== undefined) inp.aspect = clamp(num(msg.aspect, 16 / 9), 0.3, 4);
      if (msg.shoot) tryShoot(num(msg.aimX), num(msg.aimY), inp.aspect);
    }
  } else if (msg.type === 'buy' || msg.type === 'next' || msg.type === 'restart') {
    handleShop(id, msg);
  }
}

const wss = new WebSocketServer({ port: PORT });

wss.on('connection', (ws, req) => {
  const id = !sockets[1] ? 1 : !sockets[2] ? 2 : 0;
  if (!id) {
    send(ws, { type: 'full' });
    ws.close();
    return;
  }
  sockets[id] = ws;
  inputs[id] = blankInput();
  state.players[id].connected = true;
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  send(ws, { type: 'init', id, role: ROLES[id], color: COLORS[id] });
  emit('join', { id });
  console.log(`[net] Hráč ${id} pripojený.`);

  if (state.pausedFor === id) state.pausedFor = 0;
  if (state.phase === 'waiting' && bothConnected()) startWarehouse();

  ws.on('message', (raw) => {
    if (sockets[id] !== ws) return;
    
    // ZMENA: Zapíšeme prijatý paket do logu
    if (id === 1) netStats.rx1++;
    if (id === 2) netStats.rx2++;

    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }
    try { handleMessage(id, msg); } catch (e) { console.error('[msg]', e); }
  });

  ws.on('close', () => {
    if (sockets[id] !== ws) return;
    sockets[id] = null;
    inputs[id] = blankInput();
    state.players[id].connected = false;
    for (const b of state.boxes) if (b.carriedBy === id) b.carriedBy = null;
    emit('leave', { id });
    if (!sockets[1] && !sockets[2]) {
      state = freshState();
      return;
    }
    if (['warehouse', 'driving', 'shop'].includes(state.phase)) {
      state.pausedFor = id;
      state.pauseTimer = RECONNECT_TIMEOUT;
    }
  });
});

wss.on('listening', () => {
  console.log('══════════════════════════════════════════════');
  console.log('  SERVER BEŽÍ');
  console.log('══════════════════════════════════════════════');
});

setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.isAlive === false) { ws.terminate(); continue; }
    ws.isAlive = false;
    try { ws.ping(); } catch { }
  }
}, HEARTBEAT_MS);

function step(dt) {
  const s = state;
  if (s.pausedFor) {
    s.pauseTimer -= dt;
    if (s.pauseTimer <= 0) setGameover(`Hráč ${s.pausedFor} sa nevrátil včas`);
    return;
  }
  if (s.phase === 'warehouse') warehouseTick(dt);
  else if (s.phase === 'driving') drivingTick(dt);
}

function tickPayload() {
  const s = state;
  const pl = (id) => ({ x: r3(s.players[id].x), z: r3(s.players[id].z), connected: s.players[id].connected });
  
  // ZMENA: Obrovská úspora dát - škatule posielame LEN ak sme v sklade
  const boxesPayload = s.phase === 'warehouse' 
    ? s.boxes.map((b) => ({ id: b.id, x: r3(b.x), z: r3(b.z), loaded: b.loaded, carriedBy: b.carriedBy }))
    : [];

  return {
    type: 'tick',
    phase: s.phase,
    players: { 1: pl(1), 2: pl(2) },
    threats: s.threats.map((t) => ({ id: t.id, type: t.type, x: r3(t.x), z: r3(t.z), dir: t.dir, stunned: t.stunned > 0, hp: t.hp })),
    cargo: r3(s.cargo),
    fuel: r3(s.fuel),
    dist: r3(s.dist),
    boxes: boxesPayload,
    phaseTimer: r3(Math.max(0, s.completeTimer)),
    shotHits,
    events,
    truckX: r3(s.truckX),
    speed: s.phase === 'driving' ? truckSpeed() : 0,
    cash: s.cash,
    upgrades: s.upgrades,
    trip: s.trip,
    loaded: s.loadedCount,
    total: s.totalBoxes,
    gunCd: r3(s.gunCooldown),
    gunCdMax: r3(gunCooldownMax()),
    hornCd: r3(s.hornCooldown),
    hornCdMax: r3(hornCooldownMax()),
    paused: s.pausedFor ? { id: s.pausedFor, t: Math.ceil(s.pauseTimer) } : null,
    lastTrip: s.lastTrip,
    reason: s.reason,
    earned: s.totalEarned,
  };
}

let lastTickAt = Date.now();
setInterval(() => {
  const now = Date.now();
  const dt = Math.min((now - lastTickAt) / 1000, MAX_DT);
  lastTickAt = now;
  try { step(dt); } catch (e) { }
  
  const payloadString = JSON.stringify(tickPayload());
  
  for (const id of [1, 2]) {
    const ws = sockets[id];
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(payloadString);
      // ZMENA: Zarátame veľkosť odoslaných dát do nášho logu
      netStats.txBytes += payloadString.length; 
    }
  }
  events = [];
  shotHits = [];
}, TICK_MS);