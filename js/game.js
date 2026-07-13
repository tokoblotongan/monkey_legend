// ============================================
// MONKEY LEGEND - GAME ENGINE
// ============================================

// === CANVAS ===
var C = document.getElementById('c'),
    X = C.getContext('2d');
var W, H;

function resize() {
    W = C.width = innerWidth;
    H = C.height = innerHeight;
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

        var minX = endX,
            maxX = startX,
            minY = sh,
            maxY = 0;
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

        if (!found) {
            minX = startX;
            maxX = endX - 1;
            minY = 0;
            maxY = sh - 1;
        }

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
        var totalToLoad = 2; // sprite + cloud

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

        // Muat sprite karakter
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

        // Muat gambar awan dari cloud.js
        if (typeof loadCloudImage === 'function') {
            loadCloudImage().then(function() {
                loadFill.style.width = '80%';
                loadText.textContent = 'Memuat awan...';
                checkComplete();
            }).catch(function() {
                checkComplete();
            });
        } else {
            // Jika cloud.js tidak dimuat, tetap lanjut
            checkComplete();
        }
    });
}

// ============================================
// AUDIO
// ============================================
var ac;
function initAudio() { if (!ac) try { ac = new(window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
window.ac = ac;
window.initAudio = initAudio;

// Sound effects
window.sfxJump = function() { tone(300, 0.15, 'sine', 0.1, 600); };
window.sfxAtk = function() { tone(500, 0.08, 'sawtooth', 0.08, 250); };
window.sfxKame = function() {
    tone(150, 0.8, 'sawtooth', 0.13, 800);
    setTimeout(function() { tone(400, 0.4, 'sine', 0.08, 100); }, 200);
};
window.sfxHit = function() { tone(180, 0.12, 'square', 0.09, 60); };
window.sfxQuake = function() { tone(35, 1.5, 'sawtooth', 0.15, 15); };
window.sfxCoin = function() {
    tone(800, 0.1, 'sine', 0.07);
    setTimeout(function() { tone(1200, 0.15, 'sine', 0.07); }, 80);
};
window.sfxCloud = function() { tone(600, 0.3, 'sine', 0.09, 900); };
window.sfxGhost = function() { tone(80, 0.5, 'sine', 0.05, 40); };
window.sfxDie = function() { tone(400, 0.6, 'sawtooth', 0.1, 50); };

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

// Ekspose ke global
window.state = state;
window.score = score;
window.distance = distance;
window.frame = frame;
window.player = player;
window.platforms = platforms;
window.ghosts = ghosts;
window.particles = particles;
window.projectiles = projectiles;
window.kameBlasts = kameBlasts;
window.keys = keys;
window.shake = shake;
window.quakeCD = quakeCD;
window.cam = cam;
window.genX = genX;
window.ghostTimer = ghostTimer;
window.spriteAnimTimer = spriteAnimTimer;
window.currentSpriteFrame = currentSpriteFrame;

// === KONSTANTA ===
var GRAV = 0.52,
    JUMP = -11.5,
    SPEED = 4.8,
    MAX_FALL = 14;
var PW = 30,
    PH = 38,
    PLAT_H = 16;

window.GRAV = GRAV;
window.JUMP = JUMP;
window.SPEED = SPEED;
window.MAX_FALL = MAX_FALL;
window.PW = PW;
window.PH = PH;
window.PLAT_H = PLAT_H;

// === INPUT MOUSE ===
var mouseState = { leftClick: false };
window.mouseState = mouseState;
addEventListener('mousedown', function(e) { if (e.button === 0) mouseState.leftClick = true; });
addEventListener('mouseup', function(e) { if (e.button === 0) mouseState.leftClick = false; });

// === KEYBOARD ===
addEventListener('keydown', function(e) {
    var key = e.key.toLowerCase();
    keys[key] = true;
    
    // Tangani Enter
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (state === 'menu') {
            if (typeof initAudio === 'function') initAudio();
            startGame();
        } else if (state === 'over') {
            if (typeof initAudio === 'function') initAudio();
            restartGame();
        }
        return;
    }
    
    if (['w', 'a', 's', 'd', ' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].indexOf(key) >= 0) e.preventDefault();
});
addEventListener('keyup', function(e) { 
    var key = e.key.toLowerCase();
    keys[key] = false; 
});

// === TOUCH ===
var touchState = { moveX: 0, moveY: 0, jump: false, atk: false, kame: false, cloud: false, down: false };
window.touchState = touchState;
var joystickActive = false,
    joystickId = null,
    joystickCX = 0,
    joystickCY = 0;
var btnKeys = ['jump', 'atk', 'kame', 'cloud', 'down'];
var activeTouches = {};

function setupTouch() {
    var jz = document.getElementById('joystickZone');
    var jthumb = document.getElementById('joystickThumb');
    var jbase = document.getElementById('joystickBase');

    function getMaxR() { var bw = jbase.offsetWidth; var tw = jthumb.offsetWidth; return (bw - tw) / 2; }
    jz.addEventListener('touchstart', function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (joystickActive) return;
        var t = e.changedTouches[0];
        joystickActive = true;
        joystickId = t.identifier;
        var rect = jbase.getBoundingClientRect();
        joystickCX = rect.left + rect.width / 2;
        joystickCY = rect.top + rect.height / 2;
        updateJoystick(t.clientX, t.clientY, getMaxR(), jthumb);
    }, { passive: false });

    jz.addEventListener('touchmove', function(e) {
        e.preventDefault();
        e.stopPropagation();
        for (var i = 0; i < e.changedTouches.length; i++) {
            var t = e.changedTouches[i];
            if (t.identifier === joystickId) {
                updateJoystick(t.clientX, t.clientY, getMaxR(), jthumb);
            }
        }
    }, { passive: false });

    function endJoystick(e) {
        for (var i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === joystickId) {
                joystickActive = false;
                joystickId = null;
                jthumb.style.left = '50%';
                jthumb.style.top = '50%';
                touchState.moveX = 0;
                touchState.moveY = 0;
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
                e.preventDefault();
                e.stopPropagation();
                touchState[key] = true;
                el.classList.add('pressed');
                for (var i = 0; i < e.changedTouches.length; i++) {
                    activeTouches[e.changedTouches[i].identifier] = key;
                }
            }, { passive: false });

            el.addEventListener('touchend', function(e) {
                e.preventDefault();
                e.stopPropagation();
                for (var i = 0; i < e.changedTouches.length; i++) {
                    var id = e.changedTouches[i].identifier;
                    if (activeTouches[id] === key) {
                        delete activeTouches[id];
                    }
                }
                var stillActive = false;
                for (var id in activeTouches) {
                    if (activeTouches[id] === key) {
                        stillActive = true;
                        break;
                    }
                }
                if (!stillActive) {
                    touchState[key] = false;
                    el.classList.remove('pressed');
                }
            }, { passive: false });

            el.addEventListener('touchcancel', function(e) {
                touchState[key] = false;
                el.classList.remove('pressed');
                for (var i = 0; i < e.changedTouches.length; i++) {
                    delete activeTouches[e.changedTouches[i].identifier];
                }
            }, { passive: false });

            el.addEventListener('mousedown', function(e) {
                touchState[key] = true;
                el.classList.add('pressed');
            });
            el.addEventListener('mouseup', function(e) {
                touchState[key] = false;
                el.classList.remove('pressed');
            });
            el.addEventListener('mouseleave', function(e) {
                touchState[key] = false;
                el.classList.remove('pressed');
            });
        })(b);
    }
}

function updateJoystick(clientX, clientY, maxR, jthumb) {
    var dx = clientX - joystickCX,
        dy = clientY - joystickCY;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > maxR) { dx = dx / dist * maxR;
        dy = dy / dist * maxR; }
    jthumb.style.left = (50 + (dx / maxR) * 50) + '%';
    jthumb.style.top = (50 + (dy / maxR) * 50) + '%';
    touchState.moveX = dx / maxR;
    touchState.moveY = dy / maxR;
    if (Math.abs(touchState.moveX) < 0.1) touchState.moveX = 0;
    if (Math.abs(touchState.moveY) < 0.1) touchState.moveY = 0;
}

document.addEventListener('touchmove', function(e) { if (state === 'play') e.preventDefault(); }, { passive: false });

// === MULAI GAME ===
function startGame() {
    // Pastikan audio aktif
    if (typeof initAudio === 'function') {
        try { initAudio(); } catch(e) {}
    }
    initGame();
    state = 'play';
    window.state = state;
    document.getElementById('overlay').classList.add('hidden');
    if (isTouchDevice) document.getElementById('touchControls').classList.add('show');
}

function restartGame() {
    // Pastikan audio aktif
    if (typeof initAudio === 'function') {
        try { initAudio(); } catch(e) {}
    }
    initGame();
    state = 'play';
    window.state = state;
    document.getElementById('gameover').classList.remove('show');
    if (isTouchDevice) document.getElementById('touchControls').classList.add('show');
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
        var w = rnd(90, 240),
            y = rnd(H * 0.25, H - 90);
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
    var gx = cam.x + (side < 0 ? -70 : W + 70),
        gy = rnd(H * 0.15, H * 0.55);
    var spd = rnd(1.0, 2.2) + distance * 0.0002;
    var hp = 2 + Math.floor(distance / 400);
    ghosts.push({ x: gx, y: gy, vx: 0, vy: 0, size: rnd(26, 40), speed: Math.min(spd, 5), hp: hp, maxHp: hp, phase: rnd(0, 6.28), hitFlash: 0, type: rndI(0, 2) });
    sfxGhost();
}

function updateGhost(g) {
    var dx = player.x - g.x,
        dy = player.y - g.y,
        d = Math.hypot(dx, dy) || 1;
    g.vx += (dx / d) * g.speed * 0.07;
    g.vy += (dy / d) * g.speed * 0.07 + 0.02;
    g.vx *= 0.97;
    g.vy *= 0.97;
    g.vy = Math.max(-5.5, Math.min(5.5, g.vy));
    g.x += g.vx;
    g.y += g.vy;
    g.phase += 0.055;
    if (g.hitFlash > 0) g.hitFlash--;
    if (Math.abs(g.x - player.x) < g.size + PW * 0.4 && Math.abs(g.y - player.y) < g.size + PH * 0.4 && player.inv <= 0) {
        player.hp -= 12;
        player.inv = 50;
        sfxHit();
        triggerShake(10, 18);
        spawnP(player.x, player.y, 8, '#FF4444', 1.2);
    }
}

function drawGhost(g) {
    X.save();
    var sx = g.x - cam.x,
        sy = g.y - cam.y;
    if (sx < -80 || sx > W + 80) { X.restore(); return; }
    X.translate(sx, sy);
    var s = g.size,
        p = Math.sin(g.phase) * 0.07 + 1;
    var faceR = g.x < player.x ? 1 : -1;
    X.scale(faceR * p, p);
    var ag = X.createRadialGradient(0, 0, s * 0.2, 0, 0, s * 2.2);
    ag.addColorStop(0, 'rgba(100,0,150,0.18)');
    ag.addColorStop(1, 'rgba(0,0,0,0)');
    X.beginPath();
    X.arc(0, 0, s * 2.2, 0, 6.28);
    X.fillStyle = ag;
    X.fill();
    if (g.type === 0) {
        X.beginPath();
        X.moveTo(-s, 2);
        X.quadraticCurveTo(-s, -s * 1.1, 0, -s * 1.25);
        X.quadraticCurveTo(s, -s * 1.1, s, 2);
        for (var i = 0; i < 5; i++) { var bx = s - i * (s * 2 / 5);
            X.quadraticCurveTo(bx - s * 0.1, s * 0.5 + (i % 2 ? -7 : 7), bx - s * 0.2, 2); }
        X.closePath();
        var bg = X.createLinearGradient(0, -s, 0, s * 0.5);
        bg.addColorStop(0, 'rgba(35,0,55,0.7)');
        bg.addColorStop(1, 'rgba(15,0,35,0.35)');
        X.fillStyle = bg;
        X.fill();
        X.beginPath();
        X.ellipse(-s * 0.28, -s * 0.4, s * 0.2, s * 0.28, 0, 0, 6.28);
        X.fillStyle = '#FFF';
        X.fill();
        X.beginPath();
        X.ellipse(s * 0.28, -s * 0.4, s * 0.2, s * 0.28, 0, 0, 6.28);
        X.fill();
        X.beginPath();
        X.arc(-s * 0.24, -s * 0.36, s * 0.09, 0, 6.28);
        X.fillStyle = '#000';
        X.fill();
        X.beginPath();
        X.arc(s * 0.24, -s * 0.36, s * 0.09, 0, 6.28);
        X.fill();
    } else if (g.type === 1) {
        X.beginPath();
        X.moveTo(-s * 0.75, s * 0.55);
        X.quadraticCurveTo(-s * 0.85, -s * 0.45, 0, -s * 1.05);
        X.quadraticCurveTo(s * 0.85, -s * 0.45, s * 0.75, s * 0.55);
        for (var i = 0; i < 4; i++) { var bx = s * 0.75 - i * (s * 1.5 / 4);
            X.quadraticCurveTo(bx - s * 0.08, s * 0.85 + (i % 2 ? -5 : 5), bx - s * 0.15, s * 0.55); }
        X.closePath();
        var sg = X.createRadialGradient(0, -s * 0.3, s * 0.1, 0, 0, s * 1.1);
        sg.addColorStop(0, 'rgba(180,80,255,0.55)');
        sg.addColorStop(0.5, 'rgba(120,0,200,0.3)');
        sg.addColorStop(1, 'rgba(60,0,100,0.08)');
        X.fillStyle = sg;
        X.fill();
        X.beginPath();
        X.arc(0, -s * 0.3, s * 0.28, 0, 6.28);
        X.fillStyle = '#E0B0FF';
        X.fill();
        X.beginPath();
        X.arc(s * 0.04, -s * 0.26, s * 0.14, 0, 6.28);
        X.fillStyle = '#4A0080';
        X.fill();
        X.beginPath();
        X.arc(s * 0.07, -s * 0.28, s * 0.05, 0, 6.28);
        X.fillStyle = '#FFF';
        X.fill();
    } else {
        X.beginPath();
        X.arc(0, -s * 0.3, s * 0.75, 0, 6.28);
        var skg = X.createRadialGradient(-s * 0.15, -s * 0.45, s * 0.08, 0, -s * 0.3, s * 0.75);
        skg.addColorStop(0, '#E8E0D0');
        skg.addColorStop(0.7, '#B0A090');
        skg.addColorStop(1, '#706050');
        X.fillStyle = skg;
        X.fill();
        X.beginPath();
        X.ellipse(0, s * 0.22, s * 0.45, s * 0.25, 0, 0, Math.PI);
        X.fillStyle = '#A09080';
        X.fill();
        X.beginPath();
        X.ellipse(-s * 0.22, -s * 0.35, s * 0.18, s * 0.22, 0, 0, 6.28);
        X.fillStyle = '#000';
        X.fill();
        X.beginPath();
        X.ellipse(s * 0.22, -s * 0.35, s * 0.18, s * 0.22, 0, 0, 6.28);
        X.fill();
        X.beginPath();
        X.arc(-s * 0.22, -s * 0.35, s * 0.055, 0, 6.28);
        X.fillStyle = '#FF0000';
        X.fill();
        X.beginPath();
        X.arc(s * 0.22, -s * 0.35, s * 0.055, 0, 6.28);
        X.fill();
        X.beginPath();
        X.moveTo(-s * 0.04, -s * 0.1);
        X.lineTo(s * 0.04, -s * 0.1);
        X.lineTo(0, -s * 0.18);
        X.closePath();
        X.fillStyle = '#000';
        X.fill();
        for (var i = -2; i <= 2; i++) { X.fillStyle = '#CCBB99';
            X.fillRect(i * s * 0.11 - 2, s * 0.08, 4, s * 0.1);
            X.fillRect(i * s * 0.11 - 1.5, s * 0.15, 3, s * 0.08); }
    }
    if (g.hitFlash > 0) { X.globalAlpha = g.hitFlash / 8 * 0.5;
        X.beginPath();
        X.arc(0, 0, s * 1.1, 0, 6.28);
        X.fillStyle = '#FFF';
        X.fill();
        X.globalAlpha = 1; }
    if (g.hp < g.maxHp) { X.scale(faceR, 1); var bw = s * 1.4;
        X.fillStyle = 'rgba(0,0,0,0.5)';
        X.fillRect(-bw / 2, -s * 1.5, bw, 4);
        X.fillStyle = '#B040FF';
        X.fillRect(-bw / 2, -s * 1.5, bw * (g.hp / g.maxHp), 4); }
    X.restore();
}

// === KAMEHAMEHA ===
function fireKame() {
    if (player.energy < 35 || player.kameCharge < 10) return;
    player.energy -= 35;
    player.kameCharge = 0;
    var dir = player.facing;
    kameBlasts.push({ x: player.x + dir * PW * 0.6, y: player.y - PH * 0.1, vx: dir * 11, size: 18, maxLife: 75, life: 75, damage: 3 });
    sfxKame();
    triggerShake(6, 12);
    spawnP(player.x + dir * 22, player.y - PH * 0.1, 15, '#00E5FF', 1.5, 1.2);
}
window.fireKame = fireKame;

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

function drawKame(k) {
    var sx = k.x - cam.x,
        sy = k.y - cam.y,
        a = k.life / k.maxLife;
    var lg = X.createRadialGradient(sx, sy, 0, sx, sy, k.size * 2.2);
    lg.addColorStop(0, 'rgba(220,255,255,' + a * 0.9 + ')');
    lg.addColorStop(0.3, 'rgba(0,229,255,' + a * 0.55 + ')');
    lg.addColorStop(0.7, 'rgba(0,100,200,' + a * 0.25 + ')');
    lg.addColorStop(1, 'rgba(0,50,150,0)');
    X.beginPath();
    X.arc(sx, sy, k.size * 2.2, 0, 6.28);
    X.fillStyle = lg;
    X.fill();
    X.beginPath();
    X.arc(sx, sy, k.size * 0.55, 0, 6.28);
    X.fillStyle = 'rgba(255,255,255,' + a * 0.9 + ')';
    X.fill();
    X.beginPath();
    X.moveTo(sx, sy - k.size * 0.7);
    X.lineTo(sx - k.vx * 3, sy - k.size * 0.4);
    X.lineTo(sx - k.vx * 3, sy + k.size * 0.4);
    X.lineTo(sx, sy + k.size * 0.7);
    X.closePath();
    X.fillStyle = 'rgba(0,180,255,' + a * 0.25 + ')';
    X.fill();
}

// === PROYEKTIL ===
function fireStaff() {
    if (player.atkCD > 0) return;
    player.atkCD = 14;
    var dir = player.facing;
    projectiles.push({ x: player.x + dir * PW * 0.8, y: player.y - PH * 0.2, vx: dir * 9, life: 38, size: 5 });
    sfxAtk();
    spawnP(player.x + dir * PW, player.y - PH * 0.2, 3, '#FFD700', 0.7);
}
window.fireStaff = fireStaff;

function drawProjectile(p) {
    var sx = p.x - cam.x,
        sy = p.y - cam.y;
    X.save();
    X.translate(sx, sy);
    var g = X.createRadialGradient(0, 0, 0, 0, 0, p.size * 2.5);
    g.addColorStop(0, 'rgba(255,215,0,0.8)');
    g.addColorStop(0.5, 'rgba(255,140,0,0.3)');
    g.addColorStop(1, 'rgba(255,100,0,0)');
    X.beginPath();
    X.arc(0, 0, p.size * 2.5, 0, 6.28);
    X.fillStyle = g;
    X.fill();
    drawStar(X, 0, 0, 5, p.size, p.size * 0.4, '#FFD700');
    X.restore();
}

// === AWAN ===
function activateCloud() {
    if (player.energy < 18 || player.onCloud) return;
    player.energy -= 18;
    player.onCloud = true;
    player.cloudTimer = 220;
    player.vy = 0;
    sfxCloud();
   
