// Konfigurasi aset
const playerImage = new Image();
playerImage.src = 'assets/images/Lari hadap depan.png'; // Pastikan path benar

const spriteWidth = 299;  
const spriteHeight = 359; 

let frameX = 0;           
let gameFrame = 0;        
const staggerFrames = 8;  // Sesuaikan kecepatan (semakin besar semakin lambat)

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Logika pergantian frame
    if (gameFrame % staggerFrames === 0) {
        if (frameX < 3) {
            frameX++;
        } else {
            frameX = 0; // Kembali ke frame pertama setelah frame ke-4
        }
    }
    
    // Menggambar potongan karakter ke canvas
    // Argumen: (image, sx, sy, sw, sh, dx, dy, dw, dh)
    ctx.drawImage(
        playerImage, 
        frameX * spriteWidth, 0, spriteWidth, spriteHeight, // Area potong
        50, 50, spriteWidth / 2, spriteHeight / 2          // Posisi & ukuran di layar (dibagi 2 agar tidak terlalu besar)
    );

    gameFrame++;
    requestAnimationFrame(animate);
}

// Jalankan animasi setelah gambar dimuat
playerImage.onload = () => {
    animate();
};
