// ============================================
// KING KONG SPRITE MODULE v2
// Skala: 2x Sun Wukong | Gerakan: kanan-kiri brutal | Ekspresi: marah
// ============================================

var KK = {
    img: null,
    ready: false,
    frames: [],
    sourceH: 0,
    scale: 1.0,
    url: 'assets/images/Kingkong brutal.png',

    // State
    state: 'idle',        // idle, punch_right, punch_left, chest_beat, angry_walk
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

    // Brutal movement
    walkOffset: 0,        // offset gerakan kanan-kiri
    walkPhase: 0,         // fase sinus untuk gerakan
    isCharging: false,    // sedang nge-charge ke depan
    chargeDir: 0,         // arah charge
    chargePower: 0,       // kekuatan charge (0-1)

    // Attack cycle (20 detik = 1200 frames @ 60fps)
    cycleDuration: 1200,
    cycleTimer: 0,

    // Punch effects
    punchTimer: 0,
    lastPunchSide: 0,

    // Config
    followDist: 70,      // jarak dasar dari Sun Wukong
    followSpeed: 0.15,
    spriteScale: 1.0,
    debug: false,         // true = gambar kotak merah di bounds

    // Scale target: 0.7x Sun Wukong (kecil)
    SW_TARGET_RATIO: 1.0

    // Animation config (frames per state)
    anims: {
        idle:        { frames: [2],     fps: 3 },
        angry_walk:  { frames: [0,1],   fps: 6 },
        punch_right: { frames: [0],     fps: 10 },
        punch_left:  { frames: [1],     fps: 10 },
        chest_beat:  { frames: [2,3],   fps: 8 }
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
            try {
                var sw = img.naturalWidth || img.width || 0;
                var sh = img.naturalHeight || img.height || 0;
                if (sw === 0 || sh === 0) {
                    console.warn('[KingKong] Gambar kosong, pakai fallback');
                    resolve();
                    return;
                }
                var data = processKingKongSheet(img);
                if (!data || !data.frames || data.frames.length === 0) {
                    console.warn('[KingKong] Frame kosong, pakai fallback');
                    resolve();
                    return;
                }
                KK.img = img;
                KK.frames = data.frames;
                KK.sourceH = data.sourceH;
                KK.ready = true;
                KK.spriteScale = calcKKScale();
                console.log('[KingKong] Sprite loaded, frames:', data.frames.length, 'sourceH:', data.sourceH, 'scale:', KK.spriteScale);
            } catch (e) {
                console.warn('[KingKong] Error process sprite:', e);
            }
            resolve();
        };
        img.onerror = function() {
            console.warn('[KingKong] Gagal load sprite dari URL');
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
    var sw = img.naturalWidth || img.width || 0;
    var sh = img.naturalHeight || img.height || 0;

    if (sw === 0 || sh === 0) {
        console.warn('[KingKong] processKingKongSheet: ukuran gambar 0');
        return { frames: [], sourceH: 1 };
    }

    var tc = document.createElement('canvas');
    tc.width = sw;
    tc.height = sh;
    var tx = tc.getContext('2d');
    tx.drawImage(img, 0, 0);

    var imgData;
    try {
        imgData = tx.getImageData(0, 0, sw, sh);
    } catch (e) {
        console.warn('[KingKong] getImageData error:', e);
        return { frames: [], sourceH: 1 };
    }

    var pixels = imgData.data;

    // === Bagi rata 4 frame horizontal ===
    var frameW = Math.floor(sw / 4);
    if (frameW < 10) {
        console.warn('[KingKong] frameW terlalu kecil:', frameW);
        return { frames: [], sourceH: 1 };
    }

    var frames = [];
    var globalMaxH = 0;

    for (var f = 0; f < 4; f++) {
        var segStart = f * frameW;
        var segEnd = (f === 3) ? sw : (f + 1) * frameW;

        var minX = segEnd, maxX = segStart;
        var minY = sh, maxY = 0;
        var found = false;

        for (var px = segStart; px < segEnd && px < sw; px++) {
            for (var py = 0; py < sh; py++) {
                var idx = (py * sw + px) * 4;
                if (pixels[idx + 3] > 60) {
                    if (px < minX) minX = px;
                    if (px > maxX) maxX = px;
                    if (py < minY) minY = py;
                    if (py > maxY) maxY = py;
                    found = true;
                }
            }
        }

        if (!found) {
            minX = segStart;
            maxX = segEnd - 1;
            minY = 0;
            maxY = sh - 1;
        }

        minX = Math.max(segStart, minX - 1);
        maxX = Math.min(segEnd - 1, maxX + 1);
        minY = Math.max(0, minY - 1);
        maxY = Math.min(sh - 1, maxY + 1);

        var fw2 = maxX - minX + 1;
        var fh = maxY - minY + 1;
        if (fh > globalMaxH) globalMaxH = fh;

        var ox = fw2 / 2;
        var oy = fh;

        frames.push({
            x: minX, y: minY, w: fw2, h: fh,
            ox: ox, oy: oy,
            origX: segStart, origEndX: segEnd
        });
    }

    if (globalMaxH === 0) globalMaxH = 1;

    return { frames: frames, sourceH: globalMaxH };
}

// ============================================
// CALCULATE SCALE — 2x Sun Wukong
// ============================================
function calcKKScale() {
    if (!KK.sourceH || KK.sourceH <= 0) return 1.0;

    // Sun Wukong height reference
    var swHeight = (window.spriteData && window.spriteData.sourceH) ? window.spriteData.sourceH : 80;
    var swScale = (typeof SPRITE_SCALE !== 'undefined') ? SPRITE_SCALE : 1.0;
    var swPixelHeight = swHeight * swScale;

    // Target: ratio dari tinggi Sun Wukong
    var targetH = swPixelHeight * KK.SW_TARGET_RATIO;
    var rawScale = targetH / KK.sourceH;

    return Math.max(0.3, Math.min(2.5, rawScale));
}

// ============================================
// UPDATE KING KONG — BRUTAL MOVEMENT
// ============================================
function updateKingKong() {
    if (!window.player) return;
    if (!KK) return;

    try {
        var p = window.player;
        var kk = KK;

        // Update scale responsive
        if (typeof calcKKScale === 'function') {
            kk.spriteScale = calcKKScale();
        }

        // === POSISI DASAR: di belakang Sun Wukong ===
        var baseX = p.x - (kk.followDist * p.facing);
        var baseY = p.y;

    // === GERAKAN BRUTAL: kanan-kiri + marah ===
    kk.walkPhase += 0.08;

    // Charge power naik saat sedang menyerang
    var isAttacking = (kk.state === 'punch_right' || kk.state === 'punch_left' || kk.state === 'chest_beat');
    if (isAttacking) {
        kk.chargePower = Math.min(1, kk.chargePower + 0.03);
    } else {
        kk.chargePower = Math.max(0, kk.chargePower - 0.05);
    }

    // Walk offset: gerakan kanan-kiri brutal
    // Saat idle: gerakan kecil
    // Saat attack: gerakan besar + charge ke depan
    var walkAmp = 20 + (kk.chargePower * 60);  // amplitude gerakan
    var chargeOffset = kk.chargePower * 50 * p.facing;  // charge ke depan saat attack

    kk.walkOffset = Math.sin(kk.walkPhase) * walkAmp + chargeOffset;

    // Target position dengan offset brutal
    var targetX = baseX + kk.walkOffset;
    var targetY = baseY + Math.abs(Math.sin(kk.walkPhase * 2)) * 5;  // sedikit bounce

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
    kk.cycleTimer++;
    if (kk.cycleTimer >= kk.cycleDuration) kk.cycleTimer = 0;

    var phase = kk.cycleTimer;
    var oldState = kk.state;

    // Cycle: 0-300=angry_walk, 300-500=punch_right, 500-700=punch_left, 700-900=chest_beat, 900-1200=angry_walk
    if (phase < 300) {
        kk.state = 'angry_walk';
    } else if (phase < 500) {
        kk.state = 'punch_right';
        kk.lastPunchSide = 1;
    } else if (phase < 700) {
        kk.state = 'punch_left';
        kk.lastPunchSide = -1;
    } else if (phase < 900) {
        kk.state = 'chest_beat';
    } else {
        kk.state = 'angry_walk';
    }

    // State change reset
    if (kk.state !== oldState) {
        kk.animTimer = 0;
        kk.currentFrame = 0;
        kk.stateTimer = 0;
        // Reset charge saat ganti state
        if (kk.state === 'punch_right' || kk.state === 'punch_left') {
            kk.isCharging = true;
        }
    }

    // === ANIMATION ===
    var anim = kk.anims[kk.state];
    kk.stateTimer++;
    kk.animTimer += anim.fps / 60;

    if (kk.animTimer >= 1) {
        kk.animTimer -= 1;
        kk.currentFrame = (kk.currentFrame + 1) % anim.frames.length;
    }

    // === BRUTAL SMASH — saat punching ===
    if ((kk.state === 'punch_right' || kk.state === 'punch_left') && kk.stateTimer % 12 === 0) {
        doBrutalSmash();
    }

    // === CHEST BEAT EFFECT — menakuti ===
    if (kk.state === 'chest_beat' && kk.stateTimer % 15 === 0) {
        doChestBeatEffect();
    }

    // === ANGRY WALK — particles saat jalan marah ===
    if (kk.state === 'angry_walk' && kk.stateTimer % 8 === 0) {
        spawnAngryParticles();
    }

    // Update transform scale
    var targetScale = isAttacking ? 1.1 : 1.0;
    kk.transformScale += (targetScale - kk.transformScale) * 0.08;
    } catch (e) {
        console.warn('[KingKong] updateKingKong error:', e);
    }
}

window.updateKingKong = updateKingKong;

// ============================================
// BRUTAL SMASH EFFECT
// ============================================
function doBrutalSmash() {
    var kk = KK;
    var smashX = kk.x + (kk.lastPunchSide * 70);
    var smashY = kk.y - 30;
    var smashRadius = 160;

    // Visual explosion
    for (var e = 0; e < 10; e++) {
        var ea = (e / 10) * 6.28;
        var sp = rnd(4, 10);
        window.particles.push({
            x: smashX + Math.cos(ea) * 15,
            y: smashY + Math.sin(ea) * 15,
            vx: Math.cos(ea) * sp,
            vy: Math.sin(ea) * sp - rnd(2, 6),
            life: rnd(25, 45), ml: 45,
            size: rnd(6, 16),
            color: pick(['#FFD700', '#FF4444', '#FF8C00', '#FFF', '#8B0000'])
        });
    }

    // Shockwave
    window.particles.push({
        x: smashX, y: smashY,
        vx: 0, vy: 0,
        life: 25, ml: 25,
        size: 12,
        targetSize: smashRadius * 1.3,
        color: 'rgba(255,60,0,0.35)',
        isShockwave: true
    });

    // Screen shake
    if (window.triggerShake) triggerShake(10, 14);

    // Damage ghosts
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

    // Damage boss
    if (window.boss && window.bossState === 'fight') {
        var distToBoss = Math.hypot(window.boss.x - smashX, window.boss.y - smashY);
        if (distToBoss < smashRadius + window.boss.size) {
            window.boss.hp -= 4;
            window.boss.hitFlash = 12;
            hitCount++;
        }
    }

    if (window.sfxHit) sfxHit();
    if (window.sfxQuake) sfxQuake();

    if (hitCount > 0 && window.showFloatingText) {
        showFloatingText('💥 BRUTAL! x' + hitCount, smashX, smashY - 80, '#FFD700');
    }
}

// ============================================
// CHEST BEAT EFFECT (Menakuti)
// ============================================
function doChestBeatEffect() {
    var kk = KK;

    if (window.triggerShake) triggerShake(7, 12);

    // Roar particles
    for (var i = 0; i < 10; i++) {
        var a = rnd(0, 6.28);
        window.particles.push({
            x: kk.x + Math.cos(a) * 25,
            y: kk.y - 50 + Math.sin(a) * 15,
            vx: Math.cos(a) * rnd(2, 6),
            vy: Math.sin(a) * rnd(2, 6) - 4,
            life: rnd(20, 40), ml: 40,
            size: rnd(6, 14),
            color: pick(['#FF4444', '#FFD700', '#FF8C00', '#FF0000'])
        });
    }

    // Fear: push ghosts away
    if (window.ghosts) {
        for (var i = 0; i < window.ghosts.length; i++) {
            var g = window.ghosts[i];
            var dist = Math.hypot(g.x - kk.x, g.y - kk.y);
            if (dist < 280) {
                var dx = g.x - kk.x;
                var dy = g.y - kk.y;
                var d = Math.hypot(dx, dy) || 1;
                g.vx += (dx / d) * 4;
                g.vy += (dy / d) * 4 - 3;
                g.hitFlash = 5;
            }
        }
    }

    if (window.sfxQuake) sfxQuake();
}

// ============================================
// ANGRY WALK PARTICLES
// ============================================
function spawnAngryParticles() {
    var kk = KK;
    // Dust saat kaki menginjak
    window.particles.push({
        x: kk.x + rnd(-20, 20),
        y: kk.y + 10,
        vx: rnd(-1, 1),
        vy: rnd(-1, -3),
        life: rnd(15, 25), ml: 25,
        size: rnd(4, 10),
        color: 'rgba(139,69,19,0.5)'
    });

    // Angry aura spark
    if (Math.random() < 0.3) {
        window.particles.push({
            x: kk.x + rnd(-30, 30),
            y: kk.y - rnd(20, 60),
            vx: rnd(-0.5, 0.5),
            vy: rnd(-2, -4),
            life: rnd(10, 20), ml: 20,
            size: rnd(3, 7),
            color: pick(['#FF4444', '#FF8C00'])
        });
    }
}

// ============================================
// DRAW KING KONG SPRITE
// ============================================
function drawKingKong() {
    if (!KK) { drawKingKongFallback(); return; }
    if (!KK.ready || !KK.img) { drawKingKongFallback(); return; }

    try {
    var kk = KK;
    var sx = kk.x - (window.cam ? window.cam.x : 0);
    var sy = kk.y - (window.cam ? window.cam.y : 0);

    if (!window.W || sx < -300 || sx > window.W + 300) return;

    var anim = kk.anims[kk.state];
    if (!anim || !anim.frames) { drawKingKongFallback(); return; }

    var frameIdx = anim.frames[kk.currentFrame % anim.frames.length];
    var fr = kk.frames[frameIdx];

    if (!fr) { drawKingKongFallback(); return; }

    var sc = kk.spriteScale * kk.transformScale;
    var drawW = fr.w * sc;
    var drawH = fr.h * sc;
    var drawX = -fr.ox * sc;
    var drawY = (window.PH / 2) - fr.oy * sc;

    window.X.save();
    window.X.translate(sx, sy);

    // Shadow
    window.X.save();
    window.X.globalAlpha = 0.25;
    window.X.beginPath();
    window.X.ellipse(0, drawH * 0.5 + 3, drawW * 0.35, 6, 0, 0, 6.28);
    window.X.fillStyle = '#000';
    window.X.fill();
    window.X.restore();

    // Flip jika facing kiri
    if (kk.facing === -1) {
        window.X.scale(-1, 1);
        drawX = -drawX - drawW;
    }

    // === ANGRY AURA ===
    var isAngry = (kk.state !== 'idle');
    if (isAngry) {
        // Red glow aura
        var ag = window.X.createRadialGradient(0, -drawH * 0.25, drawW * 0.15, 0, -drawH * 0.25, drawW * 0.7);
        ag.addColorStop(0, 'rgba(255,80,0,0.18)');
        ag.addColorStop(0.5, 'rgba(255,30,0,0.08)');
        ag.addColorStop(1, 'rgba(255,0,0,0)');
        window.X.beginPath();
        window.X.arc(0, -drawH * 0.25, drawW * 0.7, 0, 6.28);
        window.X.fillStyle = ag;
        window.X.fill();

        // Pulse effect saat charge
        if (kk.chargePower > 0.3) {
            var pulse = Math.sin(window.frame * 0.2) * 0.1 + 0.15;
            window.X.globalAlpha = pulse * kk.chargePower;
            window.X.beginPath();
            window.X.arc(0, -drawH * 0.25, drawW * 0.9, 0, 6.28);
            window.X.fillStyle = 'rgba(255,0,0,0.2)';
            window.X.fill();
            window.X.globalAlpha = 1;
        }
    }

    // === DRAW SPRITE FRAME ===
    window.X.drawImage(
        kk.img,
        fr.x, fr.y, fr.w, fr.h,
        drawX, drawY, drawW, drawH
    );

    // === DEBUG BOUNDS (kotak merah) ===
    if (kk.debug) {
        window.X.strokeStyle = '#FF0000';
        window.X.lineWidth = 2;
        window.X.strokeRect(drawX, drawY, drawW, drawH);
        // Titik anchor
        window.X.fillStyle = '#00FF00';
        window.X.beginPath();
        window.X.arc(0, 0, 4, 0, 6.28);
        window.X.fill();
    }

    // === ANGRY OVERLAY (mata merah glow) ===
    if (isAngry) {
        window.X.globalCompositeOperation = 'screen';
        var glowAlpha = 0.15 + (kk.chargePower * 0.2);
        window.X.fillStyle = 'rgba(255,50,0,' + glowAlpha + ')';
        window.X.fillRect(drawX, drawY, drawW, drawH * 0.4);
        window.X.globalCompositeOperation = 'source-over';
    }

    window.X.restore();

    } catch (e) {
        console.warn('[KingKong] drawKingKong error:', e);
    }

    // === STATE LABEL DI ATAS KING KONG ===
    var labelText = '';
    var labelColor = '#FFF';
    if (kk.state === 'punch_right') { labelText = '👊 PUNCH!'; labelColor = '#FF4444'; }
    else if (kk.state === 'punch_left') { labelText = '👊 PUNCH!'; labelColor = '#FF4444'; }
    else if (kk.state === 'chest_beat') { labelText = '💢 ROAR!'; labelColor = '#FFD700'; }
    else if (kk.state === 'angry_walk') { labelText = '👹 ANGRY'; labelColor = '#FF8C00'; }

    if (labelText && window.frame % 30 < 20) {
        window.X.fillStyle = labelColor;
        window.X.font = 'bold 12px Fredoka One';
        window.X.textAlign = 'center';
        window.X.fillText(labelText, sx, sy - drawH - 10);
    }

    // === TIMER BAR ===
    if (window.petState === 'kingkong' && window.petTransformTimer > 0) {
        var barW = 70;
        var barH = 5;
        var pct = window.petTransformTimer / window.PET_KINGKONG_DURATION;
        window.X.fillStyle = 'rgba(0,0,0,0.6)';
        window.X.fillRect(sx - barW/2, sy - drawH - 22, barW, barH);
        window.X.fillStyle = pct > 0.3 ? '#FF4444' : '#FFD700';
        window.X.fillRect(sx - barW/2, sy - drawH - 22, barW * pct, barH);
        window.X.strokeStyle = '#FFF';
        window.X.lineWidth = 1;
        window.X.strokeRect(sx - barW/2, sy - drawH - 22, barW, barH);
    }
}

window.drawKingKong = drawKingKong;

// ============================================
// FALLBACK DRAW
// ============================================
function drawKingKongFallback() {
    var kk = KK;
    var sx = kk.x - window.cam.x;
    var sy = kk.y - window.cam.y;
    var s = 40 * kk.transformScale;

    window.X.save();
    window.X.translate(sx, sy);

    window.X.globalAlpha = 0.25;
    window.X.beginPath();
    window.X.ellipse(0, s * 0.85, s * 0.6, s * 0.12, 0, 0, 6.28);
    window.X.fillStyle = '#000';
    window.X.fill();
    window.X.globalAlpha = 1;

    // Body
    window.X.fillStyle = '#3D2914';
    window.X.fillRect(-s * 0.45, -s * 0.4, s * 0.9, s * 0.7);

    // Head
    window.X.fillStyle = '#4A3728';
    window.X.beginPath();
    window.X.arc(0, -s * 0.65, s * 0.3, 0, 6.28);
    window.X.fill();

    // Red angry eyes
    window.X.fillStyle = '#FF0000';
    window.X.shadowColor = '#FF0000';
    window.X.shadowBlur = 8;
    window.X.beginPath();
    window.X.arc(-s * 0.1, -s * 0.7, s * 0.07, 0, 6.28);
    window.X.fill();
    window.X.beginPath();
    window.X.arc(s * 0.1, -s * 0.7, s * 0.07, 0, 6.28);
    window.X.fill();
    window.X.shadowBlur = 0;

    // Arms
    window.X.fillStyle = '#3D2914';
    if (kk.state === 'punch_right') {
        window.X.fillRect(s * 0.25, -s * 0.35, s * 0.5, s * 0.2);
    } else if (kk.state === 'punch_left') {
        window.X.fillRect(-s * 0.75, -s * 0.35, s * 0.5, s * 0.2);
    } else {
        window.X.fillRect(-s * 0.6, -s * 0.15, s * 0.2, s * 0.4);
        window.X.fillRect(s * 0.4, -s * 0.15, s * 0.2, s * 0.4);
    }

    window.X.restore();
}

// ============================================
// INIT KING KONG
// ============================================
function initKingKong() {
    if (!KK) {
        console.warn('[KingKong] KK object tidak ada');
        return;
    }
    var px = (window.player && window.player.x) ? window.player.x : 200;
    var py = (window.player && window.player.y) ? window.player.y : (window.H ? window.H - 200 : 400);
    KK.x = px - KK.followDist;
    KK.y = py;
    KK.vx = 0;
    KK.vy = 0;
    KK.state = 'idle';
    KK.animTimer = 0;
    KK.currentFrame = 0;
    KK.stateTimer = 0;
    KK.cycleTimer = 0;
    KK.transformScale = 1.0;
    KK.facing = 1;
    KK.walkOffset = 0;
    KK.walkPhase = 0;
    KK.chargePower = 0;
    KK.isCharging = false;
    console.log('[KingKong] Initialized at', KK.x, KK.y);
}

window.initKingKong = initKingKong;
