// ============================================
// KING KONG SPRITE MODULE — FIXED VERSION
// Skala: ~80px tinggi (sejajar Sun Wukong)
// Posisi: di tanah, tidak ikut lompat
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
    stateTimer: 0,
    cycleTimer: 0,

    followDist: 70,

    // Skala dihitung dari tinggi gambar asli
    // Target: 80px tinggi (sebanding Sun Wukong ~70-95px)
    targetHeight: 80,
    scale: 1.0,

    debug: false
};

window.KK = KK;

// ============================================
// LOAD SPRITE
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

                // Bagi rata 4 frame
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
                // Hitung skala: target 80px / tinggi gambar asli
                KK.scale = KK.targetHeight / sh;
                KK.ready = true;

                console.log('[KingKong] Loaded. imgSize:', sw + 'x' + sh, 
                            'frameW:', frameW, 'scale:', KK.scale.toFixed(3));
            } catch (e) {
                console.warn('[KingKong] Load error:', e);
            }
            resolve();
        };
        img.onerror = function() {
            console.warn('[KingKong] Gagal load gambar');
            resolve();
        };
        img.src = KK.url;
    });
}

window.loadKingKongSprite = loadKingKongSprite;

// ============================================
// UPDATE — POSISI DI TANAH
// ============================================
function updateKingKong() {
    if (!window.player) return;
    if (!KK) return;

    try {
        var p = window.player;
        var H = window.H || innerHeight;

        // X: di belakang player
        KK.x = p.x - (KK.followDist * (p.facing || 1));

        // Y: di TANAH (ground), tidak ikut lompat player
        // Ground Y = H - 35 (dari makePlat di game.js)
        // Kaki King Kong = groundY
        var groundY = H - 35;
        KK.y = groundY;

        KK.facing = p.facing || 1;

        // Animation cycle (20 detik = 1200 frames)
        KK.cycleTimer++;
        if (KK.cycleTimer >= 1200) KK.cycleTimer = 0;

        var phase = KK.cycleTimer;
        if (phase < 300) KK.state = 'idle';
        else if (phase < 500) KK.state = 'punch_right';
        else if (phase < 700) KK.state = 'punch_left';
        else if (phase < 900) KK.state = 'chest_beat';
        else KK.state = 'idle';

        // Frame
        KK.animTimer++;
        if (KK.state === 'idle') KK.currentFrame = 2;
        else if (KK.state === 'punch_right') KK.currentFrame = 0;
        else if (KK.state === 'punch_left') KK.currentFrame = 1;
        else if (KK.state === 'chest_beat') KK.currentFrame = (Math.floor(KK.animTimer / 8) % 2 === 0) ? 2 : 3;

    } catch (e) {
        console.warn('[KingKong] Update error:', e);
    }
}

window.updateKingKong = updateKingKong;

// ============================================
// DRAW — SKALA DINAMIS, POSISI TANAH
// ============================================
function drawKingKong() {
    if (!KK) return;

    try {
        var kk = KK;
        var camX = window.cam ? window.cam.x : 0;
        var camY = window.cam ? window.cam.y : 0;
        var W = window.W || innerWidth;

        var sx = kk.x - camX;
        var sy = kk.y - camY;

        // Cek viewport
        if (sx < -300 || sx > W + 300) return;

        // FALLBACK
        if (!kk.ready || !kk.img || !kk.frames[kk.currentFrame]) {
            drawKingKongFallback(sx, sy);
            return;
        }

        var fr = kk.frames[kk.currentFrame];
        var sc = kk.scale;  // skala dinamis dari tinggi gambar

        var drawW = fr.w * sc;
        var drawH = fr.h * sc;
        var drawX = -fr.ox * sc;
        var drawY = -fr.oy * sc;  // anchor di BAWAH gambar

        window.X.save();
        window.X.translate(sx, sy);

        // Flip
        if (kk.facing === -1) {
            window.X.scale(-1, 1);
            drawX = -drawX - drawW;
        }

        // Draw sprite — PASTIKAN parameter benar
        window.X.drawImage(
            kk.img,           // sumber gambar
            fr.x, fr.y,       // sumber x, y (offset frame)
            fr.w, fr.h,       // sumber width, height (ukuran frame)
            drawX, drawY,     // target x, y (di canvas, relatif translate)
            drawW, drawH      // target width, height (skala)
        );

        // Debug bounds
        if (kk.debug) {
            window.X.strokeStyle = '#FF0000';
            window.X.lineWidth = 2;
            window.X.strokeRect(drawX, drawY, drawW, drawH);
            window.X.fillStyle = '#00FF00';
            window.X.beginPath();
            window.X.arc(0, 0, 4, 0, 6.28);
            window.X.fill();
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
function drawKingKongFallback(sx, sy) {
    try {
        window.X.save();
        window.X.translate(sx, sy);

        window.X.globalAlpha = 0.3;
        window.X.beginPath();
        window.X.ellipse(0, 2, 20, 5, 0, 0, 6.28);
        window.X.fillStyle = '#000';
        window.X.fill();
        window.X.globalAlpha = 1;

        window.X.fillStyle = '#4A3728';
        window.X.fillRect(-15, -40, 30, 40);
        window.X.fillStyle = '#5C4033';
        window.X.beginPath();
        window.X.arc(0, -45, 12, 0, 6.28);
        window.X.fill();
        window.X.fillStyle = '#FF0000';
        window.X.beginPath();
        window.X.arc(-5, -48, 3, 0, 6.28);
        window.X.fill();
        window.X.beginPath();
        window.X.arc(5, -48, 3, 0, 6.28);
        window.X.fill();

        window.X.restore();
    } catch (e) {}
}

// ============================================
// INIT
// ============================================
function initKingKong() {
    if (!KK) return;
    var px = (window.player && window.player.x) ? window.player.x : 200;
    var H = window.H || innerHeight;

    KK.x = px - 70;
    KK.y = H - 35;  // di tanah
    KK.facing = 1;
    KK.state = 'idle';
    KK.currentFrame = 2;
    KK.animTimer = 0;
    KK.cycleTimer = 0;

    console.log('[KingKong] Init at', Math.round(KK.x), Math.round(KK.y), 'scale:', KK.scale.toFixed(3));
}

window.initKingKong = initKingKong;
