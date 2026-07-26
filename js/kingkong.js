// ============================================
// KING KONG SPRITE MODULE
// Menggunakan: assets/images/Kingkong brutal.png (4 frame)
// Frame: 0=RightPunch, 1=LeftPunch, 2=ChestBeat1, 3=ChestBeat2
// ============================================

var KK = {
    img: null,
    ready: false,
    frames: [],
    sourceH: 0,
    scale: 1.0,
    url: 'assets/images/Kingkong brutal.png',

    // State
    state: 'idle',        // idle, punch_right, punch_left, chest_beat
    animTimer: 0,
    currentFrame: 0,
    stateTimer: 0,

    // Transform & Position
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    facing: 1,
    transformScale: 1,

    // Attack cycle (20 detik = 1200 frames @ 60fps)
    cycleDuration: 1200,
    cycleTimer: 0,

    // Punch effects
    punchTimer: 0,
    lastPunchSide: 0,     // -1 kiri, 1 kanan

    // Config
    followDist: 140,      // jarak 3-4 langkah dari Sun Wukong (~140px)
    followSpeed: 0.18,
    spriteScale: 1.0,

    // Animation config (frames per state)
    anims: {
        idle:        { frames: [2, 3], fps: 4 },
        punch_right: { frames: [0],    fps: 8 },
        punch_left:  { frames: [1],    fps: 8 },
        chest_beat:  { frames: [2, 3], fps: 6 }
    }
};

window.KK = KK;

// ============================================
// LOAD SPRITE
// ============================================
function loadKingKongSprite() {
    return new Promise(function(resolve, reject) {
        var img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = function() {
            var data = processKingKongSheet(img);
            KK.img = img;
            KK.frames = data.frames;
            KK.sourceH = data.sourceH;
            KK.ready = true;
            KK.spriteScale = calcKKScale();
            console.log('[KingKong] Sprite loaded, frames:', data.frames.length, 'sourceH:', data.sourceH);
            resolve();
        };
        img.onerror = function() {
            console.warn('[KingKong] Gagal load sprite');
            resolve();
        };
        img.src = KK.url;
    });
}

window.loadKingKongSprite = loadKingKongSprite;

// ============================================
// PROCESS SPRITE SHEET (4 frame horizontal)
// ============================================
function processKingKongSheet(img) {
    var sw = img.naturalWidth || img.width;
    var sh = img.naturalHeight || img.height;

    // Buat canvas untuk analisis pixel
    var tc = document.createElement('canvas');
    tc.width = sw;
    tc.height = sh;
    var tx = tc.getContext('2d');
    tx.drawImage(img, 0, 0);
    var imgData = tx.getImageData(0, 0, sw, sh);
    var pixels = imgData.data;

    // Deteksi frame boundaries dengan analisis kolom
    var colEdges = [];
    var prevHadPixel = false;
    var minGap = sw / 20; // minimum gap antar frame
    var lastEdge = 0;

    for (var cx = 0; cx < sw; cx++) {
        var hasPixel = false;
        for (var cy = 0; cy < sh; cy++) {
            var idx = (cy * sw + cx) * 4;
            if (pixels[idx + 3] > 30) { hasPixel = true; break; }
        }
        if (hasPixel && !prevHadPixel && cx - lastEdge > minGap) {
            colEdges.push(cx);
            lastEdge = cx;
        }
        prevHadPixel = hasPixel;
    }

    // Fallback: kalau deteksi gagal, bagi rata 4
    if (colEdges.length < 4) {
        var fw = Math.floor(sw / 4);
        colEdges = [0, fw, fw * 2, fw * 3, sw];
    } else {
        colEdges.push(sw);
    }

    // Pastikan ada tepat 4 frame
    while (colEdges.length < 5) colEdges.push(sw);

    var frames = [];
    for (var f = 0; f < 4; f++) {
        var startX = Math.floor(colEdges[f]);
        var endX = Math.floor(colEdges[f + 1]);
        if (endX - startX < 10) endX = Math.min(sw, startX + Math.floor(sw / 4));

        // Cari bounds aktual dalam frame
        var minX = endX, maxX = startX, minY = sh, maxY = 0;
        var found = false;
        for (var px = startX; px < endX; px++) {
            for (var py = 0; py < sh; py++) {
                var idx = (py * sw + px) * 4;
                if (pixels[idx + 3] > 30) {
                    if (px < minX) minX = px;
                    if (px > maxX) maxX = px;
                    if (py < minY) minY = py;
                    if (py > maxY) maxY = py;
                    found = true;
                }
            }
        }

        if (!found) {
            minX = startX; maxX = endX - 1; minY = 0; maxY = sh - 1;
        }

        var fw2 = maxX - minX + 1;
        var fh = maxY - minY + 1;
        var ox = fw2 / 2;   // center x
        var oy = fh;        // bottom y (anchor di kaki)

        frames.push({
            x: minX,
            y: minY,
            w: fw2,
            h: fh,
            ox: ox,
            oy: oy,
            origX: startX,
            origEndX: endX
        });
    }

    // Hitung max height untuk scaling
    var maxH = 0;
    for (var i = 0; i < frames.length; i++) {
        if (frames[i].h > maxH) maxH = frames[i].h;
    }

    return { frames: frames, sourceH: maxH };
}

// ============================================
// CALCULATE SCALE
// ============================================
function calcKKScale() {
    if (!KK.sourceH) return 1.0;
    var targetH = window.W < 600 ? 90 : (window.W < 1024 ? 110 : 130);
    return Math.max(0.4, Math.min(2.0, targetH / KK.sourceH));
}

// ============================================
// UPDATE KING KONG
// ============================================
function updateKingKong() {
    if (!window.player) return;

    var p = window.player;
    var kk = KK;

    // Update scale responsive
    kk.spriteScale = calcKKScale();

    // === POSISI: 3-4 langkah di belakang Sun Wukong ===
    // Jika player menghadap kanan, King Kong di kiri (belakang)
    // Jika player menghadap kiri, King Kong di kanan (belakang)
    var targetX = p.x - (kk.followDist * p.facing);
    var targetY = p.y;

    // Smooth follow
    kk.vx += (targetX - kk.x) * kk.followSpeed;
    kk.vy += (targetY - kk.y) * kk.followSpeed;
    kk.vx *= 0.82;
    kk.vy *= 0.82;
    kk.x += kk.vx;
    kk.y += kk.vy;

    // Facing: selalu menghadap lawan (sama dengan player)
    kk.facing = p.facing;

    // === 20 DETIK ATTACK CYCLE ===
    // 1200 frames = 20 detik @ 60fps
    // Dibagi: 0-300: punch_right, 300-600: punch_left, 600-900: chest_beat, 900-1200: idle/brutal
    kk.cycleTimer++;
    if (kk.cycleTimer >= kk.cycleDuration) kk.cycleTimer = 0;

    var phase = kk.cycleTimer;
    var oldState = kk.state;

    if (phase < 300) {
        kk.state = 'punch_right';
        kk.lastPunchSide = 1;
    } else if (phase < 600) {
        kk.state = 'punch_left';
        kk.lastPunchSide = -1;
    } else if (phase < 900) {
        kk.state = 'chest_beat';
    } else {
        kk.state = 'idle';
    }

    // State change reset
    if (kk.state !== oldState) {
        kk.animTimer = 0;
        kk.currentFrame = 0;
        kk.stateTimer = 0;
    }

    // === ANIMATION ===
    var anim = kk.anims[kk.state];
    kk.stateTimer++;
    kk.animTimer += anim.fps / 60;

    if (kk.animTimer >= 1) {
        kk.animTimer -= 1;
        kk.currentFrame = (kk.currentFrame + 1) % anim.frames.length;
    }

    // === PUNCH EFFECTS (Brutal Smash) ===
    // Smash setiap 15 frame saat punching
    if ((kk.state === 'punch_right' || kk.state === 'punch_left') && kk.stateTimer % 15 === 0) {
        doBrutalSmash();
    }

    // Chest beat effect (menakuti) - shake dan particles
    if (kk.state === 'chest_beat' && kk.stateTimer % 20 === 0) {
        doChestBeatEffect();
    }

    // Update transform scale (grow/shrink smooth)
    var targetScale = (kk.state === 'idle') ? 1.0 : 1.15;
    kk.transformScale += (targetScale - kk.transformScale) * 0.1;
}

window.updateKingKong = updateKingKong;

// ============================================
// BRUTAL SMASH EFFECT
// ============================================
function doBrutalSmash() {
    var kk = KK;
    var smashX = kk.x + (kk.lastPunchSide * 80);
    var smashY = kk.y - 20;
    var smashRadius = 180;

    // Visual explosion particles
    for (var e = 0; e < 12; e++) {
        var ea = (e / 12) * 6.28;
        var sp = rnd(4, 10);
        window.particles.push({
            x: smashX + Math.cos(ea) * 15,
            y: smashY + Math.sin(ea) * 15,
            vx: Math.cos(ea) * sp,
            vy: Math.sin(ea) * sp - rnd(2, 6),
            life: rnd(25, 45),
            ml: 45,
            size: rnd(6, 16),
            color: pick(['#FFD700', '#FF4444', '#FF8C00', '#FFF', '#8B0000'])
        });
    }

    // Shockwave ring
    window.particles.push({
        x: smashX, y: smashY,
        vx: 0, vy: 0,
        life: 25, ml: 25,
        size: 15,
        targetSize: smashRadius * 1.5,
        color: 'rgba(255,80,0,0.35)',
        isShockwave: true
    });

    // Screen shake
    if (window.triggerShake) triggerShake(10, 14);

    // Damage ghosts in range
    var hitCount = 0;
    if (window.ghosts) {
        for (var i = 0; i < window.ghosts.length; i++) {
            var g = window.ghosts[i];
            var dist = Math.hypot(g.x - smashX, g.y - smashY);
            if (dist < smashRadius) {
                g.hp -= 10;
                g.hitFlash = 15;
                var dx = g.x - smashX;
                var dy = g.y - smashY;
                var d = Math.hypot(dx, dy) || 1;
                g.vx = (dx / d) * 14;
                g.vy = -12;
                hitCount++;
            }
        }
    }

    // Damage boss if in range
    if (window.boss && window.bossState === 'fight') {
        var distToBoss = Math.hypot(window.boss.x - smashX, window.boss.y - smashY);
        if (distToBoss < smashRadius + window.boss.size) {
            window.boss.hp -= 4;
            window.boss.hitFlash = 12;
            hitCount++;
        }
    }

    // SFX
    if (window.sfxHit) sfxHit();
    if (window.sfxQuake) sfxQuake();

    // Floating text
    if (hitCount > 0 && window.showFloatingText) {
        showFloatingText('💥 BRUTAL SMASH! x' + hitCount, smashX, smashY - 80, '#FFD700');
    }

    console.log('[KingKong] Brutal Smash! hits:', hitCount);
}

// ============================================
// CHEST BEAT EFFECT (Menakuti)
// ============================================
function doChestBeatEffect() {
    var kk = KK;

    // Heavy screen shake
    if (window.triggerShake) triggerShake(6, 10);

    // Roar particles
    for (var i = 0; i < 8; i++) {
        var a = rnd(0, 6.28);
        window.particles.push({
            x: kk.x + Math.cos(a) * 30,
            y: kk.y - 60 + Math.sin(a) * 20,
            vx: Math.cos(a) * rnd(2, 5),
            vy: Math.sin(a) * rnd(2, 5) - 3,
            life: rnd(20, 35),
            ml: 35,
            size: rnd(5, 12),
            color: pick(['#FF4444', '#FFD700', '#FF8C00'])
        });
    }

    // Fear effect: push ghosts away
    if (window.ghosts) {
        for (var i = 0; i < window.ghosts.length; i++) {
            var g = window.ghosts[i];
            var dist = Math.hypot(g.x - kk.x, g.y - kk.y);
            if (dist < 250) {
                var dx = g.x - kk.x;
                var dy = g.y - kk.y;
                var d = Math.hypot(dx, dy) || 1;
                g.vx += (dx / d) * 3;  // push away
                g.vy += (dy / d) * 3 - 2;
                g.hitFlash = 5;
            }
        }
    }

    if (window.sfxQuake) sfxQuake();
}

// ============================================
// DRAW KING KONG SPRITE
// ============================================
function drawKingKong() {
    if (!KK.ready || !KK.img) {
        drawKingKongFallback();
        return;
    }

    var kk = KK;
    var sx = kk.x - window.cam.x;
    var sy = kk.y - window.cam.y;

    if (sx < -300 || sx > window.W + 300) return;

    var anim = kk.anims[kk.state];
    var frameIdx = anim.frames[kk.currentFrame % anim.frames.length];
    var fr = kk.frames[frameIdx];

    if (!fr) {
        drawKingKongFallback();
        return;
    }

    var sc = kk.spriteScale * kk.transformScale;
    var drawW = fr.w * sc;
    var drawH = fr.h * sc;
    var drawX = -fr.ox * sc;
    var drawY = (window.PH / 2) - fr.oy * sc;

    window.X.save();
    window.X.translate(sx, sy);

    // Shadow
    window.X.save();
    window.X.globalAlpha = 0.2;
    window.X.beginPath();
    window.X.ellipse(0, drawH * 0.5 + 5, drawW * 0.4, 8, 0, 0, 6.28);
    window.X.fillStyle = '#000';
    window.X.fill();
    window.X.restore();

    // Flip jika facing kiri
    if (kk.facing === -1) {
        window.X.scale(-1, 1);
        drawX = -drawX - drawW;
    }

    // Glow aura saat attacking
    if (kk.state !== 'idle') {
        var ag = window.X.createRadialGradient(0, -drawH * 0.2, drawW * 0.2, 0, -drawH * 0.2, drawW * 0.8);
        ag.addColorStop(0, 'rgba(255,100,0,0.2)');
        ag.addColorStop(0.5, 'rgba(255,50,0,0.08)');
        ag.addColorStop(1, 'rgba(255,0,0,0)');
        window.X.beginPath();
        window.X.arc(0, -drawH * 0.2, drawW * 0.8, 0, 6.28);
        window.X.fillStyle = ag;
        window.X.fill();
    }

    // Draw sprite frame
    window.X.drawImage(
        kk.img,
        fr.x, fr.y, fr.w, fr.h,
        drawX, drawY, drawW, drawH
    );

    window.X.restore();

    // Timer bar di atas King Kong (sisa waktu transform)
    if (window.petState === 'kingkong' && window.petTransformTimer > 0) {
        var barW = 80;
        var barH = 6;
        var pct = window.petTransformTimer / window.PET_KINGKONG_DURATION;
        window.X.fillStyle = 'rgba(0,0,0,0.6)';
        window.X.fillRect(sx - barW/2, sy - drawH - 15, barW, barH);
        window.X.fillStyle = pct > 0.3 ? '#FF4444' : '#FFD700';
        window.X.fillRect(sx - barW/2, sy - drawH - 15, barW * pct, barH);
        window.X.strokeStyle = '#FFF';
        window.X.lineWidth = 1;
        window.X.strokeRect(sx - barW/2, sy - drawH - 15, barW, barH);
    }
}

window.drawKingKong = drawKingKong;

// ============================================
// FALLBACK DRAW (kalau sprite gagal load)
// ============================================
function drawKingKongFallback() {
    var kk = KK;
    var sx = kk.x - window.cam.x;
    var sy = kk.y - window.cam.y;
    var s = 50 * kk.transformScale;

    window.X.save();
    window.X.translate(sx, sy);

    // Shadow
    window.X.globalAlpha = 0.2;
    window.X.beginPath();
    window.X.ellipse(0, s * 0.9, s * 0.7, s * 0.15, 0, 0, 6.28);
    window.X.fillStyle = '#000';
    window.X.fill();
    window.X.globalAlpha = 1;

    // Body (dark brown)
    window.X.fillStyle = '#3D2914';
    window.X.fillRect(-s * 0.5, -s * 0.5, s, s * 0.8);

    // Head
    window.X.fillStyle = '#4A3728';
    window.X.beginPath();
    window.X.arc(0, -s * 0.7, s * 0.35, 0, 6.28);
    window.X.fill();

    // Eyes (red glow)
    window.X.fillStyle = '#FF0000';
    window.X.beginPath();
    window.X.arc(-s * 0.12, -s * 0.75, s * 0.08, 0, 6.28);
    window.X.fill();
    window.X.beginPath();
    window.X.arc(s * 0.12, -s * 0.75, s * 0.08, 0, 6.28);
    window.X.fill();

    // Arms
    window.X.fillStyle = '#3D2914';
    if (kk.state === 'punch_right') {
        window.X.fillRect(s * 0.3, -s * 0.4, s * 0.6, s * 0.25);
    } else if (kk.state === 'punch_left') {
        window.X.fillRect(-s * 0.9, -s * 0.4, s * 0.6, s * 0.25);
    } else if (kk.state === 'chest_beat') {
        window.X.fillRect(-s * 0.8, -s * 0.3, s * 0.4, s * 0.2);
        window.X.fillRect(s * 0.4, -s * 0.3, s * 0.4, s * 0.2);
    } else {
        window.X.fillRect(-s * 0.7, -s * 0.2, s * 0.25, s * 0.5);
        window.X.fillRect(s * 0.45, -s * 0.2, s * 0.25, s * 0.5);
    }

    window.X.restore();
}

// ============================================
// INIT KING KONG (panggil saat spawn pet)
// ============================================
function initKingKong() {
    KK.x = window.player ? window.player.x - 140 : 60;
    KK.y = window.player ? window.player.y : window.H - 200;
    KK.vx = 0;
    KK.vy = 0;
    KK.state = 'idle';
    KK.animTimer = 0;
    KK.currentFrame = 0;
    KK.stateTimer = 0;
    KK.cycleTimer = 0;
    KK.transformScale = 1;
    KK.facing = 1;
    console.log('[KingKong] Initialized at', KK.x, KK.y);
}

window.initKingKong = initKingKong;
