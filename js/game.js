// ============================================
// MONKEY LEGEND - GAME ENGINE (FINAL FIX + KING KONG)
// Struktur berdasarkan potongan game(3).js kamu
// Ditambah logika pet/kingkong dari versi final saya
// ============================================

// === CANVAS ===
var C = document.getElementById('c'), // ⚠️ Pastikan ID ini sesuai HTML kamu
    X = C.getContext('2d');
var W, H;

function resize() {
  W = C.width = innerWidth;
  H = C.height = innerHeight;
  window.W = W;
  window.H = H;
}
resize();
addEventListener('resize', resize);

// === EXPOSE GLOBAL ===
window.W = W;
window.H = H;
window.X = X;
window.C = C;

// === DETEKSI SENTUH ===
var isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
window.isTouchDevice = isTouchDevice;

// === GLOBALS ===
var player, platforms = [], ghosts = [], particles = [], projectiles = [], kameBlasts = [];
var keys = {}, touchState = { moveX: 0, moveY: 0, jump: false, atk: false, kame: false, cloud: false, down: false };
var mouseState = { leftClick: false };
var shake = { x: 0, y: 0, i: 0, t: 0 };
var quakeCD = 0;
var cam = { x: 0, y: 0 };
var genX = 0;
var ghostTimer = 0;
var spriteAnimTimer = 0;
var currentSpriteFrame = 0;
var animationId = null;
var state = 'menu'; // 'menu', 'play', 'over'
var score = 0;
var distance = 0;
var frame = 0;
var gameOverTriggered = false;

// === COMBO SYSTEM ===
var comboCount = 0;
var comboTimer = 0;
var COMBO_MAX_TIME = 180;
var comboMultiplier = 1;

// === DAILY QUESTS ===
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
var bossState = 'idle';
var BOSS_SPAWN_DISTANCE = 500;
var nextBossDistance = BOSS_SPAWN_DISTANCE;

// === PET SYSTEM ===
var pet = null;
var petPoints = 0;
var PET_TRANSFORM_COST = 150;
var petState = 'normal'; // normal, transforming, kingkong, cooldown
var petTransformTimer = 0;
var PET_KINGKONG_DURATION = 3600; // 60 detik
var PET_COOLDOWN = 120; // 2 detik
var petGlow = 0;

// === KONSTANTA ===
var GRAV = 0.52, JUMP = -11.5, SPEED = 4.8, MAX_FALL = 14;
var PW = 30, PH = 38, PLAT_H = 16;
window.GRAV = GRAV; window.JUMP = JUMP; window.SPEED = SPEED;
window.MAX_FALL = MAX_FALL; window.PW = PW; window.PH = PH; window.PLAT_H = PLAT_H;

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
window.sfxGhost = function() { tone(80, 0.5, 'sawtooth', 0.05, 40); };
window.sfxDie = function() { tone(400, 0.6, 'sawtooth', 0.1, 50); };

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
function showFloatingText(text, x, y, color) {
  floatingTexts.push({ text: text, x: x, y: y, color: color, life: 60, vy: -1.5 });
}

// === SHAKING CAMERA ===
function triggerShake(strength, frames) {
  shake.i = frames;
  shake.t = strength;
}

// === PET SYSTEM — FINAL & STABIL (Versi yang benar) ===
function spawnPet() {
  if (pet) return;
  pet = {
    x: player.x - 40,
    y: player.y,
    vx: 0, vy: 0,
    size: 18,
    frame: 0,
    animTimer: 0,
    transformScale: 1,
    punchTimer: 0
  };
  petPoints = 0;
  petState = 'normal';
  petTransformTimer = 0;
  showFloatingText('Pet Monyet Bergabung!', player.x, player.y - 60, '#8BC34A');

  if (typeof initKingKong === 'function') {
    try { initKingKong(); } catch(e) {
      console.warn('[Game] initKingKong failed:', e);
    }
  }
}

function updatePet() {
  if (!pet) return;

  // === TRANSFORM LOGIC ===
  if (petState === 'normal' && petPoints >= PET_TRANSFORM_COST) {
    petState = 'transforming';
    petTransformTimer = 60;
    showFloatingText('KING KONG MODE!', player.x, player.y - 100, '#FF4444');
    sfxQuake();
    triggerShake(15, 30);
    for (var i = 0; i < 30; i++) {
      var a = rnd(0, 6.28);
      var sp = rnd(3, 8);
      particles.push({
        x: pet.x, y: pet.y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - rnd(2, 5),
        life: rnd(30, 60),
        ml: 60,
        size: rnd(4, 10),
        color: pick(['#FFD700', '#FF4444', '#FF8C00', '#FFF'])
      });
    }
  }

  if (petState === 'transforming') {
    petTransformTimer--;
    pet.transformScale = 1 + (1 - petTransformTimer / 60);
    if (petTransformTimer <= 0) {
      petState = 'kingkong';
      petTransformTimer = PET_KINGKONG_DURATION;
      pet.transformScale = 1;
      pet.punchTimer = 0;
    }
    // Smooth follow during transform
    var targetX = player.x - 80 * player.facing;
    var targetY = player.y - 20;
    pet.x += (targetX - pet.x) * 0.15;
    pet.y += (targetY - pet.y) * 0.15;
    return;
  }

  // === KING KONG MODE — SYNC LANGSUNG KE KK (TANPA CEK KETINGGIAN)
  if (petState === 'kingkong') {
    petTransformTimer--;
    pet.punchTimer++;

    // ✅ UPDATE KING KONG & SYNC PET KE POSISI KK
    try {
      if (typeof KK !== 'undefined' && KK && typeof updateKingKong === 'function') {
        updateKingKong(); // ini akan set KK.x, KK.y = sejajar player
        pet.x = KK.x;     // ← sync ke KK
        pet.y = KK.y;     // ← sejajar center player
      }
    } catch (e) {
      console.warn('[Game] KingKong sync error:', e);
    }

    if (petTransformTimer <= 0) {
      petState = 'cooldown';
      petTransformTimer = PET_COOLDOWN;
      petPoints = 0;
      showFloatingText('Pet kembali normal...', pet.x, pet.y - 80, '#8BC34A');
    }
    return;
  }

  if (petState === 'cooldown') {
    petTransformTimer--;
    pet.transformScale = 1 + (petTransformTimer / PET_COOLDOWN);
    if (petTransformTimer <= 0) {
      petState = 'normal';
      pet.transformScale = 1;
    }
    return;
  }

  // === NORMAL PET ===
  if (petState === 'normal') {
    var targetX = player.x - 35 * player.facing - 25;
    var targetY = player.y - 20;
    pet.x += (targetX - pet.x) * 0.15;
    pet.y += (targetY - pet.y) * 0.15;

    // Collect coins
    for (var i = 0; i < platforms.length; i++) {
      var pl = platforms[i];
      for (var j = 0; j < pl.coins.length; j++) {
        var c = pl.coins[j];
        if (c.collected) continue;
        if (Math.hypot(pet.x - c.x, pet.y - c.y) < 80) { // PET_COLLECT_RADIUS
          c.collected = true;
          petPoints += 10;
          score += 50;
          sfxCoin();
          spawnP(c.x, c.y, 5, '#FFD700', 0.8, 0.6);
          addCombo(1);
          updateQuest('coin', 1);
        }
      }
    }
  }
}

function drawPet() {
  if (!pet || !X) return;

  try {
    var sx = pet.x - cam.x + shake.x;
    var sy = pet.y - cam.y + shake.y;
    var s = pet.size * pet.transformScale;

    // ===== KING KONG MODE =====
    if (petState === 'kingkong' || petState === 'transforming') {
      try {
        if (typeof drawKingKong === 'function') {
          drawKingKong(); // ✅ SELALU DIPANGGIL — tidak ada filter ketinggian
        }
      } catch (e) {
        console.warn('[Game] drawKingKong call error:', e);
      }
      return; // jangan gambar monkey lagi
    }

    // ===== NORMAL PET =====
    X.save();
    X.translate(sx, sy);

    // Glow
    if (petGlow > 0.3) {
      var gg = X.createRadialGradient(0, 0, s * 0.5, 0, 0, s * 2);
      gg.addColorStop(0, 'rgba(255, 215, 0, ' + Math.min(1, petGlow) + ')');
      gg.addColorStop(1, 'rgba(255, 215, 0, 0)');
      X.fillStyle = gg;
      X.beginPath();
      X.arc(0, 0, s * 2, 0, 6.28);
      X.fill();
    }

    // Body
    X.fillStyle = '#8B4513';
    X.beginPath();
    X.ellipse(0, 0, s * 0.6, s * 0.8, 0, 0, 6.28);
    X.fill();

    // Legs
    var bounce = Math.sin(frame * 0.15) * 3;
    X.fillStyle = '#5D4037';
    X.beginPath();
    X.ellipse(-s * 0.5, -s * 0.9 + bounce, s * 0.25, s * 0.35, -0.3, 0, 6.28);
    X.fill();
    X.beginPath();
    X.ellipse(s * 0.5, -s * 0.9 + bounce, s * 0.25, s * 0.35, 0.3, 0, 6.28);
    X.fill();

    // Eyes
    X.fillStyle = '#FFF';
    X.beginPath();
    X.arc(-s * 0.2, -s * 0.65 + bounce, s * 0.18, 0, 6.28);
    X.fill();
    X.beginPath();
    X.arc(s * 0.2, -s * 0.65 + bounce, s * 0.18, 0, 6.28);
    X.fill();
    X.fillStyle = '#000';
    X.beginPath();
    X.arc(-s * 0.15, -s * 0.65 + bounce, s * 0.08, 0, 6.28);
    X.fill();
    X.beginPath();
    X.arc(s * 0.25, -s * 0.65 + bounce, s * 0.08, 0, 6.28);
    X.fill();

    X.restore();
  } catch (e) {
    console.warn('[Game] drawPet error:', e);
  }
}

// === UPDATE & DRAW FLOATING TEXT ===
function updateFloatingTexts() {
  for (var i = floatingTexts.length - 1; i >= 0; i--) {
    var ft = floatingTexts[i];
    ft.y += ft.vy;
    ft.life--;
    if (ft.life <= 0) floatingTexts.splice(i, 1);
  }
}

function drawFloatingTexts() {
  X.save();
  X.font = 'bold 14px sans-serif';
  X.textAlign = 'center';
  X.textBaseline = 'middle';
  for (var i = 0; i < floatingTexts.length; i++) {
    var ft = floatingTexts[i];
    X.fillStyle = ft.color;
    X.globalAlpha = ft.life / 60;
    X.fillText(ft.text, ft.x - cam.x, ft.y - cam.y);
  }
  X.restore();
}

// === UPDATE SHAKES ===
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

// === COMBO SYSTEM ===
function addCombo(n) {
  comboCount += n;
  comboTimer = COMBO_MAX_TIME;
  comboMultiplier = Math.min(5, 1 + Math.floor(comboCount / 10));
}
function resetCombo() {
  comboCount = 0;
  comboTimer = 0;
  comboMultiplier = 1;
}
function updateCombo() {
  if (comboTimer > 0) comboTimer--;
  if (comboTimer <= 0) resetCombo();
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
      spawnP(player.x, player.y - 40, 12, '#FFD700', 1.5);
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
  var container = document.getElementById('questPanel');
  if (!container) return;
  var html = '';
  for (var i = 0; i < dailyQuests.length; i++) {
    var q = dailyQuests[i];
    var pct = Math.min(100, Math.floor(q.current / q.target * 100));
    var cls = q.done ? 'quest-done' : '';
    html += '<div class="quest-item ' + cls + '">' +
            '<span class="quest-label">' + q.label + ': ' + q.current + '/' + q.target + '</span>' +
            '<div class="quest-bar"><div class="quest-progress" style="width:' + pct + '%"></div></div>' +
            '</div>';
  }
  container.innerHTML = html;
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
    dropThrough: 0,
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

// === PLATFORM & COINS ===
function makePlat(x, y, w, type) {
  return { x: x, y: y, w: w, h: PLAT_H, type: type || 'candy', coins: [], hasFlower: rnd(0, 1) < 0.3 };
}

function generateChunk(sx) {
  var px = sx;
  platforms.push(makePlat(px, H - 35, W * 0.9, 'ground'));
  px += W * 0.75;
  var count = rndI(4, 7);
  for (var i = 0; i < count; i++) {
    var gap = rnd(55, 130);
    px += gap;
    var w = rnd(90, 240), y = rnd(H * 0.25, H - 90);
    var t = pick(['candy', 'candy', 'candy', 'chocolate', 'ice']);
    var p = makePlat(px, y, w, t);
    // Add coins
    var coinCount = Math.floor(w / 80);
    for (var j = 0; j < coinCount; j++) {
      p.coins.push({
        x: px + (j + 0.5) * (w / coinCount),
        y: y - 20,
        collected: false,
        bob: rnd(0, 6.28)
      });
    }
    platforms.push(p);
  }
  return px;
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
  var dx = player.x - g.x, dy = player.y - g.y, d = Math.hypot(dx, dy) || 1;
  g.vx += (dx / d) * g.speed * 0.07;
  g.vy += (dy / d) * g.speed * 0.07 + 0.02;
  g.vx *= 0.97; g.vy *= 0.97;
  g.vy = Math.max(-5.5, Math.min(5.5, g.vy));
  g.x += g.vx; g.y += g.vy;
  g.phase += 0.055;
  if (g.hitFlash > 0) g.hitFlash--;

  if (Math.abs(g.x - player.x) < g.size + PW * 0.4 && Math.abs(g.y - player.y) < g.size + PH * 0.4 && player.inv <= 0) {
    player.hp -= 12; player.inv = 50;
    sfxHit(); triggerShake(10, 18);
    spawnP(player.x, player.y, 8, '#FF4444', 1.2);
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
    x: player.x + dir * PW * 0.8,
    y: player.y - PH * 0.2,
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
    x: player.x + dir * PW * 0.6,
    y: player.y - PH * 0.1,
    vx: dir * 11,
    size: 18,
    maxLife: 75,
    life: 75,
    damage: 3
  });
  sfxKame(); triggerShake(6, 12);
  spawnP(player.x + dir * 22, player.y - PH * 0.1, 15, '#00E5FF', 1.5, 1.2);
}

function updateKame(k) {
  k.x += k.vx; k.life--; k.size = Math.min(32, k.size + 0.25);
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
    attacks: [],
    attackTimer: 0,
    vx: 3
  };
  bossState = 'enter';
  showFloatingText('BOSS: ' + boss.name + '!', player.x, player.y - 80, '#FF4444');
  sfxQuake();
}

function updateBoss() {
  if (!boss) return;
  boss.phase += 0.03;

  if (bossState === 'enter') {
    boss.x += boss.vx;
    if (boss.x < cam.x + W * 0.65) {
      bossState = 'fight';
      boss.vx = 0;
    }
  } else if (bossState === 'fight') {
    // Boss floating
    boss.y += Math.sin(boss.phase * 2) * 1.5;
    // Attack pattern
    boss.attackTimer++;
    if (boss.attackTimer > 120) {
      boss.attackTimer = 0;
      // Fire projectile
      var dir = boss.x > player.x ? -1 : 1;
      boss.attacks.push({
        x: boss.x, y: boss.y,
        vx: dir * 5, vy: rnd(-2, 2),
        size: 12, life: 90
      });
    }
  }

  // Player jump on boss head
  if (Math.abs(player.x - boss.x) < boss.size + PW &&
      Math.abs(player.y - boss.y) < boss.size + PH &&
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
    a.x += a.vx; a.y += a.vy; a.life--;
    if (Math.hypot(a.x - player.x, a.y - player.y) < a.size + PW * 0.5 && player.inv <= 0) {
      player.hp -= 15;
      player.inv = 40;
      sfxHit();
      triggerShake(8, 12);
      resetCombo();
      questNoDamage = false;
    }
  }
  boss.attacks = boss.attacks.filter(function(a) { return a.life > 0; });

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

// === TRIGGER GAME OVER ===
function triggerGameOver() {
  // Guard: jangan trigger 2x
  if (typeof gameOverTriggered !== 'undefined' && gameOverTriggered) return;
  gameOverTriggered = true;
  window.gameOverTriggered = true;

  // Hentikan loop jika ada
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
    window.animationId = null;
  }
  state = 'over';
  window.state = 'over';
  try { sfxDie(); } catch(e) {}
  var goSt = document.getElementById('goSt');
  if (goSt) goSt.innerHTML = 'Skor: <span>' + score + '</span><br>Jarak: <span>' + Math.floor(distance) + 'm</span>';
  var gameover = document.getElementById('gameover');
  if (gameover) {
    gameover.classList.add('show');
    gameover.style.display = 'flex';
  }
  var touchControls = document.getElementById('touchControls');
  if (touchControls) touchControls.classList.remove('show');

  // Reset semua input
  for (var k in keys) keys[k] = false;
  touchState.jump = false; touchState.atk = false;
  touchState.kame = false; touchState.cloud = false;
  touchState.down = false; touchState.moveX = 0; touchState.moveY = 0;
  mouseState.leftClick = false;

  // Reset combo & quest tracking
  comboCount = 0;
  comboTimer = 0;
  comboMultiplier = 1;
  questNoDamage = false;
  renderComboUI();
  console.log('💀 Game Over - Skor:', score, 'Jarak:', Math.floor(distance));
}

// ============================================
// MULAI / RESTART GAME
// ============================================
function startGame() {
  console.log('🎮 Start Game dipicu...');

  // Hentikan loop yang sedang berjalan
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
    window.animationId = null;
  }

  // Reset game state
  player = createPlayer();
  platforms = [];
  ghosts = [];
  particles = [];
  projectiles = [];
  kameBlasts = [];
  score = 0;
  distance = 0;
  frame = 0;
  quakeCD = 480;
  ghostTimer = 0;
  genX = 0;
  shake = { x: 0, y: 0, i: 0, t: 0 };
  comboCount = 0;
  comboTimer = 0;
  comboMultiplier = 1;
  questNoDamage = true;
  questDistanceStart = distance;
  dailyQuests.forEach(q => { q.current = 0; q.done = false; });
  renderQuestUI();

  // Init pet
  pet = null;
  petPoints = 0;
  petState = 'normal';
  petTransformTimer = 0;
  spawnPet();

  // Init boss
  boss = null;
  bossState = 'idle';
  nextBossDistance = BOSS_SPAWN_DISTANCE;

  // Camera
  cam.x = player.x - W / 2;
  cam.y = player.y - H / 2;

  // Generate first chunk
  genX = generateChunk(0);

  // UI
  renderUI();

  // Update globals
  window.player = player;
  window.platforms = platforms;
  window.ghosts = ghosts;
  window.particles = particles;
  window.projectiles = projectiles;
  window.kameBlasts = kameBlasts;
  window.score = score;
  window.distance = distance;
  window.frame = frame;
  window.cam = cam;
  window.genX = genX;
  window.state = state;
  window.pet = pet;
  window.comboCount = comboCount;
  window.dailyQuests = dailyQuests;
  window.petPoints = petPoints;
  window.petState = petState;

  // Hide menu, show game container
  var menuEl = document.getElementById('menu');
  var gameContainerEl = document.getElementById('gameContainer');
  if (menuEl) menuEl.style.display = 'none';
  if (gameContainerEl) gameContainerEl.style.display = 'block';

  // Show touch controls if needed
  if (isTouchDevice) {
    var touchControls = document.getElementById('touchControls');
    if (touchControls) touchControls.classList.add('show');
  }

  // Set state to play
  state = 'play';
  window.state = state;

  // Start loop
  loop();
}

function restartGame() {
  console.log('🔄 Restart Game dipicu...');

  // Hentikan loop yang sedang berjalan
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
    window.animationId = null;
  }

  // Reset game state
  player = createPlayer();
  platforms = [];
  ghosts = [];
  particles = [];
  projectiles = [];
  kameBlasts = [];
  score = 0;
  distance = 0;
  frame = 0;
  quakeCD = 480;
  ghostTimer = 0;
  genX = 0;
  shake = { x: 0, y: 0, i: 0, t: 0 };
  comboCount = 0;
  comboTimer = 0;
  comboMultiplier = 1;
  questNoDamage = true;
  questDistanceStart = distance;
  dailyQuests.forEach(q => { q.current = 0; q.done = false; });
  renderQuestUI();

  // Init pet
  pet = null;
  petPoints = 0;
  petState = 'normal';
  petTransformTimer = 0;
  spawnPet();

  // Init boss
  boss = null;
  bossState = 'idle';
  nextBossDistance = BOSS_SPAWN_DISTANCE;

  // Camera
  cam.x = player.x - W / 2;
  cam.y = player.y - H / 2;

  // Generate first chunk
  genX = generateChunk(0);

  // UI
  renderUI();

  // Update globals
  window.player = player;
  window.platforms = platforms;
  window.ghosts = ghosts;
  window.particles = particles;
  window.projectiles = projectiles;
  window.kameBlasts = kameBlasts;
  window.score = score;
  window.distance = distance;
  window.frame = frame;
  window.cam = cam;
  window.genX = genX;
  window.state = state;
  window.pet = pet;
  window.comboCount = comboCount;
  window.dailyQuests = dailyQuests;
  window.petPoints = petPoints;
  window.petState = petState;

  // Hide game over screen
  var gameoverEl = document.getElementById('gameover');
  if (gameoverEl) {
    gameoverEl.classList.remove('show');
    gameoverEl.style.display = 'none';
  }

  // Show touch controls if needed
  if (isTouchDevice) {
    var touchControls = document.getElementById('touchControls');
    if (touchControls) touchControls.classList.add('show');
  }

  // Set state to play
  state = 'play';
  window.state = state;

  console.log('✅ Restart Berhasil, State:', state);

  // Start loop
  loop();
}

// ============================================
// GAME LOOP - DENGAN CANVAS CLEAR DI LUAR STATE
// ============================================
function loop() {
  animationId = requestAnimationFrame(loop);
  window.animationId = animationId;

  // ===== SELALU BERSIHKAN & GAMBAR BACKGROUND =====
  X.clearRect(0, 0, W, H);
  drawSky();

  // ===== HANYA JALANKAN LOGIC JIKA STATE 'play' =====
  if (state !== 'play') {
    // Tampilkan status di canvas jika diperlukan
    return;
  }
  frame++;
  window.frame = frame;

  // Cek hp SEBELUM update player
  if (player.hp <= 0) {
    triggerGameOver();
    return;
  }

  // Update combo timer
  updateCombo();

  // Update quest no-damage distance
  if (questNoDamage) {
    var distNoDmg = distance - questDistanceStart;
    dailyQuests[3].current = Math.floor(distNoDmg);
    if (dailyQuests[3].current >= dailyQuests[3].target && !dailyQuests[3].done) {
      dailyQuests[3].done = true;
      giveReward('shield');
      renderQuestUI();
    }
  }

  updatePlayer();
  updatePet();
  updateGhostAll();
  updateProjectiles();
  updateKameBlasts();
  updateParticles();
  updateBoss();
  updatePlatforms();
  updateFloatingTexts();

  // Camera follow
  cam.x = Math.max(0, player.x - W / 2);
  cam.y = Math.max(0, player.y - H / 2);

  // Boss fight: stop scroll, lock camera
  if (bossState === 'fight' || bossState === 'enter') {
    // Camera tetap, player tidak bisa lari terlalu jauh
    if (player.x < cam.x + 50) player.x = cam.x + 50;
    if (player.x > cam.x + W - 50) player.x = cam.x + W - 50;
  }

  // Draw
  drawPlatforms();
  drawParticles();
  drawProjectiles();
  drawKameBlasts();
  drawGhosts();
  drawBoss();
  drawPlayer();
  drawPet();
  drawFloatingTexts();

  // Update Shake
  updateShake();

  // Update UI
  renderUI();
}

// === UPDATE ENTITY ===
function updatePlayer() {
  var inp = getInput();
  if (inp.left) { player.vx = -SPEED; player.facing = -1; }
  else if (inp.right) { player.vx = SPEED; player.facing = 1; }
  else { player.vx *= 0.78; }

  if (inp.up && !player._jumpHeld) {
    if (player.onCloud) {
      player.onCloud = false;
      player.cloudTimer = 0;
      player.vy = JUMP * 0.8;
      player.jumps = 1;
    } else if (player.jumps > 0) {
      player.vy = JUMP;
      player.jumps--;
      player.onGround = false;
      sfxJump();
      spawnP(player.x, player.y + PH / 2, 4, '#FFD700', 0.5, 0.5);
      updateQuest('jump');
    }
    player._jumpHeld = true;
  }
  if (!inp.up) player._jumpHeld = false;

  if (inp.down) player.dropThrough = 8;
  if (inp.cloud && !player._cloudHeld) {
    activateCloud();
    player._cloudHeld = true;
  }
  if (!inp.cloud) player._cloudHeld = false;

  if (inp.atk && player.atkCD <= 0) {
    fireStaff();
  }
  if (inp.kame && player.kameCharge >= 10) {
    fireKame();
  }

  // Physics
  player.vy += GRAV;
  if (player.vy > MAX_FALL) player.vy = MAX_FALL;
  player.x += player.vx;
  player.y += player.vy;

  // Ground collision
  player.onGround = false;
  for (var i = 0; i < platforms.length; i++) {
    var p = platforms[i];
    if (player.x + PW/2 > p.x && player.x - PW/2 < p.x + p.w &&
        player.y + PH/2 > p.y && player.y - PH/2 < p.y + p.h) {

      if (player.vy > 0 && player.y < p.y) {
        player.y = p.y - PH/2;
        player.vy = 0;
        player.onGround = true;
        player.jumps = 2;
        if (player.dropThrough > 0) {
          player.dropThrough--;
        }
      }
    }
  }

  // Cloud timer
  if (player.onCloud) {
    player.cloudTimer--;
    if (player.cloudTimer <= 0) {
      player.onCloud = false;
    }
  }

  // Energy regen
  if (!player.onCloud) player.energy = Math.min(player.maxEnergy, player.energy + 0.06);
  if (player.inv > 0) player.inv--;
  if (player.atkCD > 0) player.atkCD--;
  if (player.kameCharge < 10) player.kameCharge += 0.1;

  // Shield
  if (player.shield > 0) player.shield--;

  // Distance
  distance += 0.2;
  if (distance > nextBossDistance && bossState === 'idle') {
    spawnBoss();
    nextBossDistance += 800;
  }

  // Ghost spawn
  ghostTimer++;
  if (ghostTimer >= 120) {
    spawnGhost();
    ghostTimer = 0;
  }

  // Pet points from kills
  for (var i = ghosts.length - 1; i >= 0; i--) {
    if (ghosts[i].hp <= 0) {
      petPoints += 25;
      ghosts.splice(i, 1);
    }
  }
}

function updateGhostAll() {
  for (var i = 0; i < ghosts.length; i++) {
    updateGhost(ghosts[i]);
  }
}

function updateProjectiles() {
  for (var i = 0; i < projectiles.length; i++) {
    var p = projectiles[i];
    p.x += p.vx;
    p.life--;
    for (var j = 0; j < ghosts.length; j++) {
      var g = ghosts[j];
      if (Math.hypot(p.x - g.x, p.y - g.y) < p.size + g.size) {
        g.hp -= 1;
        g.hitFlash = 6;
        p.life = 0;
        spawnP(g.x, g.y, 3, '#FFD700', 0.7);
        sfxHit();
        break;
      }
    }
  }
  projectiles = projectiles.filter(p => p.life > 0);
}

function updateKameBlasts() {
  for (var i = 0; i < kameBlasts.length; i++) {
    updateKame(kameBlasts[i]);
  }
  kameBlasts = kameBlasts.filter(k => k.life > 0);
}

function updateParticles() {
  for (var i = 0; i < particles.length; i++) {
    var p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.04;
    p.vx *= 0.97;
    p.life--;
  }
  particles = particles.filter(p => p.life > 0);
}

function updatePlatforms() {
  // Generate new platforms as needed
  while (genX < cam.x + W + 200) {
    genX = generateChunk(genX);
  }
  // Remove offscreen
  platforms = platforms.filter(p => p.x + p.w > cam.x - 100);
}

// === DRAW FUNCTIONS ===
function drawSky() {
  X.fillStyle = '#87CEEB';
  X.fillRect(0, 0, W, H);
  // Sun
  X.fillStyle = '#FFD700';
  X.beginPath();
  X.arc(W * 0.8, H * 0.2, 30, 0, 6.28);
  X.fill();
}

function drawPlatforms() {
  for (var i = 0; i < platforms.length; i++) {
    var p = platforms[i];
    var px = p.x - cam.x;
    var py = p.y - cam.y;
    // Platform color based on type
    if (p.type === 'ground') X.fillStyle = '#8B4513';
    else if (p.type === 'candy') X.fillStyle = '#FF69B4';
    else if (p.type === 'chocolate') X.fillStyle = '#8B4513';
    else if (p.type === 'ice') X.fillStyle = '#B0E0E6';
    X.fillRect(px, py, p.w, p.h);

    // Coins
    for (var j = 0; j < p.coins.length; j++) {
      var c = p.coins[j];
      if (c.collected) continue;
      var cx = c.x - cam.x;
      var cy = c.y - cam.y;
      X.save();
      X.translate(cx, cy);
      X.rotate(c.bob * 0.1);
      X.fillStyle = '#FFD700';
      X.beginPath();
      X.arc(0, 0, 8, 0, 6.28);
      X.fill();
      X.restore();
    }
  }
}

function drawGhosts() {
  for (var i = 0; i < ghosts.length; i++) {
    var g = ghosts[i];
    var gx = g.x - cam.x + shake.x;
    var gy = g.y - cam.y + shake.y;
    X.save();
    X.translate(gx, gy);
    X.fillStyle = g.type === 0 ? '#B040FF' : g.type === 1 ? '#40B0FF' : '#FF4040';
    X.beginPath();
    X.arc(0, 0, g.size, 0, 6.28);
    X.fill();
    if (g.hitFlash > 0) {
      X.globalAlpha = g.hitFlash / 10 * 0.5;
      X.fillStyle = '#FFF';
      X.beginPath();
      X.arc(0, 0, g.size * 1.1, 0, 6.28);
      X.fill();
      X.globalAlpha = 1;
    }
    X.restore();
  }
}

function drawBoss() {
  if (!boss) return;
  var bx = boss.x - cam.x + shake.x;
  var by = boss.y - cam.y + shake.y;
  X.save();
  X.translate(bx, by);
  X.fillStyle = '#8B0000';
  X.beginPath();
  X.arc(0, 0, boss.size, 0, 6.28);
  X.fill();
  if (boss.hitFlash > 0) {
    X.globalAlpha = boss.hitFlash / 10 * 0.5;
    X.fillStyle = '#FFF';
    X.beginPath();
    X.arc(0, 0, boss.size * 1.1, 0, 6.28);
    X.fill();
    X.globalAlpha = 1;
  }
  // HP bar
  var bw = boss.size * 1.4;
  X.fillStyle = 'rgba(0,0,0,0.5)';
  X.fillRect(-bw/2, -boss.size - 10, bw, 4);
  X.fillStyle = '#B040FF';
  X.fillRect(-bw/2, -boss.size - 10, bw * (boss.hp / boss.maxHp), 4);

  // Attacks
  for (var i = 0; i < boss.attacks.length; i++) {
    var a = boss.attacks[i];
    var ax = a.x - boss.x;
    var ay = a.y - boss.y;
    X.fillStyle = '#FF4444';
    X.beginPath();
    X.arc(ax, ay, a.size, 0, 6.28);
    X.fill();
  }
  X.restore();
}

function drawPlayer() {
  var px = player.x - cam.x + shake.x;
  var py = player.y - cam.y + shake.y;
  X.save();
  X.translate(px, py);

  // Shield
  if (player.shield > 0) {
    var pulse = Math.sin(frame * 0.2) * 0.1 + 1;
    X.strokeStyle = '#00BFFF';
    X.lineWidth = 2;
    X.beginPath();
    X.arc(0, 0, (PW/2 + 5) * pulse, 0, 6.28);
    X.stroke();
  }

  // Body
  X.fillStyle = '#FF8C00';
  X.beginPath();
  X.ellipse(0, 0, PW/2, PH/2, 0, 0, 6.28);
  X.fill();

  // Legs
  var bounce = Math.sin(frame * 0.15) * 3;
  X.fillStyle = '#8B4513';
  X.beginPath();
  X.ellipse(-PW/3, PH/3 + bounce, 6, 12, 0, 0, 6.28);
  X.fill();
  X.beginPath();
  X.ellipse(PW/3, PH/3 + bounce, 6, 12, 0, 0, 6.28);
  X.fill();

  // Head
  X.fillStyle = '#FFD700';
  X.beginPath();
  X.arc(0, -PH/2 + 5, 14, 0, 6.28);
  X.fill();

  // Eyes
  X.fillStyle = '#000';
  X.beginPath();
  X.arc(-5, -PH/2 + 3, 3, 0, 6.28);
  X.fill();
  X.beginPath();
  X.arc(5, -PH/2 + 3, 3, 0, 6.28);
  X.fill();

  // Staff
  if (player.atkCD > 0) {
    X.strokeStyle = '#FFD700';
    X.lineWidth = 3;
    X.beginPath();
    X.moveTo(0, 0);
    X.lineTo(player.facing * 25, -10);
    X.stroke();
  }

  X.restore();
}

function drawParticles() {
  for (var i = 0; i < particles.length; i++) {
    var p = particles[i];
    var px = p.x - cam.x + shake.x;
    var py = p.y - cam.y + shake.y;
    X.save();
    X.translate(px, py);
    X.fillStyle = p.color;
    X.beginPath();
    X.arc(0, 0, p.size, 0, 6.28);
    X.fill();
    X.restore();
  }
}

function drawProjectiles() {
  for (var i = 0; i < projectiles.length; i++) {
    var p = projectiles[i];
    var px = p.x - cam.x + shake.x;
    var py = p.y - cam.y + shake.y;
    X.save();
    X.translate(px, py);
    X.fillStyle = '#FF4040';
    X.beginPath();
    X.arc(0, 0, p.size, 0, 6.28);
    X.fill();
    X.restore();
  }
}

function drawKameBlasts() {
  for (var i = 0; i < kameBlasts.length; i++) {
    var k = kameBlasts[i];
    var kx = k.x - cam.x + shake.x;
    var ky = k.y - cam.y + shake.y;
    var a = k.life / k.maxLife;
    X.save();
    X.translate(kx, ky);
    X.globalAlpha = a * 0.9;
    X.fillStyle = 'rgba(0,229,255,' + (a * 0.8) + ')';
    X.beginPath();
    X.arc(0, 0, k.size, 0, 6.28);
    X.fill();
    X.restore();
  }
}

// === AWAN ===
function activateCloud() {
  if (player.energy < 18 || player.onCloud) return;
  player.energy -= 18;
  player.onCloud = true;
  player.cloudTimer = 220;
  player.vy = 0;
  sfxCloud();
  spawnP(player.x, player.y + PH / 2, 10, '#FFF8DC', 0.9, 0.7);
}

// === RENDER UI ===
function renderUI() {
  var hpB = document.getElementById('hpB');
  var enB = document.getElementById('enB');
  var scV = document.getElementById('scV');
  var dsV = document.getElementById('dsV');
  var cmV = document.getElementById('cmV');

  if (hpB) hpB.style.width = Math.max(0, player.hp / player.maxHp * 100) + '%';
  if (enB) enB.style.width = Math.max(0, player.energy / player.maxEnergy * 100) + '%';
  if (scV) scV.textContent = score;
  if (dsV) dsV.textContent = Math.floor(distance) + 'm';
  if (cmV) cmV.textContent = '×' + comboMultiplier;
}

// === INPUT MOUSE ===
addEventListener('mousedown', function(e) { if (e.button === 0) mouseState.leftClick = true; });
addEventListener('mouseup', function(e) { if (e.button === 0) mouseState.leftClick = false; });

// ============================================
// KEYBOARD - KONTROL FINAL (D = KAMEHAMEHA)
// ============================================
addEventListener('keydown', function(e) {
  var key = e.key.toLowerCase();
  if (key === 'a') { e.preventDefault(); keys['a'] = true; }
  else if (key === 's') { e.preventDefault(); keys['s'] = true; }
  else if (key === 'd' || key === 'k') { e.preventDefault(); keys['d'] = true; keys['k'] = true; }
  else if (key === 'arrowleft') { e.preventDefault(); keys['arrowleft'] = true; }
  else if (key === 'arrowright') { e.preventDefault(); keys['arrowright'] = true; }
  else if (key === 'arrowup') { e.preventDefault(); keys['arrowup'] = true; }
  else if (key === 'arrowdown') { e.preventDefault(); keys['arrowdown'] = true; }
  else if (key === ' ') { e.preventDefault(); keys[' '] = true; }
  if (key === 'enter') {
    e.preventDefault();
    if (state === 'menu') { startGame(); }
    else if (state === 'over') { restartGame(); }
  }
});

addEventListener('keyup', function(e) {
  var key = e.key.toLowerCase();
  if (key === 'a') { keys['a'] = false; }
  else if (key === 's') { keys['s'] = false; }
  else if (key === 'd' || key === 'k') { keys['d'] = false; keys['k'] = false; }
  else if (key === 'arrowleft') { keys['arrowleft'] = false; }
  else if (key === 'arrowright') { keys['arrowright'] = false; }
  else if (key === 'arrowup') { keys['arrowup'] = false; }
  else if (key === 'arrowdown') { keys['arrowdown'] = false; }
  else if (key === ' ') { keys[' '] = false; }
});

// === TOUCH ===
var touchState = { moveX: 0, moveY: 0, jump: false, atk: false, kame: false, cloud: false, down: false };
window.touchState = touchState;
var joystickActive = false, joystickId = null, joystickCX = 0, joystickCY = 0;
var btnKeys = ['jump', 'atk', 'kame', 'cloud', 'down'];
var activeTouches = {};

function setupTouch() {
  var jz = document.getElementById('joystickZone');
  var jthumb = document.getElementById('joystickThumb');
  var jbase = document.getElementById('joystickBase');

  if (!jz || !jthumb || !jbase) {
    console.warn('Touch controls tidak ditemukan di HTML. Lewati setup.');
    return;
  }

  var rect = jz.getBoundingClientRect();
  joystickCX = rect.left + rect.width / 2;
  joystickCY = rect.top + rect.height / 2;
  var maxR = rect.width / 2 * 0.8;

  function startJoystick(e) {
    if (joystickActive) return;
    e.preventDefault();
    var touch = e.changedTouches[0];
    joystickId = touch.identifier;
    joystickActive = true;
    updateJoystick(touch.clientX, touch.clientY, maxR, jthumb);
  }

  function moveJoystick(e) {
    if (!joystickActive) return;
    for (var i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joystickId) {
        updateJoystick(e.changedTouches[i].clientX, e.changedTouches[i].clientY, maxR, jthumb);
        break;
      }
    }
  }

  function endJoystick(e) {
    if (!joystickActive) return;
    for (var i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joystickId) {
        joystickActive = false;
        joystickId = null;
        jthumb.style.left = '50%';
        jthumb.style.top = '50%';
        touchState.moveX = 0;
        touchState.moveY = 0;
        break;
      }
    }
  }

  function updateJoystick(clientX, clientY, maxR, jthumb) {
    var dx = clientX - joystickCX, dy = clientY - joystickCY;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > maxR) { dx = dx / dist * maxR; dy = dy / dist * maxR; }
    jthumb.style.left = (50 + (dx / maxR) * 50) + '%';
    jthumb.style.top = (50 + (dy / maxR) * 50) + '%';
    touchState.moveX = dx / maxR;
    touchState.moveY = dy / maxR;
    if (Math.abs(touchState.moveX) < 0.1) touchState.moveX = 0;
    if (Math.abs(touchState.moveY) < 0.1) touchState.moveY = 0;
  }

  jz.addEventListener('touchstart', startJoystick, { passive: false });
  jz.addEventListener('touchmove', moveJoystick, { passive: false });
  jz.addEventListener('touchend', endJoystick, { passive: false });
  jz.addEventListener('touchcancel', endJoystick, { passive: false });

  var btnIds = ['btnJump', 'btnAtk', 'btnKame', 'btnCloud', 'btnDown'];
  for (var b = 0; b < btnIds.length; b++) {
    (function(idx) {
      var el = document.getElementById(btnIds[idx]);
      var key = btnKeys[idx];
      if (!el) return;
      el.addEventListener('touchstart', function(e) {
        e.preventDefault(); e.stopPropagation();
        touchState[key] = true; el.classList.add('pressed');
        for (var i = 0; i < e.changedTouches.length; i++) activeTouches[e.changedTouches[i].identifier] = key;
      }, { passive: false });
      el.addEventListener('touchend', function(e) {
        e.preventDefault(); e.stopPropagation();
        for (var i = 0; i < e.changedTouches.length; i++) {
          var id = e.changedTouches[i].identifier;
          if (activeTouches[id] === key) delete activeTouches[id];
        }
        var stillActive = false;
        for (var id in activeTouches) { if (activeTouches[id] === key) { stillActive = true; break; } }
        if (!stillActive) { touchState[key] = false; el.classList.remove('pressed'); }
      }, { passive: false });
      el.addEventListener('touchcancel', function(e) {
        touchState[key] = false; el.classList.remove('pressed');
        for (var i = 0; i < e.changedTouches.length; i++) delete activeTouches[e.changedTouches[i].identifier];
      }, { passive: false });
      el.addEventListener('mousedown', function() { touchState[key] = true; el.classList.add('pressed'); });
      el.addEventListener('mouseup', function() { touchState[key] = false; el.classList.remove('pressed'); });
      el.addEventListener('mouseleave', function() { touchState[key] = false; el.classList.remove('pressed'); });
    })(b);
  }
}

document.addEventListener('touchmove', function(e) { if (state === 'play') e.preventDefault(); }, { passive: false });

// === EVENT LISTENERS FOR BUTTONS ===
document.getElementById('startBtn').addEventListener('click', function(e) {
  startGame();
});
document.getElementById('startBtn').addEventListener('touchend', function(e) {
  e.preventDefault();
  startGame();
});

document.getElementById('restartBtn').addEventListener('click', function(e) {
  restartGame();
});
document.getElementById('restartBtn').addEventListener('touchend', function(e) {
  e.preventDefault();
  restartGame();
});

// === INIT ===
setupTouch();
// Panggil initGame langsung
initGame();

function initGame() {
  console.log('🔧 initGame() dipanggil...');
  // - GUARD CLAUSES -
  if (typeof W === 'undefined' || typeof H === 'undefined' || W === 0 || H === 0) {
    throw new Error('Canvas Width/Height (W/H) belum siap! Nilai: W=' + W + ', H=' + H);
  }
  if (!window.X) {
    throw new Error('Canvas Context (window.X) belum siap!');
  }
  // -

  player = createPlayer();
  platforms = [];
  ghosts = [];
  particles = [];
  projectiles = [];
  kameBlasts = [];
  score = 0;
  distance = 0;
  frame = 0;
  quakeCD = 480;
  ghostTimer = 0;
  genX = 0;
  shake = { x: 0, y: 0, i: 0, t: 0 };
  comboCount = 0;
  comboTimer = 0;
  comboMultiplier = 1;
  questNoDamage = true;
  questDistanceStart = distance;
  dailyQuests.forEach(q => { q.current = 0; q.done = false; });
  renderQuestUI();

  // Init pet
  pet = null;
  petPoints = 0;
  petState = 'normal';
  petTransformTimer = 0;
  spawnPet();

  // Init boss
  boss = null;
  bossState = 'idle';
  nextBossDistance = BOSS_SPAWN_DISTANCE;

  // Camera
  cam.x = player.x - W / 2;
  cam.y = player.y - H / 2;

  // Generate first chunk
  genX = generateChunk(0);

  // UI
  renderUI();

  // Reset input states
  for (var k in keys) keys[k] = false;
  touchState.jump = false;
  touchState.atk = false;
  touchState.kame = false;
  touchState.cloud = false;
  touchState.down = false;
  var jthumb = document.getElementById('joystickThumb');
  if (jthumb) { jthumb.style.left = '50%'; jthumb.style.top = '50%'; }

  // Update window globals
  window.score = score;
  window.distance = distance;
  window.frame = frame;
  window.player = player;
  window.platforms = platforms;
  window.ghosts = ghosts;
  window.particles = particles;
  window.projectiles = projectiles;
  window.kameBlasts = kameBlasts;
  window.quakeCD = quakeCD;
  window.ghostTimer = ghostTimer;
  window.genX = genX;
  window.W = W;
  window.H = H;
  window.cam = cam;
  window.state = state;
  window.pet = pet;
  window.comboCount = comboCount;
  window.dailyQuests = dailyQuests;
  window.petPoints = petPoints;
  window.petState = petState;

  gameOverTriggered = false;
  window.gameOverTriggered = false;

  // Reset King Kong juga
  if (typeof initKingKong === 'function') {
    try { initKingKong(); } catch(e) {}
  }

  console.log('✅ initGame() selesai');
}
