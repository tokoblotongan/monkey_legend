// ============================================
// KING KONG SPRITE MODULE — FINAL FIX
// Anchor: kaki (bottom center)
// Posisi: sejajar kaki Sun Wukong
// Draw: tanpa double offset
// ============================================

var KK = {
  img: null,
  ready: false,
  frames: [],
  sourceH: 0,
  url: 'assets/images/Kingkong brutal.png',

  x: 0,
  y: 0,
  facing: 1,

  state: 'idle',
  animTimer: 0,
  currentFrame: 0,
  cycleTimer: 0,

  followDist: 70,
  scale: 0.4,

  debug: false
};

window.KK = KK;

// ============================================
// LOAD
// ============================================
function loadKingKongSprite() {
  return new Promise(function(resolve) {
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function() {
      try {
        var sw = img.naturalWidth || img.width || 0;
        var sh = img.naturalHeight || img.height || 0;
        if (sw < 40 || sh < 40) {
          console.warn('[KingKong] Gambar terlalu kecil');
          resolve();
          return;
        }
        var frameW = Math.floor(sw / 4);
        KK.frames = [];
        for (var f = 0; f < 4; f++) {
          KK.frames.push({
            x: f * frameW,
            y: 0,
            w: frameW,
            h: sh,
            ox: frameW / 2,
            oy: sh
          });
        }
        KK.img = img;
        KK.sourceH = sh;
        // Target tinggi ~90px
        KK.scale = Math.max(0.2, Math.min(1.5, 90 / sh));
        KK.ready = true;
        console.log('[KingKong] OK. size:', sw + 'x' + sh, 'scale:', KK.scale.toFixed(2));
      } catch (e) {
        console.warn('[KingKong] Load error:', e);
      }
      resolve();
    };
    img.onerror = function() {
      console.warn('[KingKong] Gagal load');
      resolve();
    };
    img.src = KK.url;
  });
}
window.loadKingKongSprite = loadKingKongSprite;

// ============================================
// INIT
// ============================================
function initKingKong() {
  if (!KK) return;
  var px = (window.player && window.player.x) ? window.player.x : 200;
  var py = (window.player && window.player.y) ? window.player.y : 400;
  var PH = window.PH || 38;

  KK.x = px - KK.followDist;
  KK.y = py + PH / 2;
  KK.facing = 1;
  KK.state = 'idle';
  KK.currentFrame = 2;
  KK.animTimer = 0;
  KK.cycleTimer = 0;

  console.log('[KingKong] Init', Math.round(KK.x), Math.round(KK.y));
}
window.initKingKong = initKingKong;

// ============================================
// UPDATE
// ============================================
function updateKingKong() {
  if (!window.player || !KK) return;
  try {
    var p = window.player;
    var PH = window.PH || 38;

    // X: di belakang player
    KK.x = p.x - (KK.followDist * (p.facing || 1));

    // Y: sejajar KAKI player (tidak ikut lompat naik turun secara penuh,
    // tapi tetap di ground level agar tidak melayang)
    // Kaki player = p.y + PH/2
    KK.y = p.y + PH / 2;

    KK.facing = p.facing || 1;

    // Cycle 20 detik
    KK.cycleTimer++;
    if (KK.cycleTimer >= 1200) KK.cycleTimer = 0;

    var phase = KK.cycleTimer;
    if (phase < 300) KK.state = 'idle';
    else if (phase < 500) KK.state = 'punch_right';
    else if (phase < 700) KK.state = 'punch_left';
    else if (phase < 900) KK.state = 'chest_beat';
    else KK.state = 'idle';

    KK.animTimer++;
    if (KK.state === 'idle') KK.currentFrame = 2;
    else if (KK.state === 'punch_right') KK.currentFrame = 0;
    else if (KK.state === 'punch_left') KK.currentFrame = 1;
    else if (KK.state === 'chest_beat')
      KK.currentFrame = (Math.floor(KK.animTimer / 8) % 2 === 0) ? 2 : 3;

  } catch (e) {
    console.warn('[KingKong] Update error:', e);
  }
}
window.updateKingKong = updateKingKong;

// ============================================
// DRAW — TANPA DOUBLE OFFSET
// ============================================
function drawKingKong() {
  if (!KK || !window.X) return;

  try {
    var kk = KK;
    if (!kk.ready || !kk.img) {
      drawKingKongFallback();
      return;
    }

    var fr = kk.frames[kk.currentFrame];
    if (!fr) return;

    var camX = window.cam ? window.cam.x : 0;
    var camY = window.cam ? window.cam.y : 0;
    var W = window.W || innerWidth;

    // Posisi di layar
    var sx = kk.x - camX;
    var sy = kk.y - camY;

    if (sx < -300 || sx > W + 300) return;

    var sc = kk.scale;

    // ========================================
    // CARA DRAW YANG BENAR:
    // 1. Translate ke posisi anchor (kaki) di layar
    // 2. Flip kalau perlu
    // 3. drawImage dengan offset negatif ke kiri & atas
    //    sehingga gambar muncul DI ATAS anchor
    // ========================================

    window.X.save();
    window.X.translate(sx, sy);

    if (kk.facing === -1) {
      window.X.scale(-1, 1);
    }

    // Gambar: sumber (fr.x, fr.y, fr.w, fr.h)
    // Target: (-fr.ox*sc, -fr.oy*sc, fr.w*sc, fr.h*sc)
    // fr.ox = center X, fr.oy = full height (kaki)
    // Jadi gambar digeser ke kiri setengah width, dan ke ATAS full height
    window.X.drawImage(
      kk.img,
      fr.x, fr.y, fr.w, fr.h,
      -fr.ox * sc, -fr.oy * sc, fr.w * sc, fr.h * sc
    );

    // Debug anchor
    if (kk.debug) {
      window.X.fillStyle = '#0F0';
      window.X.beginPath();
      window.X.arc(0, 0, 4, 0, 6.28);
      window.X.fill();
      window.X.strokeStyle = '#F00';
      window.X.lineWidth = 2;
      window.X.strokeRect(-fr.ox * sc, -fr.oy * sc, fr.w * sc, fr.h * sc);
    }

    window.X.restore();

  } catch (e) {
    console.warn('[KingKong] Draw error:', e);
  }
}
window.drawKingKong = drawKingKong;

// ============================================
// FALLBACK
// ============================================
function drawKingKongFallback() {
  try {
    var kk = KK;
    var camX = window.cam ? window.cam.x : 0;
    var camY = window.cam ? window.cam.y : 0;
    var sx = kk.x - camX;
    var sy = kk.y - camY;

    window.X.save();
    window.X.translate(sx, sy);

    window.X.fillStyle = 'rgba(0,0,0,0.3)';
    window.X.beginPath();
    window.X.ellipse(0, 2, 25, 6, 0, 0, 6.28);
    window.X.fill();

    window.X.fillStyle = '#3D2914';
    window.X.fillRect(-20, -50, 40, 50);
    window.X.fillStyle = '#4A3728';
    window.X.beginPath();
    window.X.arc(0, -55, 15, 0, 6.28);
    window.X.fill();
    window.X.fillStyle = '#F00';
    window.X.beginPath();
    window.X.arc(-6, -58, 4, 0, 6.28);
    window.X.fill();
    window.X.beginPath();
    window.X.arc(6, -58, 4, 0, 6.28);
    window.X.fill();

    window.X.restore();
  } catch (e) {}
}
