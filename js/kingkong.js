// ============================================
// KING KONG SPRITE MODULE — MINIMAL SAFE VERSION
// Fokus: posisi benar, tidak jatuh, tidak rusak
// ============================================

var KK = {
    img: null,
    ready: false,
    frames: [],
    sourceH: 0,
    url: 'assets/images/Kingkong brutal.png',

    // Position
    x: 0,
    y: 0,
    facing: 1,

    // State
    state: 'idle',
    animTimer: 0,
    currentFrame: 0,
    stateTimer: 0,
    cycleTimer: 0,

    // Config
    followDist: 70,
    SW_TARGET_RATIO: 1.0,

    // Debug
    debug: true  // aktifkan untuk lihat posisi di console
};

window.KK = KK;

// ============================================
// LOAD SPRITE — SAFE
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
                    console.warn('[KingKong] Gambar terlalu kecil:', sw, 'x', sh);
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
                        oy: sh  // anchor di BAWAH (kaki)
                    });
                }

                KK.img = img;
                KK.sourceH = sh;
                KK.ready = true;
                console.log('[KingKong] Sprite OK. frames:', KK.frames.length, 'size:', sw + 'x' + sh);
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
// UPDATE — POSISI SANGAT SEDERHANA
// ============================================
function updateKingKong() {
    if (!window.player) return;
    if (!KK) return;

    try {
        var p = window.player;

        // POSISI: di belakang player, SEJAJAR TANAH
        // p.y adalah CENTER player. Kaki player = p.y + PH/2
        // King Kong anchor di oy (bottom), jadi KK.y = posisi kaki player
        var playerFootY = p.y + ((window.PH || 38) / 2);

        KK.x = p.x - (KK.followDist * (p.facing || 1));
        KK.y = playerFootY;  // SEJAJAR KAKI PLAYER
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

        // Logging posisi
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
// DRAW — SANGAT SEDERHANA, TIDAK RUSAK
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
        if (sx < -200 || sx > W + 200) return;

        // === FALLBACK DRAW (selalu jalan) ===
        if (!kk.ready || !kk.img || !kk.frames[kk.currentFrame]) {
            drawKingKongFallback(sx, sy);
            return;
        }

        // === SPRITE DRAW ===
        var fr = kk.frames[kk.currentFrame];
        var sc = 1.0;  // skala tetap 1.0 dulu

        var drawW = fr.w * sc;
        var drawH = fr.h * sc;
        var drawX = -fr.ox * sc;
        var drawY = -fr.oy * sc;  // anchor di BAWAH, jadi naik ke atas

        window.X.save();
        window.X.translate(sx, sy);

        // Flip
        if (kk.facing === -1) {
            window.X.scale(-1, 1);
            drawX = -drawX - drawW;
        }

        // Draw sprite
        window.X.drawImage(
            kk.img,
            fr.x, fr.y, fr.w, fr.h,
            drawX, drawY, drawW, drawH
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
// FALLBACK — GAMBAR SEDERHANA
// ============================================
function drawKingKongFallback(sx, sy) {
    try {
        window.X.save();
        window.X.translate(sx, sy);

        // Shadow
        window.X.globalAlpha = 0.3;
        window.X.beginPath();
        window.X.ellipse(0, 2, 20, 5, 0, 0, 6.28);
        window.X.fillStyle = '#000';
        window.X.fill();
        window.X.globalAlpha = 1;

        // Body
        window.X.fillStyle = '#4A3728';
        window.X.fillRect(-15, -40, 30, 40);

        // Head
        window.X.fillStyle = '#5C4033';
        window.X.beginPath();
        window.X.arc(0, -45, 12, 0, 6.28);
        window.X.fill();

        // Red eyes
        window.X.fillStyle = '#FF0000';
        window.X.beginPath();
        window.X.arc(-5, -48, 3, 0, 6.28);
        window.X.fill();
        window.X.beginPath();
        window.X.arc(5, -48, 3, 0, 6.28);
        window.X.fill();

        // Label
        window.X.fillStyle = '#FFF';
        window.X.font = '10px sans-serif';
        window.X.textAlign = 'center';
        window.X.fillText('KING KONG', 0, -60);

        window.X.restore();
    } catch (e) {}
}

// ============================================
// INIT
// ============================================
function initKingKong() {
    if (!KK) return;
    var px = (window.player && window.player.x) ? window.player.x : 200;
    var py = (window.player && window.player.y) ? window.player.y : 400;
    var footY = py + ((window.PH || 38) / 2);

    KK.x = px - 70;
    KK.y = footY;
    KK.facing = 1;
    KK.state = 'idle';
    KK.currentFrame = 2;
    KK.animTimer = 0;
    KK.cycleTimer = 0;

    console.log('[KingKong] Init at', Math.round(KK.x), Math.round(KK.y));
}

window.initKingKong = initKingKong;
