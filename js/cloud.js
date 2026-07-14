// ============================================
// GAMBAR AWAN DI BAWAH KARAKTER (HANYA 1 AWAN)
// ============================================
function drawCloud(p, sx, sy, frame) {
    // Hanya gambar jika karakter di atas awan
    if (!p.onCloud) return;
    
    // Jika gambar awan gagal dimuat, pakai fallback
    if (!cloudLoaded || !cloudImage) {
        drawCloudFallback(sx, sy);
        return;
    }

    var X = window.X;
    if (!X) return;

    // ===== HANYA GAMBAR 1 AWAN =====
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
    
    // === KOSONGKAN AREA AWAN SEBELUM MENGGAMBAR ===
    // Ini mencegah efek trail / berganda
    X.clearRect(cloudX - 10, cloudY - 10, cloudW + 20, cloudH + 20);
    
    // Gambar awan
    X.globalAlpha = 0.9;
    X.drawImage(cloudImage, cloudX, cloudY, cloudW, cloudH);
    X.globalAlpha = 1;
    
    // Efek glow
    var cg = X.createRadialGradient(0, cloudY + cloudH/2, cloudW*0.2, 0, cloudY + cloudH/2, cloudW*1.2);
    cg.addColorStop(0, 'rgba(255,255,255,0.1)');
    cg.addColorStop(1, 'rgba(255,255,255,0)');
    X.beginPath();
    X.arc(0, cloudY + cloudH/2, cloudW*1.2, 0, 6.28);
    X.fillStyle = cg;
    X.fill();
    
    X.restore();
}
