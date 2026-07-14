// ============================================
// CLOUD MODULE - Khusus untuk gambar awan
// ============================================

var cloudImage = null;
var cloudLoaded = false;
var CLOUD_SCALE = 1.0;
var CLOUD_URL = 'assets/images/awan1.png'; // ← pakai gambar baru

// ============================================
// MUAT GAMBAR AWAN & HAPUS BACKGROUND HITAM
// ============================================
function loadCloudImage() {
    return new Promise(function(resolve) {
        var img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = function() {
            // === PROSES HAPUS BACKGROUND HITAM ===
            var canvas = document.createElement('canvas');
            var ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            var data = imageData.data;
            
            // Hapus pixel dengan warna hitam (atau mendekati hitam)
            for (var i = 0; i < data.length; i += 4) {
                var r = data[i];
                var g = data[i + 1];
                var b = data[i + 2];
                var a = data[i + 3];
                
                // Jika warna mendekati hitam (0-30) dan opasitas penuh
                if (r < 30 && g < 30 && b < 30 && a > 200) {
                    data[i + 3] = 0; // Set alpha menjadi 0 (transparan)
                }
            }
            
            ctx.putImageData(imageData, 0, 0);
            
            // Simpan hasil ke cloudImage
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

// === FUNGSI LAINNYA (drawCloud, drawCloudFallback, spawnCloudParticles) ===
// Tetap sama seperti sebelumnya
// ... (saya tulis ulang di bawah agar lengkap)

function drawCloud(p, sx, sy, frame) {
    if (!p || !p.onCloud) return;
    var X = window.X;
    if (!X) return;
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
    X.globalAlpha = 0.9;
    X.drawImage(cloudImage, cloudX, cloudY, cloudW, cloudH);
    X.globalAlpha = 1;
    X.restore();
}

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
