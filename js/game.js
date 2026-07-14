// ============================================
// MONKEY LEGEND - GAME ENGINE (FINAL FIX)
// ============================================

// === CANVAS ===
var C = document.getElementById('c'),
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

// ============================================
// SPRITE SHEET LOADER & PROCESSOR
// ============================================
var spriteData = null;
var spriteReady = false;
var SPRITE_SCALE = 1.0;
var SPRITE_URL = 'assets/images/Lari%20hadap%20depan.png';

function calcSpriteScale() {
    if (!spriteData) return 1.0;
    var frameH = spriteData.sourceH;
    var targetH = W < 600 ? 70 : (W < 1024 ? 80 : 95);
    return Math.max(0.5, Math.min(2.5, targetH / frameH));
}

function processSpriteSheet(img) {
    var sw = img.naturalWidth || img.width;
    var sh = img.naturalHeight || img.height;
    var tc = document.createElement('canvas');
    tc.width = sw;
    tc.height = sh;
    var tx = tc.getContext('2d');
    tx.drawImage(img, 0, 0);
    var imgData = tx.getImageData(0, 0, sw, sh);
    var pixels = imgData.data;

    var colEdges = [];
    var prevHadPixel = false;
    for (var cx = 0; cx < sw; cx++) {
        var hasPixel = false;
        for (var cy = 0; cy < sh; cy++) {
            var idx = (cy * sw + cx) * 4;
            if (pixels[idx + 3] > 20) { hasPixel = true; break; }
        }
        if (hasPixel && !prevHadPixel) colEdges.push(cx);
        prevHadPixel = hasPixel;
    }

    if (colEdges.length < 4) {
        var fw = sw / 4;
        colEdges = [0, fw, fw * 2, fw * 3];
    }

    var frames = [];
    for (var f = 0; f < 4; f++) {
        var startX = Math.floor(colEdges[f]);
        var endX = (f < 3) ? Math.floor(colEdges[f + 1]) : sw;
        if (endX - startX < 10) endX = Math.min(sw, startX + Math.floor(sw / 4));

        var minX = endX, maxX = startX, minY = sh, maxY = 0;
        var found = false;
        for (var px = startX; px < endX; px++) {
            for (var py = 0; py < sh; py++) {
                var idx = (py * sw + px) * 4;
                if (pixels[idx + 3] > 20) {
                    if (px < minX) minX = px;
                    if (px > maxX) maxX = px;
                    if (py < minY) minY = py;
                    if (py > maxY) maxY = py;
                    found = true;
                }
            }
        }

        if (!found) { minX = startX; maxX = endX - 1; minY = 0; maxY = sh - 1; }

        var fw2 = maxX - minX + 1;
        var fh = maxY - minY + 1;
        var ox = fw2 / 2;
        var oy = fh;
        frames.push({ x: minX, y: minY, w: fw2, h: fh, ox: ox, oy: oy });
    }

    var maxH = 0;
    for (var i = 0; i < frames.length; i++) {
        if (frames[i].h > maxH) maxH = frames[i].h;
    }

    return { img: img, frames: frames, sourceH: maxH };
}

// ============================================
// LOAD SPRITE SHEET + CLOUD
// ============================================
function loadSpriteSheet() {
    return new Promise(function(resolve, reject) {
        var img = new Image();
        img.crossOrigin = 'anonymous';
        var loadBar = document.getElementById('loadingBar');
        var loadFill = document.getElementById('loadingFill');
        var loadText = document.getElementById('loadingText');
        loadBar.classList.add('show');
        loadText.classList.add('show');
        loadFill.style.width = '20%';

        var loadedCount = 0;
        var totalToLoad = 2;

        function checkComplete() {
            loadedCount++;
            if (loadedCount >= totalToLoad) {
                loadFill.style.width = '100%';
                loadText.textContent = 'Siap!';
                setTimeout(function() {
                    loadBar.classList.remove('show');
                    loadText.classList.remove('show');
                }, 400);
                resolve();
            }
        }

        img.onload = function() {
            loadFill.style.width = '40%';
            loadText.textContent = 'Memproses sprite...';
            setTimeout(function() {
                spriteData = processSpriteSheet(img);
                SPRITE_SCALE = calcSpriteScale();
                spriteReady = true;
                loadFill.style.width = '60%';
                checkComplete();
            }, 100);
        };
        img.onerror = function() {
            loadText.textContent = 'Gagal memuat karakter';
            checkComplete();
        };
        img.src = SPRITE_URL;

        if (typeof loadCloudImage === 'function') {
            loadCloudImage().then(function() {
                loadFill.style.width = '80%';
                loadText.textContent = 'Memuat awan...';
                checkComplete();
            }).catch(function() {
                checkComplete();
            });
        } else {
            checkComplete();
        }
    });
}

// ============================================
// AUDIO
// ============================================
var ac;
function initAudio() { if (!ac) try { ac = new(window.AudioContext || window.webkitAudioContext)(); window.ac = ac; } catch (e) {} }
window.ac = ac;
window.initAudio = initAudio;

window.sfxJump  = function() { tone(300, 0.15, 'sine', 0.1, 600); };
window.sfxAtk   = function() { tone(500, 0.08, 'sawtooth', 0.08, 250); };
window.sfxKame  = function() { tone(150, 0.8, 'sawtooth', 0.13, 800); setTimeout(function() { tone(400, 0.4, 'sine', 0.08, 100); }, 200); };
window.sfxHit   = function() { tone(180, 0.12, 'square', 0.09, 60); };
window.sfxQuake = function() { tone(35, 1.5, 'sawtooth', 0.15, 15); };
window.sfxCoin  = function() { tone(800, 0.1, 'sine', 0.07); setTimeout(function() { tone(1200, 0.15, 'sine', 0.07); }, 80); };
window.sfxCloud = function() { tone(600, 0.3, 'sine', 0.09, 900); };
window.sfxGhost = function() { tone(80, 0.5, 'sine', 0.05, 40); };
window.sfxDie   = function() { tone(400, 0.6, 'sawtooth', 0.1, 50); };

// === UTILITAS ===
function rnd(a, b) { return Math.random() * (b - a) + a; }
function rndI(a, b) { return Math.floor(rnd(a, b + 1)); }
function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

// === STATE ===
var state = 'menu',
    score = 0,
    distance = 0,
    frame = 0;
var player, platforms, ghosts, particles, projectiles, kameBlasts;
var keys = {},
    shake = { x: 0, y: 0, i: 0, t: 0 },
    quakeCD = 0;
var cam = { x: 0, y: 0 },
    genX = 0,
    ghostTimer = 0;
var spriteAnimTimer = 0;
var SPRITE_FPS = 7;
var currentSpriteFrame = 0;

// ============================================
// FIX: ANIMATION ID UNTUK CANCEL LOOP
// ============================================
var animationId = null;

window.state      = state;
window.score      = score;
window.distance   = distance;
window.frame      = frame;
window.player     = player;
window.platforms  = platforms;
window.ghosts     = ghosts;
window.particles  = particles;
window.projectiles= projectiles;
window.kameBlasts = kameBlasts;
window.keys       = keys;
window.shake      = shake;
window.quakeCD    = quakeCD;
window.cam        = cam;
window.genX       = genX;
window.ghostTimer = ghostTimer;
window.spriteAnimTimer    = spriteAnimTimer;
window.currentSpriteFrame = currentSpriteFrame;
window.animationId        = animationId;

// === KONSTANTA ===
var GRAV = 0.52, JUMP = -11.5, SPEED = 4.8, MAX_FALL = 14;
var PW = 30, PH = 38, PLAT_H = 16;

window.GRAV = GRAV; window.JUMP = JUMP; window.SPEED = SPEED;
window.MAX_FALL = MAX_FALL; window.PW = PW; window.PH = PH; window.PLAT_H = PLAT_H;

// === INPUT MOUSE ===
var mouseState = { leftClick: false };
window.mouseState = mouseState;
addEventListener('mousedown', function(e) { if (e.button === 0) mouseState.leftClick = true; });
addEventListener('mouseup',   function(e) { if (e.button === 0) mouseState.leftClick = false; });

// ============================================
// KEYBOARD - KONTROL FINAL (D = KAMEHAMEHA)
// ============================================
addEventListener('keydown', function(e) {
    var key = e.key;

    if (key === 'a' || key === 'A') { e.preventDefault(); keys['a'] = true; }
    else if (key === 's' || key === 'S') { e.preventDefault(); keys['s'] = true; keys[' '] = true; }
    else if (key === 'd' || key === 'D') { e.preventDefault(); keys['d'] = true; keys['k'] = true; }
    else if (key === 'ArrowRight') { e.preventDefault(); keys['arrowright'] = true; }
    else if (key === 'ArrowLeft')  { e.preventDefault(); keys['arrowleft']  = true; }
    else if (key === 'ArrowUp')    { e.preventDefault(); keys['arrowup']    = true; }
    else if (key === 'ArrowDown')  { e.preventDefault(); keys['arrowdown']  = true; }
    else if (key === ' ')          { e.preventDefault(); keys[' '] = true; }

    if (key === 'Enter') {
        e.preventDefault();
        if (state === 'menu') { if (typeof initAudio === 'function') initAudio(); startGame(); }
        else if (state === 'over') { if (typeof initAudio === 'function') initAudio(); restartGame(); }
    }
});

addEventListener('keyup', function(e) {
    var key = e.key;
    if (key === 'a' || key === 'A')          { keys['a'] = false; }
    else if (key === 's' || key === 'S')     { keys['s'] = false; keys[' '] = false; }
    else if (key === 'd' || key === 'D')     { keys['d'] = false; keys['k'] = false; }
    else if (key === 'ArrowRight')           { keys['arrowright'] = false; }
    else if (key === 'ArrowLeft')            { keys['arrowleft']  = false; }
    else if (key === 'ArrowUp')              { keys['arrowup']    = false; }
    else if (key === 'ArrowDown')            { keys['arrowdown']  = false; }
    else if (key === ' ')                    { keys[' '] = false; }
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

    function getMaxR() { var bw = jbase.offsetWidth; var tw = jthumb.offsetWidth; return (bw - tw) / 2; }

    jz.addEventListener('touchstart', function(e) {
        e.preventDefault(); e.stopPropagation();
        if (joystickActive) return;
        var t = e.changedTouches[0];
        joystickActive = true; joystickId = t.identifier;
        var rect = jbase.getBoundingClientRect();
        joystickCX = rect.left + rect.width / 2;
        joystickCY = rect.top + rect.height / 2;
        updateJoystick(t.clientX, t.clientY, getMaxR(), jthumb);
    }, { passive: false });

    jz.addEventListener('touchmove', function(e) {
        e.preventDefault(); e.stopPropagation();
        for (var i = 0; i < e.changedTouches.length; i++) {
            var t = e.changedTouches[i];
            if (t.identifier === joystickId) updateJoystick(t.clientX, t.clientY, getMaxR(), jthumb);
        }
    }, { passive: false });

    function endJoystick(e) {
        for (var i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === joystickId) {
                joystickActive = false; joystickId = null;
                jthumb.style.left = '50%'; jthumb.style.top = '50%';
                touchState.moveX = 0; touchState.moveY = 0;
            }
        }
    }
    jz.addEventListener('touchend', endJoystick, { passive: false });
    jz.addEventListener('touchcancel', endJoystick, { passive: false });

    var btnIds = ['btnJump', 'btnAtk', 'btnKame', 'btnCloud', 'btnDown'];
    for (var b = 0; b < btnIds.length; b++) {
        (function(idx) {
            var el = document.getElementById(btnIds[idx]);
            var key = btnKeys[idx];
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
            el.addEventListener('mousedown',  function() { touchState[key] = true;  el.classList.add('pressed'); });
            el.addEventListener('mouseup',    function() { touchState[key] = false; el.classList.remove('pressed'); });
            el.addEventListener('mouseleave', function() { touchState[key] = false; el.classList.remove('pressed'); });
        })(b);
    }
}

function updateJoystick(clientX, clientY, maxR, jthumb) {
    var dx = clientX - joystickCX, dy = clientY - joystickCY;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > maxR) { dx = dx / dist * maxR; dy = dy / dist * maxR; }
    jthumb.style.left = (50 + (dx / maxR) * 50) + '%';
    jthumb.style.top  = (50 + (dy / maxR) * 50) + '%';
    touchState.moveX = dx / maxR;
    touchState.moveY = dy / maxR;
    if (Math.abs(touchState.moveX) < 0.1) touchState.moveX = 0;
    if (Math.abs(touchState.moveY) < 0.1) touchState.moveY = 0;
}

document.addEventListener('touchmove', function(e) { if (state === 'play') e.preventDefault(); }, { passive: false });

// ============================================
// TRIGGER GAME OVER
// ============================================
function triggerGameOver() {
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
    if (goSt) goSt.innerHTML = 'Skor: <span>' + score + '</span><br>Jarak: <span>' + distance + 'm</span>';

    var gameover = document.getElementById('gameover');
    if (gameover) gameover.classList.add('show');

    var touchControls = document.getElementById('touchControls');
    if (touchControls) touchControls.classList.remove('show');

    // Reset semua input
    for (var k in keys) keys[k] = false;
    touchState.jump = false; touchState.atk = false;
    touchState.kame = false; touchState.cloud = false;
    touchState.down = false; touchState.moveX = 0; touchState.moveY = 0;
    mouseState.leftClick = false;

    console.log('💀 Game Over - Skor:', score, 'Jarak:', distance);
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

    if (typeof initAudio === 'function') { 
        try { initAudio(); } catch(e) { console.warn('Audio init error:', e); } 
    }

    try {
        initGame();
    } catch (err) {
        console.error('❌ FATAL ERROR di initGame():', err);
        alert('Gagal memulai game: ' + err.message + '\nCek Console (F12) untuk detail.');
        return;
    }

    state = 'play';
    window.state = state;
    document.getElementById('overlay').classList.add('hidden');
    if (isTouchDevice) document.getElementById('touchControls').classList.add('show');
    
    // Mulai loop baru
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

    if (typeof initAudio === 'function') { 
        try { initAudio(); } catch(e) { console.warn('Audio init error:', e); } 
    }

    try {
        initGame();
    } catch (err) {
        console.error('❌ FATAL ERROR di initGame():', err);
        alert('Gagal restart: ' + err.message + '\nCek Console (F12) untuk detail.');
        return;
    }

    state = 'play';
    window.state = state;
    
    var gameoverEl = document.getElementById('gameover');
    if (gameoverEl) gameoverEl.classList.remove('show');
    
    if (isTouchDevice) {
        var touchControls = document.getElementById('touchControls');
        if (touchControls) touchControls.classList.add('show');
    }
    
    console.log('✅ Restart Berhasil, State:', state);
    
    // Mulai loop baru
    loop();
}

document.getElementById('startBtn').addEventListener('click', function(e) { 
    if (typeof initAudio === 'function') initAudio(); 
    startGame(); 
});
document.getElementById('startBtn').addEventListener('touchend', function(e) { 
    e.preventDefault(); 
    if (typeof initAudio === 'function') initAudio(); 
    startGame(); 
});
document.getElementById('restartBtn').addEventListener('click', function(e) { 
    if (typeof initAudio === 'function') initAudio(); 
    restartGame(); 
});
document.getElementById('restartBtn').addEventListener('touchend', function(e) { 
    e.preventDefault(); 
    if (typeof initAudio === 'function') initAudio(); 
    restartGame(); 
});

// === PLATFORM ===
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
        var nc = rndI(1, Math.floor(w / 38));
        for (var c = 0; c < nc; c++) p.coins.push({ x: p.x + 22 + c * 34, y: p.y - 28, collected: false, bob: rnd(0, 6.28) });
        platforms.push(p);
        px += w;
    }
    genX = px;
}

// === HANTU ===
function spawnGhost() {
    var side = Math.random() < 0.5 ? -1 : 1;
    var gx = cam.x + (side < 0 ? -70 : W + 70), gy = rnd(H * 0.15, H * 0.55);
    var spd = rnd(1.0, 2.2) + distance * 0.0002;
    var hp = 2 + Math.floor(distance / 400);
    ghosts.push({ x: gx, y: gy, vx: 0, vy: 0, size: rnd(26, 40), speed: Math.min(spd, 5), hp: hp, maxHp: hp, phase: rnd(0, 6.28), hitFlash: 0, type: rndI(0, 2) });
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
    }
}

function drawGhost(g) {
    X.save();
    var sx = g.x - cam.x, sy = g.y - cam.y;
    if (sx < -80 || sx > W + 80) { X.restore(); return; }
    X.translate(sx, sy);
    var s = g.size, p = Math.sin(g.phase) * 0.07 + 1;
    var faceR = g.x < player.x ? 1 : -1;
    X.scale(faceR * p, p);
    var ag = X.createRadialGradient(0, 0, s * 0.2, 0, 0, s * 2.2);
    ag.addColorStop(0, 'rgba(100,0,150,0.18)'); ag.addColorStop(1, 'rgba(0,0,0,0)');
    X.beginPath(); X.arc(0, 0, s * 2.2, 0, 6.28); X.fillStyle = ag; X.fill();
    if (g.type === 0) {
        X.beginPath();
        X.moveTo(-s, 2); X.quadraticCurveTo(-s, -s * 1.1, 0, -s * 1.25); X.quadraticCurveTo(s, -s * 1.1, s, 2);
        for (var i = 0; i < 5; i++) { var bx = s - i * (s * 2 / 5); X.quadraticCurveTo(bx - s * 0.1, s * 0.5 + (i % 2 ? -7 : 7), bx - s * 0.2, 2); }
        X.closePath();
        var bg = X.createLinearGradient(0, -s, 0, s * 0.5);
        bg.addColorStop(0, 'rgba(35,0,55,0.7)'); bg.addColorStop(1, 'rgba(15,0,35,0.35)');
        X.fillStyle = bg; X.fill();
        X.beginPath(); X.ellipse(-s * 0.28, -s * 0.4, s * 0.2, s * 0.28, 0, 0, 6.28); X.fillStyle = '#FFF'; X.fill();
        X.beginPath(); X.ellipse(s * 0.28, -s * 0.4, s * 0.2, s * 0.28, 0, 0, 6.28); X.fill();
        X.beginPath(); X.arc(-s * 0.24, -s * 0.36, s * 0.09, 0, 6.28); X.fillStyle = '#000'; X.fill();
        X.beginPath(); X.arc(s * 0.24, -s * 0.36, s * 0.09, 0, 6.28); X.fill();
    } else if (g.type === 1) {
        X.beginPath();
        X.moveTo(-s * 0.75, s * 0.55); X.quadraticCurveTo(-s * 0.85, -s * 0.45, 0, -s * 1.05); X.quadraticCurveTo(s * 0.85, -s * 0.45, s * 0.75, s * 0.55);
        for (var i = 0; i < 4; i++) { var bx = s * 0.75 - i * (s * 1.5 / 4); X.quadraticCurveTo(bx - s * 0.08, s * 0.85 + (i % 2 ? -5 : 5), bx - s * 0.15, s * 0.55); }
        X.closePath();
        var sg2 = X.createRadialGradient(0, -s * 0.3, s * 0.1, 0, 0, s * 1.1);
        sg2.addColorStop(0, 'rgba(180,80,255,0.55)'); sg2.addColorStop(0.5, 'rgba(120,0,200,0.3)'); sg2.addColorStop(1, 'rgba(60,0,100,0.08)');
        X.fillStyle = sg2; X.fill();
        X.beginPath(); X.arc(0, -s * 0.3, s * 0.28, 0, 6.28); X.fillStyle = '#E0B0FF'; X.fill();
        X.beginPath(); X.arc(s * 0.04, -s * 0.26, s * 0.14, 0, 6.28); X.fillStyle = '#4A0080'; X.fill();
        X.beginPath(); X.arc(s * 0.07, -s * 0.28, s * 0.05, 0, 6.28); X.fillStyle = '#FFF'; X.fill();
    } else {
        X.beginPath(); X.arc(0, -s * 0.3, s * 0.75, 0, 6.28);
        var skg = X.createRadialGradient(-s * 0.15, -s * 0.45, s * 0.08, 0, -s * 0.3, s * 0.75);
        skg.addColorStop(0, '#E8E0D0'); skg.addColorStop(0.7, '#B0A090'); skg.addColorStop(1, '#706050');
        X.fillStyle = skg; X.fill();
        X.beginPath(); X.ellipse(0, s * 0.22, s * 0.45, s * 0.25, 0, 0, Math.PI); X.fillStyle = '#A09080'; X.fill();
        X.beginPath(); X.ellipse(-s * 0.22, -s * 0.35, s * 0.18, s * 0.22, 0, 0, 6.28); X.fillStyle = '#000'; X.fill();
        X.beginPath(); X.ellipse(s * 0.22, -s * 0.35, s * 0.18, s * 0.22, 0, 0, 6.28); X.fill();
        X.beginPath(); X.arc(-s * 0.22, -s * 0.35, s * 0.055, 0, 6.28); X.fillStyle = '#FF0000'; X.fill();
        X.beginPath(); X.arc(s * 0.22, -s * 0.35, s * 0.055, 0, 6.28); X.fill();
        X.beginPath(); X.moveTo(-s * 0.04, -s * 0.1); X.lineTo(s * 0.04, -s * 0.1); X.lineTo(0, -s * 0.18); X.closePath(); X.fillStyle = '#000'; X.fill();
        for (var i = -2; i <= 2; i++) { X.fillStyle = '#CCBB99'; X.fillRect(i * s * 0.11 - 2, s * 0.08, 4, s * 0.1); X.fillRect(i * s * 0.11 - 1.5, s * 0.15, 3, s * 0.08); }
    }
    if (g.hitFlash > 0) { X.globalAlpha = g.hitFlash / 8 * 0.5; X.beginPath(); X.arc(0, 0, s * 1.1, 0, 6.28); X.fillStyle = '#FFF'; X.fill(); X.globalAlpha = 1; }
    if (g.hp < g.maxHp) { X.scale(faceR, 1); var bw = s * 1.4; X.fillStyle = 'rgba(0,0,0,0.5)'; X.fillRect(-bw / 2, -s * 1.5, bw, 4); X.fillStyle = '#B040FF'; X.fillRect(-bw / 2, -s * 1.5, bw * (g.hp / g.maxHp), 4); }
    X.restore();
}

// === KAMEHAMEHA ===
function fireKame() {
    if (player.energy < 35 || player.kameCharge < 10) return;
    player.energy -= 35; player.kameCharge = 0;
    var dir = player.facing;
    kameBlasts.push({ x: player.x + dir * PW * 0.6, y: player.y - PH * 0.1, vx: dir * 11, size: 18, maxLife: 75, life: 75, damage: 3 });
    sfxKame(); triggerShake(6, 12);
    spawnP(player.x + dir * 22, player.y - PH * 0.1, 15, '#00E5FF', 1.5, 1.2);
}
window.fireKame = fireKame;

function updateKame(k) {
    k.x += k.vx; k.life--; k.size = Math.min(32, k.size + 0.25);
    for (var i = 0; i < ghosts.length; i++) {
        var g = ghosts[i];
        if (Math.hypot(k.x - g.x, k.y - g.y) < k.size + g.size) { g.hp -= k.damage; g.hitFlash = 8; spawnP(g.x, g.y, 5, '#00E5FF', 1); sfxHit(); }
    }
}

function drawKame(k) {
    var sx = k.x - cam.x, sy = k.y - cam.y, a = k.life / k.maxLife;
    var lg = X.createRadialGradient(sx, sy, 0, sx, sy, k.size * 2.2);
    lg.addColorStop(0, 'rgba(220,255,255,' + a * 0.9 + ')'); lg.addColorStop(0.3, 'rgba(0,229,255,' + a * 0.55 + ')');
    lg.addColorStop(0.7, 'rgba(0,100,200,' + a * 0.25 + ')'); lg.addColorStop(1, 'rgba(0,50,150,0)');
    X.beginPath(); X.arc(sx, sy, k.size * 2.2, 0, 6.28); X.fillStyle = lg; X.fill();
    X.beginPath(); X.arc(sx, sy, k.size * 0.55, 0, 6.28); X.fillStyle = 'rgba(255,255,255,' + a * 0.9 + ')'; X.fill();
    X.beginPath(); X.moveTo(sx, sy - k.size * 0.7); X.lineTo(sx - k.vx * 3, sy - k.size * 0.4); X.lineTo(sx - k.vx * 3, sy + k.size * 0.4); X.lineTo(sx, sy + k.size * 0.7); X.closePath();
    X.fillStyle = 'rgba(0,180,255,' + a * 0.25 + ')'; X.fill();
}

// === PROYEKTIL ===
function fireStaff() {
    if (player.atkCD > 0) return;
    player.atkCD = 14;
    var dir = player.facing;
    projectiles.push({ x: player.x + dir * PW * 0.8, y: player.y - PH * 0.2, vx: dir * 9, life: 38, size: 5 });
    sfxAtk(); spawnP(player.x + dir * PW, player.y - PH * 0.2, 3, '#FFD700', 0.7);
}
window.fireStaff = fireStaff;

function drawProjectile(p) {
    var sx = p.x - cam.x, sy = p.y - cam.y;
    X.save(); X.translate(sx, sy);
    var g = X.createRadialGradient(0, 0, 0, 0, 0, p.size * 2.5);
    g.addColorStop(0, 'rgba(255,215,0,0.8)'); g.addColorStop(0.5, 'rgba(255,140,0,0.3)'); g.addColorStop(1, 'rgba(255,100,0,0)');
    X.beginPath(); X.arc(0, 0, p.size * 2.5, 0, 6.28); X.fillStyle = g; X.fill();
    drawStar(X, 0, 0, 5, p.size, p.size * 0.4, '#FFD700');
    X.restore();
}

// === AWAN ===
function activateCloud() {
    if (player.energy < 18 || player.onCloud) return;
    player.energy -= 18; player.onCloud = true; player.cloudTimer = 220; player.vy = 0;
    sfxCloud(); spawnP(player.x, player.y + PH / 2, 10, '#FFF8DC', 0.9, 0.7);
    if (typeof spawnCloudParticles === 'function') spawnCloudParticles(player);
}
window.activateCloud = activateCloud;

// === PARTIKEL ===
function spawnP(x, y, n, col, sm, szm) {
    sm = sm || 1; szm = szm || 1;
    for (var i = 0; i < n; i++) {
        var a = rnd(0, 6.28), sp = rnd(1, 5) * sm;
        particles.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - rnd(0, 2), life: rnd(15, 38), ml: 38, size: rnd(2, 6) * szm, color: col });
    }
}

// === GEMPA ===
function triggerShake(i, t) { shake.i = Math.max(shake.i, i); shake.t = Math.max(shake.t, t); }
window.triggerShake = triggerShake;

function triggerQuake() {
    triggerShake(20, 100); sfxQuake();
    document.getElementById('qf').classList.add('on');
    setTimeout(function() { document.getElementById('qf').classList.remove('on'); }, 600);
    for (var i = 0; i < platforms.length; i++) {
        var p = platforms[i];
        if (p.x + p.w > cam.x - 50 && p.x < cam.x + W + 50) {
            for (var j = 0; j < 4; j++) particles.push({ x: p.x + rnd(0, p.w), y: p.y, vx: rnd(-3, 3), vy: rnd(-4, -1), life: rnd(20, 45), ml: 45, size: rnd(3, 7), color: pick(['#8B7355', '#A0926B', '#6B5B3A']) });
        }
    }
    for (var i = 0; i < ghosts.length; i++) { ghosts[i].hp -= 1; ghosts[i].hitFlash = 5; }
    if (player.onGround) player.vy = -4;
}

// === GET INPUT ===
function getInput() {
    var left  = keys['arrowleft']  || (touchState.moveX < -0.3);
    var right = keys['arrowright'] || (touchState.moveX >  0.3);
    var up    = keys['arrowup']    || keys[' '] || touchState.jump;
    var down  = keys['arrowdown']  || touchState.down;
    var atk   = keys['a']  || touchState.atk;
    var cloud = keys['s']  || touchState.cloud;
    var kame  = keys['d']  || keys['k'] || touchState.kame;
    return { left: left, right: right, up: up, down: down, atk: atk, cloud: cloud, kame: kame };
}

// === PEMAIN ===
function createPlayer() {
    return { x: 200, y: H - 200, vx: 0, vy: 0, hp: 100, maxHp: 100, energy: 100, maxEnergy: 100,
        facing: 1, onGround: false, onCloud: false, cloudTimer: 0, inv: 0, atkCD: 0, kameCharge: 0,
        jumps: 2, dropThrough: 0, _jumpHeld: false, _cloudHeld: false, _atkHeld: false, _kameHeld: false };
}

function updatePlayer() {
    var p = player, inp = getInput();

    if (inp.left)       { p.vx = -SPEED; p.facing = -1; }
    else if (inp.right) { p.vx =  SPEED; p.facing =  1; }
    else                { p.vx *= 0.78; }

    if (inp.up && !p._jumpHeld) {
        if (p.onCloud) { p.onCloud = false; p.cloudTimer = 0; p.vy = JUMP * 0.8; p.jumps = 1; }
        else if (p.jumps > 0) { p.vy = JUMP; p.jumps--; p.onGround = false; sfxJump(); spawnP(p.x, p.y + PH / 2, 4, '#FFD700', 0.5, 0.5); }
        p._jumpHeld = true;
    }
    if (!inp.up) p._jumpHeld = false;

    if (inp.down) p.dropThrough = 8;

    if (inp.cloud && !p._cloudHeld) { activateCloud(); p._cloudHeld = true; }
    if (!inp.cloud) p._cloudHeld = false;

    if (inp.atk) fireStaff();

    if (inp.kame) { p.kameCharge = Math.min(60, p.kameCharge + 1); }
    else if (p.kameCharge > 10) { fireKame(); }
    else { p.kameCharge = 0; }

    if (p.onCloud) {
        p.vy = 0;
        if (inp.up)   p.vy = -3.2;
        if (inp.down) p.vy =  3;
        p.cloudTimer--; p.energy -= 0.15;
        if (p.cloudTimer <= 0 || p.energy <= 0) p.onCloud = false;
        if (frame % 3 === 0) particles.push({ x: p.x + rnd(-14, 14), y: p.y + PH / 2 + rnd(0, 8), vx: rnd(-0.4, 0.4), vy: rnd(0.5, 1.8), life: rnd(12, 22), ml: 22, size: rnd(3, 7), color: 'rgba(255,255,255,0.35)' });
    } else {
        p.vy += GRAV;
        if (p.vy > MAX_FALL) p.vy = MAX_FALL;
    }

    p.x += p.vx; p.y += p.vy;
    if (p.dropThrough > 0) p.dropThrough--;
    p.onGround = false;

    for (var i = 0; i < platforms.length; i++) {
        var pl = platforms[i];
        if (p.dropThrough > 0 && pl.type !== 'ground') continue;
        var px = p.x - PW / 2, py = p.y - PH / 2;
        if (px + PW > pl.x && px < pl.x + pl.w) {
            var prevBottom = py + PH - p.vy;
            if (prevBottom <= pl.y + 5 && py + PH >= pl.y && py + PH <= pl.y + pl.h + 10) {
                p.y = pl.y - PH / 2; p.vy = 0; p.onGround = true; p.jumps = 2;
            }
        }
    }

    if (p.y > H + 120) {
        if (p.hp > 0) {
            p.hp -= 20;
            p.inv = 60;
            p.x = cam.x + W / 2;
            p.y = 100;
            p.vy = 0;
            triggerShake(8, 15);
        }
    }

    for (var i = 0; i < platforms.length; i++) {
        var pl = platforms[i];
        for (var j = 0; j < pl.coins.length; j++) {
            var c = pl.coins[j];
            if (!c.collected && Math.hypot(p.x - c.x, p.y - c.y) < 24) {
                c.collected = true; score += 50; sfxCoin(); spawnP(c.x, c.y, 5, '#FFD700', 0.8, 0.6);
            }
        }
    }

    if (!p.onCloud) p.energy = Math.min(p.maxEnergy, p.energy + 0.06);
    if (p.inv > 0) p.inv--;
    if (p.atkCD > 0) p.atkCD--;
}

// ============================================
// DRAW PLAYER
// ============================================
function drawPlayer() {
    var p = player, sx = p.x - cam.x, sy = p.y - cam.y;
    if (sx < -100 || sx > W + 100) return;
    if (p.inv > 0 && Math.floor(p.inv / 3) % 2 === 0) return;

    X.save();
    X.translate(sx, sy);

    if (typeof drawCloud === 'function') {
        try { drawCloud(p, sx, sy, frame); } catch(e) {}
    }

    if (p.kameCharge > 5) {
        var cp = p.kameCharge / 60;
        var cg2 = X.createRadialGradient(PW * 0.3, 0, 2, PW * 0.3, 0, 18 + cp * 28);
        cg2.addColorStop(0, 'rgba(200,255,255,' + cp * 0.8 + ')'); cg2.addColorStop(0.4, 'rgba(0,229,255,' + cp * 0.5 + ')'); cg2.addColorStop(1, 'rgba(0,100,200,0)');
        X.beginPath(); X.arc(PW * 0.3, 0, 18 + cp * 28, 0, 6.28); X.fillStyle = cg2; X.fill();
        X.beginPath(); X.arc(PW * 0.4, -PH * 0.08, 5 + cp * 7, 0, 6.28);
        var bg2 = X.createRadialGradient(PW * 0.4, -PH * 0.08, 0, PW * 0.4, -PH * 0.08, 5 + cp * 7);
        bg2.addColorStop(0, 'rgba(255,255,255,' + cp + ')'); bg2.addColorStop(0.5, 'rgba(0,229,255,' + cp * 0.7 + ')'); bg2.addColorStop(1, 'rgba(0,100,255,' + cp * 0.3 + ')');
        X.fillStyle = bg2; X.fill();
    }

    try {
        if (spriteReady && spriteData) {
            var isMoving = Math.abs(p.vx) > 0.5 && p.onGround;
            var isInAir  = !p.onGround && !p.onCloud;

            if (isMoving) {
                spriteAnimTimer += SPRITE_FPS / 60;
                if (spriteAnimTimer >= 1) { spriteAnimTimer -= 1; currentSpriteFrame = (currentSpriteFrame + 1) % 4; }
            } else if (isInAir) { currentSpriteFrame = 2; spriteAnimTimer = 0; }
            else { currentSpriteFrame = 0; spriteAnimTimer = 0; }

            var fr = spriteData.frames[currentSpriteFrame];
            if (fr) {
                var sc = SPRITE_SCALE;
                var drawW = fr.w * sc, drawH = fr.h * sc;
                var drawX = -fr.ox * sc, drawY = (PH / 2) - fr.oy * sc;

                X.save();
                if (p.facing === -1) { X.scale(-1, 1); drawX = -drawX - drawW; }

                X.save();
                X.globalAlpha = 0.2;
                X.beginPath(); X.ellipse(0, PH / 2 + 2, drawW * 0.35, 4, 0, 0, 6.28);
                X.fillStyle = '#000'; X.fill();
                X.restore();

                X.drawImage(spriteData.img, fr.x, fr.y, fr.w, fr.h, drawX, drawY, drawW, drawH);
                X.restore();
            }
        } else {
            // FALLBACK
            X.scale(p.facing, 1);
            X.fillStyle = '#DAA520'; X.fillRect(-7, PH * 0.12, 6, 13); X.fillRect(2, PH * 0.12, 6, 13);
            X.fillStyle = '#333'; X.fillRect(-8, PH * 0.12 + 9, 8, 5); X.fillRect(1, PH * 0.12 + 9, 8, 5);
            X.beginPath(); X.rect(-PW * 0.38, -PH * 0.13, PW * 0.76, PH * 0.32);
            var bodyG = X.createLinearGradient(0, -PH * 0.13, 0, PH * 0.19);
            bodyG.addColorStop(0, '#FFD700'); bodyG.addColorStop(1, '#CC8800'); X.fillStyle = bodyG; X.fill();
            X.beginPath(); X.arc(0, -PH * 0.28, 12, 0, 6.28);
            var headG = X.createRadialGradient(-2, -PH * 0.31, 2, 0, -PH * 0.28, 12);
            headG.addColorStop(0, '#FFE4C4'); headG.addColorStop(1, '#DEB887'); X.fillStyle = headG; X.fill();
            X.fillStyle = '#FF4500';
            for (var i = -2; i <= 2; i++) { X.beginPath(); X.moveTo(i * 4.5 - 1.5, -PH * 0.28 - 11); X.lineTo(i * 4.5, -PH * 0.28 - 11 - (i === 0 ? 9 : 5.5)); X.lineTo(i * 4.5 + 1.5, -PH * 0.28 - 11); X.fill(); }
            X.fillStyle = '#FFF'; X.beginPath(); X.ellipse(-4.5, -PH * 0.3, 3.5, 3, 0, 0, 6.28); X.fill();
            X.beginPath(); X.ellipse(4.5, -PH * 0.3, 3.5, 3, 0, 0, 6.28); X.fill();
            X.fillStyle = '#000'; X.beginPath(); X.arc(-3.5, -PH * 0.29, 1, 0, 6.28); X.fill();
            X.beginPath(); X.arc(5.5, -PH * 0.29, 1, 0, 6.28); X.fill();
        }
    } catch(spriteErr) {}

    if (p.onCloud) {
        var ag = X.createRadialGradient(0, 0, PW * 0.3, 0, 0, PW * 1.1);
        ag.addColorStop(0, 'rgba(255,215,0,0.12)'); ag.addColorStop(1, 'rgba(255,215,0,0)');
        X.beginPath(); X.arc(0, 0, PW * 1.1, 0, 6.28); X.fillStyle = ag; X.fill();
    }

    X.restore();
}

// === DRAW PLATFORM ===
function drawPlatform(pl) {
    var sx = pl.x - cam.x, sy = pl.y - cam.y;
    if (sx + pl.w < -50 || sx > W + 50) return;
    X.save();
    if (pl.type === 'ground') {
        X.fillStyle = '#8B6914'; X.fillRect(sx, sy, pl.w, pl.h + 200);
        X.fillStyle = '#4CAF50'; X.fillRect(sx, sy, pl.w, 5);
        X.fillStyle = '#66BB6A'; X.fillRect(sx, sy, pl.w, 2.5);
        X.fillStyle = 'rgba(0,0,0,0.08)';
        for (var i = 0; i < pl.w; i += 28) { X.fillRect(sx + i, sy + 8, 14, 2.5); X.fillRect(sx + i + 8, sy + 22, 11, 2.5); }
    } else if (pl.type === 'candy') {
        X.beginPath();
        if (X.roundRect) X.roundRect(sx, sy, pl.w, pl.h, 5); else X.rect(sx, sy, pl.w, pl.h);
        var cg = X.createLinearGradient(sx, sy, sx, sy + pl.h);
        cg.addColorStop(0, '#FF9ED8'); cg.addColorStop(1, '#CC6699'); X.fillStyle = cg; X.fill();
        X.strokeStyle = '#FF69B4'; X.lineWidth = 1.2; X.stroke();
        for (var i = 0; i < pl.w; i += 18) { X.fillStyle = 'rgba(255,255,255,0.25)'; X.fillRect(sx + i, sy, 9, pl.h); }
    } else if (pl.type === 'chocolate') {
        X.beginPath();
        if (X.roundRect) X.roundRect(sx, sy, pl.w, pl.h, 5); else X.rect(sx, sy, pl.w, pl.h);
        var chg = X.createLinearGradient(sx, sy, sx, sy + pl.h);
        chg.addColorStop(0, '#8B4513'); chg.addColorStop(1, '#5C2E00'); X.fillStyle = chg; X.fill();
        X.strokeStyle = '#6B3410'; X.lineWidth = 1.2; X.stroke();
        for (var i = 8; i < pl.w; i += 22) { X.fillStyle = 'rgba(139,90,43,0.35)'; X.fillRect(sx + i, sy + 2, 10, pl.h - 4); }
    } else if (pl.type === 'ice') {
        X.beginPath();
        if (X.roundRect) X.roundRect(sx, sy, pl.w, pl.h, 5); else X.rect(sx, sy, pl.w, pl.h);
        var ig = X.createLinearGradient(sx, sy, sx, sy + pl.h);
        ig.addColorStop(0, '#B3E5FC'); ig.addColorStop(1, '#4FC3F7'); X.fillStyle = ig; X.fill();
        X.strokeStyle = '#29B6F6'; X.lineWidth = 1.2; X.stroke();
        X.fillStyle = 'rgba(255,255,255,0.45)'; X.fillRect(sx + 4, sy + 2.5, 13, 2.5); X.fillRect(sx + pl.w - 22, sy + 4, 10, 2);
    }
    if (pl.hasFlower && pl.type !== 'ground') {
        var fx = sx + pl.w * 0.5, fy = sy - 11;
        X.fillStyle = '#228B22'; X.fillRect(fx - 0.8, fy, 1.6, 11);
        var fc = pick(['#FF6B6B', '#FFD700', '#FF69B4', '#9D6BFF']);
        for (var i = 0; i < 5; i++) {
            var a = (i / 5) * 6.28 + frame * 0.01;
            X.beginPath(); X.arc(fx + Math.cos(a) * 4.5, fy + Math.sin(a) * 4.5, 3, 0, 6.28); X.fillStyle = fc; X.fill();
        }
        X.beginPath(); X.arc(fx, fy, 2.5, 0, 6.28); X.fillStyle = '#FFD700'; X.fill();
    }
    X.restore();
}

function drawCoin(c) {
    if (c.collected) return;
    var sx = c.x - cam.x, sy = c.y - cam.y + Math.sin(frame * 0.06 + c.bob) * 3.5;
    if (sx < -15 || sx > W + 15) return;
    var scX = Math.abs(Math.cos(frame * 0.05 + c.bob));
    X.save(); X.translate(sx, sy); X.scale(Math.max(0.2, scX), 1);
    X.beginPath(); X.arc(0, 0, 8, 0, 6.28);
    var cg = X.createRadialGradient(-1.5, -1.5, 1, 0, 0, 8);
    cg.addColorStop(0, '#FFF8B0'); cg.addColorStop(0.5, '#FFD700'); cg.addColorStop(1, '#CC8800');
    X.fillStyle = cg; X.fill();
    X.strokeStyle = '#B8860B'; X.lineWidth = 0.8; X.stroke();
    X.fillStyle = 'rgba(139,69,19,0.45)'; X.font = 'bold 9px Fredoka One';
    X.textAlign = 'center'; X.textBaseline = 'middle'; X.fillText('$', 0, 0.5);
    X.restore();
}

function drawSky() {
    var sg = X.createLinearGradient(0, 0, 0, H);
    sg.addColorStop(0, '#FFE0F0'); sg.addColorStop(0.3, '#F8D0FF');
    sg.addColorStop(0.6, '#C8E8FF'); sg.addColorStop(1, '#B0FFD0');
    X.fillStyle = sg; X.fillRect(0, 0, W, H);
    var sunX = W * 0.85 - cam.x * 0.02, sunY = H * 0.1;
    var sunG = X.createRadialGradient(sunX, sunY, 12, sunX, sunY, 70);
    sunG.addColorStop(0, 'rgba(255,230,100,0.45)'); sunG.addColorStop(0.5, 'rgba(255,200,80,0.08)'); sunG.addColorStop(1, 'rgba(255,200,80,0)');
    X.beginPath(); X.arc(sunX, sunY, 70, 0, 6.28); X.fillStyle = sunG; X.fill();
    X.beginPath(); X.arc(sunX, sunY, 22, 0, 6.28);
    var sf = X.createRadialGradient(sunX - 4, sunY - 4, 2, sunX, sunY, 22);
    sf.addColorStop(0, '#FFFDE0'); sf.addColorStop(1, '#FFD54F'); X.fillStyle = sf; X.fill();
    for (var i = 0; i < 5; i++) {
        var ax = ((i * 320 - cam.x * 0.12) % (W + 350)) - 175;
        var ay = 35 + i * 22 + Math.sin(frame * 0.007 + i) * 8;
        X.globalAlpha = 0.45; X.fillStyle = pick(['#FFB6D9', '#D9B6FF', '#B6D9FF']);
        X.beginPath(); X.arc(ax, ay, 16, 0, 6.28); X.arc(ax + 14, ay - 4, 12, 0, 6.28); X.arc(ax - 10, ay + 2, 10, 0, 6.28); X.fill();
        X.globalAlpha = 1;
    }
    X.fillStyle = '#A8E6CF';
    for (var i = -1; i < 4; i++) {
        var hx = i * 280 - cam.x * 0.08;
        X.beginPath(); X.ellipse(hx, H - 55, 230, 70, 0, Math.PI, 0); X.fill();
    }
    X.fillStyle = '#C1F0C1';
    for (var i = -1; i < 5; i++) {
        var hx = i * 230 - cam.x * 0.16 + 90;
        X.beginPath(); X.ellipse(hx, H - 35, 180, 55, 0, Math.PI, 0); X.fill();
    }
}

function drawStar(c, cx, cy, sp, or, ir, col) {
    var rot = Math.PI / 2 * 3, step = Math.PI / sp;
    c.beginPath(); c.moveTo(cx, cy - or);
    for (var i = 0; i < sp; i++) {
        c.lineTo(cx + Math.cos(rot) * or, cy + Math.sin(rot) * or); rot += step;
        c.lineTo(cx + Math.cos(rot) * ir, cy + Math.sin(rot) * ir); rot += step;
    }
    c.closePath(); c.fillStyle = col; c.fill();
}

// ============================================
// INIT GAME - ROBUST DENGAN GUARD CLAUSES
// ============================================
function initGame() {
    console.log('🔧 initGame() dipanggil...');
    
    // --- GUARD CLAUSES ---
    if (typeof W === 'undefined' || typeof H === 'undefined' || W === 0 || H === 0) {
        throw new Error('Canvas Width/Height (W/H) belum siap! Nilai: W=' + W + ', H=' + H);
    }
    if (!window.X) {
        throw new Error('Canvas Context (window.X) belum siap!');
    }
    // -----------------------------------------

    player = createPlayer();
    window.player = player;
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
    spriteAnimTimer = 0;
    currentSpriteFrame = 0;

    platforms.push(makePlat(-100, H - 35, 600, 'ground'));
    genX = 500;
    for (var i = 0; i < 3; i++) generateChunk(genX);
    cam.x = 0;
    cam.y = 0;

    touchState.moveX = 0;
    touchState.moveY = 0;
    touchState.jump = false;
    touchState.atk = false;
    touchState.kame = false;
    touchState.cloud = false;
    touchState.down = false;

    var jthumb = document.getElementById('joystickThumb');
    if (jthumb) { jthumb.style.left = '50%'; jthumb.style.top = '50%'; }
    SPRITE_SCALE = calcSpriteScale();

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
    
    console.log('✅ initGame() selesai');
}

// ============================================
// GAME LOOP - DENGAN CANVAS CLEAR DI LUAR STATE
// ============================================
function loop() {
    requestAnimationFrame(loop);

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

    if (typeof resetCloudFrame === 'function') resetCloudFrame();

    // Cek hp SEBELUM update player
    if (player.hp <= 0) {
        triggerGameOver();
        return;
    }

    updatePlayer();

    var targetCX = player.x - W * 0.35;
    cam.x += (targetCX - cam.x) * 0.08;
    distance = Math.max(distance, Math.floor(player.x / 10));
    score = Math.max(score, distance);

    if (player.x > genX - W * 2) generateChunk(genX);
    platforms = platforms.filter(function(p) { return p.x + p.w > cam.x - 300; });

    ghostTimer++;
    var spawnRate = Math.max(100, 380 - distance * 0.25);
    if (ghostTimer > spawnRate) { ghostTimer = 0; spawnGhost(); }

    for (var i = 0; i < ghosts.length; i++) updateGhost(ghosts[i]);
    ghosts = ghosts.filter(function(g) {
        if (g.hp <= 0) { score += 200; spawnP(g.x, g.y, 18, '#B040FF', 1.4, 1.1); sfxHit(); triggerShake(5, 10); return false; }
        return Math.abs(g.x - cam.x) < W + 200;
    });

    for (var i = 0; i < projectiles.length; i++) {
        var p = projectiles[i];
        p.x += p.vx; p.life--;
        for (var j = 0; j < ghosts.length; j++) {
            var g = ghosts[j];
            if (Math.hypot(p.x - g.x, p.y - g.y) < p.size + g.size) { g.hp -= 1; g.hitFlash = 6; p.life = 0; spawnP(g.x, g.y, 3, '#FFD700', 0.7); sfxHit(); break; }
        }
    }
    projectiles = projectiles.filter(function(p) { return p.life > 0; });

    for (var i = 0; i < kameBlasts.length; i++) updateKame(kameBlasts[i]);
    kameBlasts = kameBlasts.filter(function(k) { return k.life > 0; });

    for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.x += p.vx; p.y += p.vy; p.vy += 0.04; p.vx *= 0.97; p.life--;
    }
    particles = particles.filter(function(p) { return p.life > 0; });

    quakeCD--;
    if (quakeCD <= 0) { triggerQuake(); quakeCD = rndI(380, 750); }

    if (shake.t > 0) {
        shake.t--;
        var d = shake.t / 100;
        shake.x = (Math.random() - 0.5) * shake.i * d * 2;
        shake.y = (Math.random() - 0.5) * shake.i * d * 2;
    } else { shake.x = 0; shake.y = 0; }

    // === RENDER ===
    X.save();
    X.translate(shake.x, shake.y);

    try {
        for (var i = 0; i < platforms.length; i++) { var pl = platforms[i]; drawPlatform(pl); for (var j = 0; j < pl.coins.length; j++) drawCoin(pl.coins[j]); }
        for (var i = 0; i < kameBlasts.length; i++) drawKame(kameBlasts[i]);
        for (var i = 0; i < projectiles.length; i++) drawProjectile(projectiles[i]);
        for (var i = 0; i < ghosts.length; i++) drawGhost(ghosts[i]);
        drawPlayer();
        for (var i = 0; i < particles.length; i++) {
            var p = particles[i], a = p.life / p.ml;
            X.globalAlpha = a; X.fillStyle = p.color;
            X.beginPath(); X.arc(p.x - cam.x, p.y - cam.y, Math.max(0.5, p.size * a), 0, 6.28); X.fill();
            X.globalAlpha = 1;
        }
        var vg = X.createRadialGradient(W / 2, H / 2, W * 0.3, W / 2, H / 2, W * 0.7);
        vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(15,0,25,0.3)');
        X.fillStyle = vg; X.fillRect(-30, -30, W + 60, H + 60);
        if (player.hp < 30) {
            var dp = Math.sin(frame * 0.12) * 0.1 + 0.1;
            X.fillStyle = 'rgba(255,0,0,' + dp + ')'; X.fillRect(-30, -30, W + 60, H + 60);
        }
    } catch(renderErr) {
        console.warn('Render error (dilewati):', renderErr);
    }

    X.restore();

    // Update UI
    var hpB = document.getElementById('hpB');
    var enB = document.getElementById('enB');
    var scV = document.getElementById('scV');
    var dsV = document.getElementById('dsV');
    if (hpB) hpB.style.width = Math.max(0, player.hp / player.maxHp * 100) + '%';
    if (enB) enB.style.width = Math.max(0, player.energy / player.maxEnergy * 100) + '%';
    if (scV) scV.textContent = score;
    if (dsV) dsV.textContent = distance + 'm';

    window.score = score;
    window.distance = distance;
    window.player = player;
    window.platforms = platforms;
    window.ghosts = ghosts;
    window.particles = particles;
    window.projectiles = projectiles;
    window.kameBlasts = kameBlasts;
    window.cam = cam;
    window.quakeCD = quakeCD;
    window.ghostTimer = ghostTimer;
}

// === INIT ===
setupTouch();
loadSpriteSheet().then(function() {
    console.log('✅ Game loaded. Tekan ENTER atau klik tombol untuk mulai.');
});
