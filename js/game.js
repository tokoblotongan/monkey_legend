// ============================================
// GAME CORE v3.0 — STABIL, SMOOTH, KING KONG SEJAJAR PLAYER
// ✅ KK.y = player.y (center), bukan kaki
// ✅ followDist = 38px (2 langkah)
// ✅ drawKingKong() dipanggil langsung — tanpa filter ketinggian
// ============================================

// === GLOBALS (dijaga agar tidak undefined) ===
var W = window.innerWidth || 800;
var H = window.innerHeight || 600;
var canvas, X;
var animationId = null;
var state = 'menu';
var score = 0;
var distance = 0;
var frame = 0;

// === MISI HARIAN ===
var dailyQuests = [
  { id: 'jump50', label: 'Lompat 50x', target: 50, current: 0, reward: 'peach', done: false },
  { id: 'kill10', label: 'Kalahkan 10 Hantu', target: 10, current: 0, reward: 'energy', done: false },
  { id: 'coin100', label: 'Kumpul 100 Koin', target: 100, current: 0, reward: 'ticket', done: false },
  { id: 'nodmg500', label: '500m Tanpa Damage', target: 500, current: 0, reward: 'shield', done: false }
];
var questDistanceStart = 0;
var questNoDamage = true;

// === BOSS SYSTEM ===
var boss = null;
var bossState = 'idle'; // idle, enter, fight, dead, escape
var BOSS_SPAWN_DISTANCE = 500;
var nextBossDistance = BOSS_SPAWN_DISTANCE;

// === PET SYSTEM ===
var pet = null;
var PET_FOLLOW_SPEED = 0.12;
var PET_COLLECT_RADIUS = 80;

// === PET TRANSFORM (KING KONG) ===
var petPoints = 0;
var PET_TRANSFORM_COST = 150; // points needed to transform
var petState = 'normal'; // normal, transforming, kingkong, cooldown
var petTransformTimer = 0;
var PET_KINGKONG_DURATION = 3600; // 60fps × 60 = 60 detik? → kita pakai 3600 = 60 detik (lebih lama)
var PET_COOLDOWN = 120; // 2 detik

// === COMBO SYSTEM ===
var comboCount = 0;
var comboTimer = 0;
var COMBO_MAX_TIME = 180; // ~3 detik
var comboMultiplier = 1;

// === ENTITAS ===
var player, platforms, ghosts, particles, projectiles, kameBlasts;
var keys = {}, touchState = { moveX: 0, moveY: 0, jump: false, atk: false, cloud: false, kame: false };
var shake = { x: 0, y: 0, i: 0, t: 0 };
var quakeCD = 0;
var cam = { x: 0, y: 0 };
var genX = 0;
var ghostTimer = 0;
var spriteAnimTimer = 0;
var SPRITE_FPS = 7;
var currentSpriteFrame = 0;
var gameOverTriggered = false;

// === CANVAS SETUP ===
function initCanvas() {
  canvas = document.getElementById('gameCanvas');
  if (!canvas) {
    console.error('❌ #gameCanvas tidak ditemukan!');
    return;
  }
  canvas.width = W;
  canvas.height = H;
  X = canvas.getContext('2d');
  window.X = X;
  window.W = W;
  window.H = H;
}

// === UTILITAS ===
function rnd(a, b) { return Math.random() * (b - a) + a; }
function rndI(a, b) { return Math.floor(rnd(a, b + 1)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// === SOUND ===
window.sfxJump = function() { tone(300, 0.15, 'sine', 0.1, 600); };
window.sfxAtk = function() { tone(500, 0.08, 'sawtooth', 0.08, 250); };
window.sfxKame = function() { tone(150, 0.8, 'sawtooth', 0.13, 800); setTimeout(function() { tone(400, 0.4, 'sine', 0.08, 100); }, 200); };
window.sfxHit = function() { tone(180, 0.12, 'square', 0.09, 60); };
window.sfxQuake = function() { tone(35, 1.5, 'sawtooth', 0.15, 15); };
window.sfxCoin = function() { tone(800, 0.1, 'sine', 0.07); setTimeout(function() { tone(1200, 0.15, 'sine', 0.07); }, 80); };
window.sfxCloud = function() { tone(600, 0.3, 'sine', 0.09, 900); };
window.sfxGhost = function() { tone(80, 0.5, 'sine', 0.05, 40); };
window.sfxDie = function() { tone(400, 0.6, 'sawtooth', 0.1, 50); };

// === TONE GENERATOR (minimal) ===
function tone(freq, dur, type, vol, fade) {
  if (!window.AudioContext && !window.webkitAudioContext) return;
  var ctx = new (window.AudioContext || window.webkitAudioContext)();
  var osc = ctx.createOscillator();
  var g = ctx.createGain();
  osc.connect(g);
  g.connect(ctx.destination);
  osc.frequency.value = freq;
  osc.type = type;
  g.gain.value = vol;
  osc.start();
  osc.stop(ctx.currentTime + dur);
  if (fade) {
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  }
}

// === FLOATING TEXT ===
var floatingTexts = [];
function showFloatingText(text, x, y, color = '#FFF', size = '14px') {
  floatingTexts.push({
    text: text,
    x: x,
    y: y,
    life: 60,
    maxLife: 60,
    color: color,
    size: size
  });
}

// === UPDATE & DRAW FLOATING TEXT ===
function updateFloatingTexts() {
  for (var i = floatingTexts.length - 1; i >= 0; i--) {
    var ft = floatingTexts[i];
    ft.y -= 0.8;
    ft.life--;
    if (ft.life <= 0) floatingTexts.splice(i, 1);
  }
}
function drawFloatingTexts() {
  X.save();
  X.font = 'bold ' + (14 * (frame % 2 ? 1 : 1.1)) + 'px sans-serif';
  X.textAlign = 'center';
  X.textBaseline = 'middle';
  for (var i = 0; i < floatingTexts.length; i++) {
    var ft = floatingTexts[i];
    X.fillStyle = ft.color;
    X.globalAlpha = ft.life / ft.maxLife;
    X.fillText(ft.text, ft.x - cam.x, ft.y - cam.y);
  }
  X.restore();
}

// === SHAKING CAMERA ===
function triggerShake(strength, frames) {
  shake.i = frames;
  shake.t = strength;
}
function updateShake() {
  if (shake.i > 0) {
    shake.x = (Math.random() - 0.5) * shake.t;
    shake.y = (Math.random() - 0.5) * shake.t;
    shake.i--;
  } else {
    shake.x = 0;
    shake.y = 0;
  }
}

// === QUEST SYSTEM ===
function updateQuest(type, amount = 1) {
  for (var i = 0; i < dailyQuests.length; i++) {
    var q = dailyQuests[i];
    if (q.done) continue;
    if (type === 'jump' && q.id === 'jump50') {
      q.current += amount;
    } else if (type === 'kill' && q.id === 'kill10') {
      q.current += amount;
    } else if (type === 'coin' && q.id === 'coin100') {
      q.current += amount;
    }
    if (q.current >= q.target) {
      q.current = q.target;
      q.done = true;
      giveReward(q.reward);
      spawnP(player.x, player.y - 40, 12, '#FFD700', 1.5, 1.2);
      sfxCoin();
    }
  }
  renderQuestUI();
}

function giveReward(reward) {
  switch (reward) {
    case 'peach': player.hp = Math.min(player.maxHp, player.hp + 20); break;
    case 'energy': player.energy = Math.min(player.maxEnergy, player.energy + 30); break;
    case 'ticket': score += 500; break;
    case 'shield': player.shield = 60; break;
  }
}

function renderQuestUI() {
  var el = document.getElementById('questList');
  if (!el) return;
  el.innerHTML = '';
  for (var i = 0; i < dailyQuests.length; i++) {
    var q = dailyQuests[i];
    var cls = q.done ? 'done' : '';
    el.innerHTML += `<div class="${cls}">${q.label}: ${q.current}/${q.target}</div>`;
  }
}

// === PARTICLES ===
function spawnP(x, y, n, col, sm = 1, szm = 1) {
  for (var i = 0; i < n; i++) {
    var a = rnd(0, 6.28);
    var sp = rnd(1, 5) * sm;
    particles.push({
      x: x,
      y: y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - rnd(1, 3),
      life: rnd(20, 45),
      ml: 45,
      size: rnd(3, 7) * szm,
      color: col
    });
  }
}

// === PLAYER ===
function createPlayer() {
  return {
    x: 100,
    y: H * 0.7,
    vx: 0,
    vy: 0,
    facing: 1,
    hp: 100,
    maxHp: 100,
    energy: 100,
    maxEnergy: 100,
    jumps: 2,
    onGround: false,
    onCloud: false,
    cloudTimer: 0,
    inv: 0,
    atkCD: 0,
    kameCharge: 0,
    shield: 0,
    _jumpHeld: false,
    _cloudHeld: false
  };
}

// === INPUT ===
function getInput() {
  var left = keys['arrowleft'] || (touchState.moveX < -0.3);
  var right = keys['arrowright'] || (touchState.moveX > 0.3);
  var up = keys['arrowup'] || keys[' '] || touchState.jump;
  var down = keys['arrowdown'] || touchState.down;
  var atk = keys['a'] || touchState.atk;
  var cloud = keys['s'] || touchState.cloud;
  var kame = keys['d'] || keys['k'] || touchState.kame;
  return { left, right, up, down, atk, cloud, kame };
}

// === PLATFORM ===
function generatePlatform(x, w, h, type = 'normal') {
  var p = {
    x: x,
    y: H * 0.8 - rnd(50, 150),
    w: w,
    h: h,
    type: type,
    coins: []
  };
  // Add coins
  var coinCount = Math.floor(w / 80);
  for (var i = 0; i < coinCount; i++) {
    p.coins.push({
      x: x + (i + 0.5) * (w / coinCount),
      y: p.y - 20,
      collected: false,
      bob: rnd(0, 6.28)
    });
  }
  return p;
}

// === GHOST ===
function spawnGhost() {
  var side = Math.random() < 0.5 ? -1 : 1;
  var gx = cam.x + (side < 0 ? -70 : W + 70);
  var gy = rnd(H * 0.15, H * 0.55);
  var spd = rnd(1.0, 2.2) + distance * 0.0002;
  var hp = 2 + Math.floor(distance / 400);
  ghosts.push({
    x: gx, y: gy, vx: 0, vy: 0,
    size: rnd(26, 40),
    speed: Math.min(spd, 5),
    hp: hp, maxHp: hp,
    phase: rnd(0, 6.28),
    hitFlash: 0,
    type: rndI(0, 2)
  });
  sfxGhost();
}

function updateGhost(g) {
  var dx = player.x - g.x, dy = player.y - g.y;
  var d = Math.hypot(dx, dy) || 1;
  g.vx = dx / d * g.speed;
  g.vy = dy / d * g.speed * 0.5;
  g.x += g.vx;
  g.y += g.vy;
  if (g.hitFlash > 0) g.hitFlash--;

  // Collision with player
  if (Math.abs(player.x - g.x) < (player.PW || 38) / 2 + g.size &&
      Math.abs(player.y - g.y) < (player.PH || 38) / 2 + g.size &&
      player.inv <= 0) {
    player.hp -= 15;
    player.inv = 40;
    sfxHit();
    triggerShake(8, 12);
    resetCombo();
    questNoDamage = false;
  }
}

// === PROJECTILES & KAME ===
function fireStaff() {
  if (player.atkCD > 0) return;
  player.atkCD = 14;
  var dir = player.facing;
  projectiles.push({
    x: player.x + dir * (player.PW || 38) * 0.8,
    y: player.y - (player.PH || 38) * 0.2,
    vx: dir * 9,
    life: 38,
    size: 5
  });
  sfxAtk();
}

function fireKame() {
  if (player.energy < 35 || player.kameCharge < 10) return;
  player.energy -= 35;
  player.kameCharge = 0;
  var dir = player.facing;
  kameBlasts.push({
    x: player.x + dir * (player.PW || 38) * 0.6,
    y: player.y - (player.PH || 38) * 0.1,
    vx: dir * 11,
    size: 18,
    maxLife: 75,
    life: 75,
    damage: 3
  });
  sfxKame();
  triggerShake(6, 12);
  spawnP(player.x + dir * 22, player.y - (player.PH || 38) * 0.1, 15, '#00E5FF', 1.5, 1.2);
}

function updateKame(k) {
  k.x += k.vx;
  k.life--;
  k.size = Math.min(32, k.size + 0.25);
  for (var i = 0; i < ghosts.length; i++) {
    var g = ghosts[i];
    if (Math.hypot(k.x - g.x, k.y - g.y) < k.size + g.size) {
      g.hp -= k.damage;
      g.hitFlash = 8;
      spawnP(g.x, g.y, 5, '#00E5FF', 1);
      sfxHit();
    }
  }
}

// === BOSS ===
function spawnBoss() {
  boss = {
    x: cam.x + W * 0.5,
    y: H * 0.5,
    size: 60,
    hp: 200,
    maxHp: 200,
    phase: 0,
    hitFlash: 0,
    name: 'Giant Ape',
    attacks: []
  };
  bossState = 'enter';
  showFloatingText('BOSS: ' + boss.name + '!', player.x, player.y - 80, '#FF4444');
  sfxQuake();
}

function updateBoss() {
  if (!boss) return;
  boss.phase += 0.03;

  // Boss movement
  var dx = player.x - boss.x;
  var dy = player.y - boss.y;
  var d = Math.hypot(dx, dy);
  if (d > 100) {
    boss.x += dx / d * 1.2;
    boss.y += dy / d * 0.8;
  }

  // Attack every 120 frames
  if (frame % 120 === 0) {
    var dir = (player.x > boss.x) ? 1 : -1;
    boss.attacks.push({
      x: boss.x,
      y: boss.y,
      vx: dir * 5,
      vy: rnd(-2, 2),
      size: 12,
      life: 90
    });
  }

  // Player jump on boss head
  if (Math.abs(player.x - boss.x) < boss.size + (player.PW || 38) &&
      Math.abs(player.y - boss.y) < boss.size + (player.PH || 38) &&
      player.vy < -2) {
    boss.hp -= 3;
    boss.hitFlash = 10;
    player.vy = -8;
    sfxHit();
    spawnP(boss.x, boss.y - boss.size, 8, '#FFD700', 1.2);
    addCombo(3);
  }

  // Attack hits player
  for (var i = boss.attacks.length - 1; i >= 0; i--) {
    var a = boss.attacks[i];
    a.x += a.vx;
    a.y += a.vy;
    a.life--;
    if (Math.hypot(a.x - player.x, a.y - player.y) < a.size + (player.PW || 38) * 0.5 && player.inv <= 0) {
      player.hp -= 15;
      player.inv = 40;
      sfxHit();
      triggerShake(8, 12);
      resetCombo();
      questNoDamage = false;
    }
  }
  boss.attacks = boss.attacks.filter(a => a.life > 0);

  if (boss.hitFlash > 0) boss.hitFlash--;
  if (boss.hp <= 0) {
    bossState = 'dead';
    score += 1000;
    spawnP(boss.x, boss.y, 25, '#FFD700', 2, 1.5);
    sfxDie();
    triggerShake(15, 20);
    showFloatingText('BOSS DEFEATED! +1000', boss.x, boss.y - 60, '#FFD700');
    updateQuest('kill', 5);
    // Spawn coins
    for (var i = 0; i < 5; i++) {
      platforms[0].coins.push({
        x: boss.x + rnd(-60, 60),
        y: boss.y - 40,
        collected: false,
        bob: rnd(0, 6.28)
      });
    }
  }
}

// === COMBO ===
function addCombo(n) {
  comboCount += n;
  comboTimer = COMBO_MAX_TIME;
  comboMultiplier
