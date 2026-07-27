// ============================================
// KING KONG SPRITE MODULE — STABIL & SEJAJAR PLAYER
// ✅ KK selalu sejajar dengan Sun Wukong (bukan di bawahnya)
// ✅ Tidak perlu naik awan — KK muncul di semua posisi
// ============================================
var KK = {
  img: null,
  ready: false,
  frames: [],
  sourceH: 0,
  url: 'assets/images/Kingkong brutal.png',

  // Position — anchor di PUSAT TUBUH (bukan kaki)
  x: 0,
  y: 0,          // ← SEJAJAR DENGAN player.y (center)
  facing: 1,

  // Animation
  state: 'idle',
  animTimer: 0,
  currentFrame: 0,
  cycleTimer: 0,

  // Config — 2 langkah = ~38px
  followDist: 38,   // dua langkah (lebar kaki player ~19px × 2)
  SW_TARGET_RATIO: 1.0,

  // Debug — HARUS FALSE UNTUK PRODUCTION
  debug: false      // 🔴 OFF — tidak ada bingkai merah
};

window.KK = KK;

// ============================================
// LOAD SPRITE — SAFE WITH ERROR HANDLING
// ============================================
function loadKingKongSprite() {
  return new Promise(function (resolve) {
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function () {
      try {
        var sw = img.naturalWidth || img.width || 0;
        var sh = img.naturalHeight || img.height || 0;
        if (sw < 40 || sh < 40) {
          console.warn('[KingKong] Gambar terlalu kecil:', sw, 'x', sh);
          resolve();
          return;
        }

        // Bagi 4 frame horizontal
        var frameW = Math.floor(sw / 4);
        KK.frames = [];
        for (var f = 0; f < 4; f++) {
          KK.frames.push({
            x: f * frameW,
            y: 0,
            w: frameW,
            h: sh,
            ox: frameW / 2,        // center X
            oy: sh * 0.55          // ✅ ANCHOR DI 55% DARI BAWAH = PUSAT TUBUH (bukan kaki!)
          });
        }
        KK.img = img;
        KK.sourceH = sh;
        KK.ready = true;
        console.log('[KingKong] Sprite loaded. frames:', KK.frames.length, 'size:', sw + 'x' + sh);
      } catch (e) {
        console.warn('[KingKong] Load error (onload):', e);
      }
      resolve();
    };
    img.onerror = function () {
      console.warn('[KingKong] Gagal load gambar:', KK.url);
      resolve();
    };
    img.src = KK.url;
  });
}
window.loadKingKongSprite = loadKingKongSprite;

// ============================================
// INIT — AMAN, SET POSISI AWAL SEJAJAR PLAYER
// ============================================
function initKingKong() {
  if (!KK || !window.player) return;

  var p = window.player;
  var px = p.x || 200;
  var py = p.y || 400;

  KK.x = px - KK.followDist * (p.facing || 1);
  KK.y = py;                     // ✅ SEJAJAR CENTER PLAYER (bukan kaki!)
  KK.facing = p.facing || 1;
  KK.state = 'idle';
  KK.currentFrame = 0;
  KK.animTimer = 0;
  KK.cycleTimer = 0;

  console.log('[KingKong] Init at (x,y)=', Math.round(KK.x), Math.round(KK.y));
}
window.initKingKong = initKingKong;

// ============================================
// UPDATE — POSISI SELALU SEJAJAR PLAYER
// ============================================
function updateKingKong() {
  if (!window.player || !KK) return;

  try {
    var p = window.player;
    var ph = window.PH || 38;

    // ✅ KK.y = player.y → sejajar center
    KK.x = p.x - (KK.followDist * (p.facing || 1));
    KK.y = p.y;                  // ← ini kunci!
    KK.facing = p.facing || 1;

    // Animation cycle (20 detik = 1200 frames)
    KK.cycleTimer++;
    if (KK.cycleTimer >= 1200) KK.cycleTimer = 0;

    var phase = KK.cycleTimer;
    if (phase < 300) KK.state = 'idle';
    else if (phase < 600) KK.state = 'punch';
    else if (phase < 900) KK.state = 'chest_beat';
    else KK.state = 'roar';

    // Frame berdasarkan state
    if (KK.state === 'idle') KK.currentFrame = 0;
    else if (KK.state === 'punch') KK.currentFrame = 1;
    else if (KK.state === 'chest_beat') KK.currentFrame = (Math.floor(KK.animTimer / 8) % 2 === 0) ? 2 : 3;
    else if (KK.state === 'roar') KK.currentFrame = 3;

    KK.animTimer++;

    // Logging opsional (hanya jika debug = true)
    if (KK.debug && KK.animTimer % 60 === 0) {
      console.log('[KingKong] pos:', Math.round(KK.x), Math.round(KK.y),
        'state:', KK.state, 'frame:', KK.currentFrame,
        'player:', Math.round(p.x), Math.round(p.y));
    }
  } catch (e) {
    console.warn('[KingKong] Update error:', e);
  }
}
window.updateKingKong = updateKingKong;

// ============================================
// DRAW — SAFE, NO OFFSET ERROR, NO CROP
// ============================================
function drawKingKong() {
  if (!KK || !window.X) return;

  try {
    var kk = KK;
    var camX = window.cam ? window.cam.x : 0;
    var camY = window.cam ? window.cam.y : 0;
    var W = window.W || innerWidth;

    var sx = kk.x - camX;
    var sy = kk.y - camY;

    // Cek viewport: hanya gambar jika dalam jangkauan ±200px
    if (sx < -200 || sx > W + 200) return;

    // Fallback jika belum siap
    if (!kk.ready || !kk.img || !kk.frames[kk.currentFrame]) {
      drawKingKongFallback(sx, sy);
      return;
    }

    var fr = kk.frames[kk.currentFrame];
    var sc = 1.0;
    var drawW = fr.w * sc;
    var drawH = fr.h * sc;
    var drawX = sx - fr.ox * sc;
    var drawY = sy - fr.oy * sc;  // ✅ oy = sh * 0.55 → pusat tubuh

    window.X.save();
    window.X.translate(drawX, drawY);
    window.X.scale(sc, sc);

    // Draw sprite
    window.X.drawImage(
      kk.img,
      fr.x, fr.y, fr.w, fr.h,
      -fr.ox, -fr.oy, fr.w, fr.h
    );

    // ⚠️ DEBUG BOUNDS — DIHAPUS KARENA debug: false
    // if (kk.debug) { ... } → TIDAK DIJALANKAN

    window.X.restore();
  } catch (e) {
    console.warn('[KingKong] Draw error:', e);
  }
}
window.drawKingKong = drawKingKong;

// ============================================
// FALLBACK — GAMBAR SEDERHANA JIKA SPRITE BELUM SIAP
// ============================================
function drawKingKongFallback(sx, sy) {
  try {
    window.X.save();
    window.X.translate(sx, sy);
    window.X.fillStyle = '#555';
    window.X.beginPath();
    window.X.arc(0, 0, 20, 0, 6.28);
    window.X.fill();
    window.X.strokeStyle = '#333';
    window.X.lineWidth = 2;
    window.X.strokeRect(-18, -25, 36, 50);
    window.X.restore();
  } catch (e) {
    console.warn('[KingKong] Fallback draw error:', e);
  }
}
