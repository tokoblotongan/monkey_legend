// ============================================
// CLOUD MODULE - Khusus untuk gambar awan
// ============================================

// === VARIABEL GLOBAL ===
var cloudImage = null;
var cloudLoaded = false;
var CLOUD_SCALE = 1.0;
var CLOUD_URL = 'assets/images/awan1.png';

// === FLAG UNTUK MENCEGAH GAMBAR BERGANDA ===
var _cloudDrawnThisFrame = false;

// ============================================
// MUAT GAMBAR AWAN
// ============================================
function loadCloudImage() {
    return new Promise(function(resolve) {
        var img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = function() {
            cloudImage = img;
            cloudLoaded = true;
            CLOUD_SCALE = Math.max(0.3, Math.min(1.5, 80 / img.width));
            console.log('✅ Awan berhasil dimuat!');
            resolve();
        };
        
        img.onerror = function() {
            console.warn('⚠️ Gagal memuat awan, pakai fallback');
            cloudLoaded = false;
            resolve();
        };
        
        img.src = CLOUD_URL;
    });
}

// ============================================
// GAMBAR AWAN DI BAWAH KARAKTER (HANYA 1)
// ============================================
function drawCloud(p, sx, sy, frame) {
    // Hanya gambar jika karakter di atas awan
    if (!p || !p.onCloud) return;
    
    var X = window.X;
    if (!X) return;

    // ===== CEK APAKAH SUDAH DIGAMBAR DI FRAME INI =====
    // Ini mencegah penggambaran berganda dalam 1 frame
    if (_cloudDrawnThisFrame) return;
    _cloudDrawnThisFrame = true;

    // Jika gambar awan gagal dimuat, pakai fallback
    if (!cloudLoaded || !cloudImage) {
        drawCloudFallback(sx, sy);
        return;
    }

    X.save();
    
    // Posisi awan di bawah kaki (tengah)
    var cloudW = cloudImage.width * CLOUD_SCALE;
    var cloudH = cloudImage.height * CLOUD_SCALE;
    var cloudX = -cloudW / 2;
    var cloudY = window.PH / 2 - 2;
    
    // Efek melayang (float)
    var floatOffset = Math.sin(frame * 0.03 + p.x * 0.01) * 3;
    var rot = p.vx * 0.01;
    
    X.translate(0, floatOffset);
    X.rotate(rot);
    
    // === CLEAR AREA AWAN SEBELUM MENGGAMBAR ===
    X.clearRect(cloudX - 20, cloudY - 20, cloudW + 40, cloudH + 40);
    
    // Gambar awan
    X.globalAlpha = 0.9;
    X.drawImage(cloudImage, cloudX, cloudY, cloudW, cloudH);
    X.globalAlpha = 1;
    
    // Efek glow (cahaya di sekitar awan)
    var cg = X.createRadialGradient(0, cloudY + cloudH/2, cloudW*0.2, 0, cloudY + cloudH/2, cloudW*1.2);
    cg.addColorStop(0, 'rgba(255,255,255,0.1)');
    cg.addColorStop(1, 'rgba(255,255,255,0)');
    X.beginPath();
    X.arc(0, cloudY + cloudH/2, cloudW*1.2, 0, 6.28);
    X.fillStyle = cg;
    X.fill();
    
    X.restore();
}

// ============================================
// RESET FLAG SETIAP FRAME (dipanggil dari game.js)
// ============================================
function resetCloudFrame() {
    _cloudDrawnThisFrame = false;
}

// ============================================
// FALLBACK: Awan Canvas (jika gambar gagal)
// ============================================
function drawCloudFallback(sx, sy) {
    var X = window.X;
    if (!X) return;
    
    X.save();
    var cy = window.PH / 2 - 2;
    
    X.beginPath();
    X.arc(-10, cy, 11, 0, 6.28);
    X.arc(10, cy, 11, 0, 6.28);
    X.arc(0, cy - 4, 13, 0, 6.28);
    X.fillStyle = 'rgba(255,250,242,0.85)';
    X.fill();
    
    var cg = X.createRadialGradient(0, cy, 4, 0, cy, 22);
    cg.addColorStop(0, 'rgba(255,250,240,0.5)');
    cg.addColorStop(1, 'rgba(255,240,220,0)');
    X.beginPath();
    X.arc(0, cy, 22, 0, 6.28);
    X.fillStyle = cg;
    X.fill();
    X.restore();
}

// ============================================
// PARTIKEL AWAN SAAT AKTIF
// ============================================
function spawnCloudParticles(p) {
    if (!cloudLoaded || !p) return;
    
    for (var i = 0; i < 5; i++) {
        if (window.particles) {
            window.particles.push({
                x: p.x + rnd(-20, 20),
                y: p.y + window.PH/2 + rnd(0, 10),
                vx: rnd(-0.5, 0.5),
                vy: rnd(0.3, 1.5),
                life: rnd(15, 30),
                ml: 30,
                size: rnd(4, 10),
                color: 'rgba(255,255,255,0.3)'
            });
        }
    }
}
