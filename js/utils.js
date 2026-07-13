// ============================================
// UTILITAS
// ============================================

function rnd(a, b) {
    return Math.random() * (b - a) + a;
}

function rndI(a, b) {
    return Math.floor(rnd(a, b + 1));
}

function pick(a) {
    return a[Math.floor(Math.random() * a.length)];
}

function tone(f, d, t, v, fe) {
    if (!window.ac) return;
    try {
        t = t || 'sine';
        v = v || 0.1;
        var o = window.ac.createOscillator();
        var g = window.ac.createGain();
        o.type = t;
        o.frequency.setValueAtTime(f, window.ac.currentTime);
        if (fe) o.frequency.exponentialRampToValueAtTime(Math.max(20, fe), window.ac.currentTime + d);
        g.gain.setValueAtTime(v, window.ac.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, window.ac.currentTime + d);
        o.connect(g);
        g.connect(window.ac.destination);
        o.start();
        o.stop(window.ac.currentTime + d);
    } catch (e) {}
}

function drawStar(c, cx, cy, sp, or, ir, col) {
    var rot = Math.PI / 2 * 3,
        step = Math.PI / sp;
    c.beginPath();
    c.moveTo(cx, cy - or);
    for (var i = 0; i < sp; i++) {
        c.lineTo(cx + Math.cos(rot) * or, cy + Math.sin(rot) * or);
        rot += step;
        c.lineTo(cx + Math.cos(rot) * ir, cy + Math.sin(rot) * ir);
        rot += step;
    }
    c.closePath();
    c.fillStyle = col;
    c.fill();
}
