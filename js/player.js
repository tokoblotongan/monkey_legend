// ============================================
// PLAYER
// ============================================

function createPlayer() {
    return {
        x: 200,
        y: window.H - 200,
        vx: 0,
        vy: 0,
        hp: 100,
        maxHp: 100,
        energy: 100,
        maxEnergy: 100,
        facing: 1,
        onGround: false,
        onCloud: false,
        cloudTimer: 0,
        inv: 0,
        atkCD: 0,
        kameCharge: 0,
        jumps: 2,
        dropThrough: 0,
        _jumpHeld: false,
        _cloudHeld: false,
        _atkHeld: false,
        _kameHeld: false
    };
}

function getInput() {
    var left = window.keys['a'] || window.keys['arrowleft'] || (window.touchState.moveX < -0.3);
    var right = window.keys['d'] || window.keys['arrowright'] || (window.touchState.moveX > 0.3);
    var up = window.keys['w'] || window.keys['arrowup'] || window.touchState.jump;
    var down = window.keys['s'] || window.keys['arrowdown'] || window.touchState.down;
    var atk = window.keys['j'] || window.mouseState.leftClick || window.touchState.atk;
    var kame = window.keys['k'] || window.touchState.kame;
    var cloud = window.keys['l'] || window.keys[' '] || window.touchState.cloud;
    return { left: left, right: right, up: up, down: down, atk: atk, kame: kame, cloud: cloud };
}

function updatePlayer() {
    var p = window.player,
        inp = getInput();
    var SPEED = window.SPEED || 4.8;
    var GRAV = window.GRAV || 0.52;
    var JUMP = window.JUMP || -11.5;
    var MAX_FALL = window.MAX_FALL || 14;
    var PW = window.PW || 30;
    var PH = window.PH || 38;

    if (inp.left) { p.vx = -SPEED;
        p.facing = -1; } else if (inp.right) { p.vx = SPEED;
        p.facing = 1; } else p.vx *= 0.78;

    if (inp.up && !p._jumpHeld) {
        if (p.onCloud) {
            p.onCloud = false;
            p.cloudTimer = 0;
            p.vy = JUMP * 0.8;
            p.jumps = 1;
        } else if (p.jumps > 0) {
            p.vy = JUMP;
            p.jumps--;
            p.onGround = false;
            window.sfxJump();
            window.spawnP(p.x, p.y + PH / 2, 4, '#FFD700', 0.5, 0.5);
        }
        p._jumpHeld = true;
    }
    if (!inp.up) p._jumpHeld = false;

    if (inp.down) p.dropThrough = 8;

    if (inp.cloud && !p._cloudHeld) {
        window.activateCloud();
        p._cloudHeld = true;
    }
    if (!inp.cloud) p._cloudHeld = false;

    if (inp.atk) window.fireStaff();

    if (inp.kame) {
        p.kameCharge = Math.min(60, p.kameCharge + 1);
    } else if (p.kameCharge > 10) {
        window.fireKame();
    } else {
        p.kameCharge = 0;
    }

    if (p.onCloud) {
        p.vy = 0;
        if (inp.up) p.vy = -3.2;
        if (inp.down) p.vy = 3;
        p.cloudTimer--;
        p.energy -= 0.15;
        if (p.cloudTimer <= 0 || p.energy <= 0) p.onCloud = false;
        if (window.frame % 3 === 0) {
            window.particles.push({
                x: p.x + rnd(-14, 14),
                y: p.y + PH / 2 + rnd(0, 8),
                vx: rnd(-0.4, 0.4),
                vy: rnd(0.5, 1.8),
                life: rnd(12, 22),
                ml: 22,
                size: rnd(3, 7),
                color: 'rgba(255,255,255,0.35)'
            });
        }
    } else {
        p.vy += GRAV;
        if (p.vy > MAX_FALL) p.vy = MAX_FALL;
    }

    p.x += p.vx;
    p.y += p.vy;
    if (p.dropThrough > 0) p.dropThrough--;

    p.onGround = false;
    for (var i = 0; i < window.platforms.length; i++) {
        var pl = window.platforms[i];
        if (p.dropThrough > 0 && pl.type !== 'ground') continue;
        var px = p.x - PW / 2,
            py = p.y - PH / 2;
        if (px + PW > pl.x && px < pl.x + pl.w) {
            var prevBottom = py + PH - p.vy;
            if (prevBottom <= pl.y + 5 && py + PH >= pl.y && py + PH <= pl.y + pl.h + 10) {
                p.y = pl.y - PH / 2;
                p.vy = 0;
                p.onGround = true;
                p.jumps = 2;
            }
        }
    }

    if (p.y > window.H + 120) {
        p.hp -= 20;
        p.inv = 60;
        p.x = window.cam.x + window.W / 2;
        p.y = 100;
        p.vy = 0;
        window.triggerShake(8, 15);
    }

    for (var i = 0; i < window.platforms.length; i++) {
        var pl = window.platforms[i];
        for (var j = 0; j < pl.coins.length; j++) {
            var c = pl.coins[j];
            if (!c.collected && Math.hypot(p.x - c.x, p.y - c.y) < 24) {
                c.collected = true;
                window.score += 50;
                window.sfxCoin();
                window.spawnP(c.x, c.y, 5, '#FFD700', 0.8, 0.6);
            }
        }
    }

    if (!p.onCloud) p.energy = Math.min(p.maxEnergy, p.energy + 0.06);
    if (p.inv > 0) p.inv--;
    if (p.atkCD > 0) p.atkCD--;
}
