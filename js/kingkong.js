// ============================================
// KING KONG SPRITE MODULE — PATCHED v2
// Anchor: kaki (bottom center)
// Fix: auto-crop pixel scan, scale proporsional,
//      follow distance lebih jauh, posisi kaki benar
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

  followDist: 110,   // PATCH 4: lebih jauh karena KK lebih besar dari Wukong
  scale: 1.0,

  debug: false
};

window.KK = KK;

// ============================================
// LOAD — dengan auto-crop pixel scan (seperti Wukong)
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

        // =============================================
        // PATCH 1+2+8: Auto-crop pixel scan per frame
        // Sama persis dengan processSpriteSheet() Wukong
        // =============================================
        var tc = document.createElement('canvas');
        tc.width = sw;
        tc.height = sh;
        var tx = tc.getContext('2d');
        tx.drawImage(img, 0, 0);
        var imgData = tx.getImageData(0, 0, sw, sh);
        var pixels = imgData.data;

        // Deteksi kolom tiap frame (4 frame horizontal)
        var frameW = Math.floor(sw / 4);
        var frames = [];

        for (var f = 0; f < 4; f++) {
          var startX = f * frameW;
          var endX   = (f < 3) ? (f + 1) * frameW : sw;

          // Scan bounding box pixel non-transparan di tiap frame
          var minX = endX, maxX = startX, minY = sh, maxY = 0;
          var found = false;

          for (var px = startX; px < endX; px++) {
            for (var py = 0; py < sh; py++) {
              var idx = (py * sw + px) * 4;
              if (pixels[idx + 3] > 20) {   // alpha > 20 = ada pixel
                if (px < minX) minX = px;
                if (px > maxX) maxX = px;
                if (py < minY) minY = py;
                if (py > maxY) maxY = py;
                found = true;
              }
            }
          }

          // Fallback jika tidak ada pixel yang terdeteksi
          if (!found) {
            minX = startX; maxX = endX - 1; minY = 0; maxY = sh - 1;
          }

          var fw = maxX - minX + 1;
          var fh = maxY - minY + 1;

          frames.push({
            x:  minX,        // source x di PNG
            y:  minY,        // source y di PNG (auto-crop atas)
            w:  fw,          // lebar bounding box pixel nyata
            h:  fh,          // tinggi bounding box pixel nyata (BUKAN sh!)
            ox: fw / 2,      // pivot center-x
            oy: fh           // pivot di KAKI (bawah bounding box)
          });
        }

        // Hitung maxH dari frame yang nyata (bukan sh)
        var maxH = 0;
        for (var i = 0; i < frames.length; i++) {
          if (frames[i].h > maxH) maxH = frames[i].h;
        }

        KK.frames   = frames;
        KK.img      = img;
        KK.sourceH  = maxH;

        // PATCH 1: Scale berdasarkan tinggi FRAME nyata, bukan PNG
        // Target tinggi King Kong di layar ~160px (lebih besar dari Wukong ~80px)
        var TARGET_H = 160;
        KK.scale = TARGET_H / maxH;
        KK.scale = Math.max(0.8, Math.min(3.5, KK.scale));

        KK.ready = true;
        console.log('[KingKong] OK. PNG:', sw + 'x' + sh,
                    '| maxFrameH:', maxH,
                    '| scale:', KK.scale.toFixed(2),
                    '| frames:', frames.length);
      } catch (e) {
        console.warn('[KingKong] Load error:', e);
      }
      resolve();
    };
    img.onerror = function() {
      console.warn('[KingKong] Gagal load:', KK.url);
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
  var px  = (window.player && window.player.x) ? window.player.x : 200;
  var py  = (window.player && window.player.y) ? window.player.y : 400;
  var PH  = window.PH || 38;

  KK.x            = px - KK.followDist;
  KK.y            = py + PH * 0.5;  // PATCH 3: kaki player
  KK.facing       = 1;
  KK.state        = 'idle';
  KK.currentFrame = 2;
  KK.animTimer    = 0;
  KK.cycleTimer   = 0;

  console.log('[KingKong] Init x:', Math.round(KK.x), 'y:', Math.round(KK.y));
}
window.initKingKong = initKingKong;

// ============================================
// UPDATE
// ============================================
function updateKingKong() {
  if (!window.player || !KK) return;
  try {
    var p  = window.player;
    var PH = window.PH || 38;

    // PATCH 3: x di belakang player, y sejajar KAKI player
    KK.x = p.x - (KK.followDist * (p.facing || 1));
    // Kaki player = p.y + PH/2, tambah +8 agar KK sedikit di bawah
    KK.y = p.y + PH * 0.5 + 8;

    KK.facing = p.facing || 1;

    // Siklus animasi 20 detik (1200 frame)
    KK.cycleTimer++;
    if (KK.cycleTimer >= 1200) KK.cycleTimer = 0;

    var phase = KK.cycleTimer;
    if      (phase < 300) KK.state = 'idle';
    else if (phase < 500) KK.state = 'punch_right';
    else if (phase < 700) KK.state = 'punch_left';
    else if (phase < 900) KK.state = 'chest_beat';
    else                  KK.state = 'idle';

    KK.animTimer++;
    if      (KK.state === 'idle')        KK.currentFrame = 2;
    else if (KK.state === 'punch_right') KK.currentFrame = 0;
    else if (KK.state === 'punch_left')  KK.currentFrame = 1;
    else if (KK.state === 'chest_beat')
      KK.currentFrame = (Math.floor(KK.animTimer / 8) % 2 === 0) ? 2 : 3;

  } catch (e) {
    console.warn('[KingKong] Update error:', e);
  }
}
window.updateKingKong = updateKingKong;

// ============================================
// DRAW — anchor = kaki, tanpa double offset
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
    var W    = window.W || innerWidth;

    // Posisi anchor di layar (kaki KK)
    var sx = kk.x - camX;
    var sy = kk.y - camY;

    if (sx < -400 || sx > W + 400) return;

    var sc = kk.scale;

    window.X.save();
    window.X.translate(sx, sy);

    // Flip kalau menghadap kiri
    if (kk.facing === -1) {
      window.X.scale(-1, 1);
    }

    // drawImage:
    //   sumber : fr.x, fr.y, fr.w, fr.h  (bounding box pixel nyata)
    //   target : center-x = -fr.ox*sc, bottom = 0
    //            → geser kiri setengah width, dan ATAS penuh height
    window.X.drawImage(
      kk.img,
      fr.x, fr.y, fr.w, fr.h,
      -fr.ox * sc, -fr.oy * sc, fr.w * sc, fr.h * sc
    );

    // PATCH 5: Debug anchor — aktifkan KK.debug=true di konsol untuk melihat
    if (kk.debug) {
      // Titik merah = anchor kaki
      window.X.fillStyle = 'red';
      window.X.beginPath();
      window.X.arc(0, 0, 5, 0, Math.PI * 2);
      window.X.fill();
      // Kotak hijau = bounding box frame
      window.X.strokeStyle = '#0F0';
      window.X.lineWidth = 2;
      window.X.strokeRect(-fr.ox * sc, -fr.oy * sc, fr.w * sc, fr.h * sc);
      // Label info
      window.X.fillStyle = '#FFF';
      window.X.font = '10px monospace';
      window.X.fillText('sc=' + sc.toFixed(2) + ' f=' + kk.currentFrame, -fr.ox * sc, -fr.oy * sc - 4);
    }

    window.X.restore();

  } catch (e) {
    console.warn('[KingKong] Draw error:', e);
  }
}
window.drawKingKong = drawKingKong;

// ============================================
// FALLBACK (sprite belum siap / gagal load)
// ============================================
function drawKingKongFallback() {
  try {
    var kk  = KK;
    var camX = window.cam ? window.cam.x : 0;
    var camY = window.cam ? window.cam.y : 0;
    var sx  = kk.x - camX;
    var sy  = kk.y - camY;

    window.X.save();
    window.X.translate(sx, sy);

    // Bayangan
    window.X.fillStyle = 'rgba(0,0,0,0.3)';
    window.X.beginPath();
    window.X.ellipse(0, 2, 30, 8, 0, 0, 6.28);
    window.X.fill();

    // Badan
    window.X.fillStyle = '#3D2914';
    window.X.fillRect(-22, -60, 44, 60);
    // Kepala
    window.X.fillStyle = '#4A3728';
    window.X.beginPath();
    window.X.arc(0, -65, 18, 0, 6.28);
    window.X.fill();
    // Mata merah
    window.X.fillStyle = '#F00';
    window.X.beginPath(); window.X.arc(-7, -68, 5, 0, 6.28); window.X.fill();
    window.X.beginPath(); window.X.arc( 7, -68, 5, 0, 6.28); window.X.fill();

    window.X.restore();
  } catch (e) {}
}
