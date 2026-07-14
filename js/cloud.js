// ============================================
// CLOUD MODULE - Khusus untuk gambar awan
// ============================================

var cloudImage = null;
var cloudLoaded = false;
var CLOUD_SCALE = 1.0;
var CLOUD_URL = 'assets/images/awan1.png';

// === FLAG UNTUK MENCEGAH GAMBAR BERGANDA ===
var _cloudDrawnThisFrame = false;

// ============================================
// MUAT GAMBAR AWAN & HAPUS BACKGROUND HITAM
// ============================================
function loadCloudImage() {
    return new Promise(function(resolve) {
        var img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = function() {
            var canvas = document.createElement('canvas');
            var ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            var data = imageData.data;
            
            for (var i = 0; i < data.length; i += 4) {
                var r = data[i];
                var g = data[i + 1];
                var b = data[i + 2];
                var a = data[i + 3];
                
                if (r < 40 && g < 40 && b < 40 && a > 200) {
                    data[i + 3] = 0;
                }
            }
            
            ctx.putImageData(imageData, 0, 0);
            
            cloudImage = canvas;
            cloudLoaded = true;
            CLOUD_SCALE = Math.max(0.3, Math.min(1.5, 80 / canvas.width));
            console.log('✅ Awan berhasil dimuat & background dihapus!');
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
// GAMBAR AWAN DI BAWAH KARAKTER (DENGAN FLIP)
// ============================================
function drawCloud(p, sx, sy, frame) {
    if (!p || !p.onCloud) return;
    
    var X = window.X;
    if (!X) return;

    if (_cloudDrawnThisFrame) return;
    _cloudDrawnThisFrame = true;

    if (!cloudLoaded || !cloudImage) {
        drawCloudFallback(sx, sy);
        return;
    }

    X.save();
    
    var cloudW = cloudImage.width * CLOUD_SCALE;
    var cloudH = cloudImage.height * CLOUD_SCALE;
    var cloudX = -cloudW / 2;
    var cloudY = window.PH / 2 - 2;
    
    var floatOffset = Math.sin(frame * 0.03 + p.x * 0.01) * 3;
    var rot = p.vx * 0.01;
    
    X.translate(0, floatOffset);
    X.rotate(rot);
    
    if (p.facing === -1) {
        X.scale(-1, 1);
        cloudX = -cloudX - cloudW;
    }
    
    X.globalAlpha = 0.9;
    X.drawImage(cloudImage, cloudX, cloudY, cloudW, cloudH);
    X.globalAlpha = 1;
    
    var cg = X.createRadialGradient(0, cloudY + cloudH/2, cloudW*0.2, 0, cloudY + cloudH/2, cloudW*1.2);
    cg.addColorStop(0, 'rgba(255,140,0,0.08)');
    cg.addColorStop(1, 'rgba(255,140,0,0)');
    X.beginPath();
    X.arc(0, cloudY + cloudH/2, cloudW*1.2, 0, 6.28);
    X.fillStyle = cg;
    X.fill();
    
    X.restore();
}

// ============================================
// RESET FLAG SETIAP FRAME
// ============================================
function resetCloudFrame() {
    _cloudDrawnThisFrame = false;
}

// ============================================
// FALLBACK: Awan Canvas
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
    X.restore();
}

// ============================================
// PARTIKEL AWAN SAAT AKTIF - EFEK API
// ============================================
function spawnCloudParticles(p) {
    if (!cloudLoaded || !p) return;
    
    // === PARTIKEL API (ORANYE) ===
    var count = 15 + Math.floor(rnd(0, 10));
    for (var i = 0; i < count; i++) {
        if (window.particles) {
            var colors = [
                'rgba(255, 140, 0, 0.8)',
                'rgba(255, 100, 0, 0.7)',
                'rgba(255, 200, 50, 0.6)',
                'rgba(255, 80, 0, 0.5)',
                'rgba(255, 160, 20, 0.9)'
            ];
            window.particles.push({
                x: p.x + rnd(-35, 35),
                y: p.y + window.PH/2 + rnd(-15, 20),
                vx: rnd(-3, 3) * rnd(0.5, 1.5),
                vy: rnd(-5, -1) * rnd(0.5, 1.5),
                life: rnd(25, 55),
                ml: 55,
                size: rnd(6, 20),
                color: pick(colors)
            });
        }
    }
    
    // === PARTIKEL ASAP (efek tambahan) ===
    var smokeCount = 5 + Math.floor(rnd(0, 8));
    for (var i = 0; i < smokeCount; i++) {
        if (window.particles) {
            var smokeColors = [
                'rgba(200, 180, 150, 0.25)',
                'rgba(180, 160, 130, 0.2)',
                'rgba(220, 200, 170, 0.15)'
            ];
            window.particles.push({
                x: p.x + rnd(-40, 40),
                y: p.y + window.PH/2 + rnd(-20, 10),
                vx: rnd(-1.5, 1.5) * rnd(0.3, 0.8),
                vy: rnd(-3, -0.5) * rnd(0.3, 0.8),
                life: rnd(30, 60),
                ml: 60,
                size: rnd(10, 30),
                color: pick(smokeColors)
            });
        }
    }
}
