/* ========================================
   SUN WUKONG JUMP SPRITE SYSTEM
   File: js/jump-sprite.js
   Dipisah dari HTML agar mudah di-maintain
   ======================================== */

(function() {
  'use strict';

  /* ---------- KONFIGURASI ---------- */
  const CONFIG = {
    spritePath: 'assets/images/lompat.png',   // Path relatif dari root
    scale: 1.6,
    animSpeed: 6,
    yOffset: -5,
    effectsEnabled: true,
    debug: false
  };

  const STATE = { IDLE: 0, TAKEOFF: 1, AIR: 2, LANDING: 3 };

  /* ---------- CLASS UTAMA ---------- */
  class JumpSpriteSystem {
    constructor() {
      this.canvas = document.getElementById('c');
      this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
      this.fxContainer = document.getElementById('jumpEffects');
      this.body = document.body;

      this.sprite = new Image();
      this.sprite.src = CONFIG.spritePath;
      this.sprite.crossOrigin = 'anonymous';

      this.frameWidth = 0;
      this.frameHeight = 0;
      this.loaded = false;

      this.currentFrame = 0;
      this.animTimer = 0;
      this.jumpState = STATE.IDLE;
      this.prevVy = 0;
      this.isActive = false;
      this.landTimer = 0;

      this.player = null;
      this.playerFound = false;

      this.lastTrailTime = 0;
      this.dustSpawned = false;

      this.init();
    }

    init() {
      if (!this.canvas || !this.ctx) {
        console.warn('[JumpSprite] Canvas #c tidak ditemukan');
        return;
      }

      this.sprite.onload = () => this.onSpriteLoad();
      this.sprite.onerror = () => {
        console.error('[JumpSprite] Gagal load sprite dari:', CONFIG.spritePath);
        // Fallback: coba path alternatif
        this.sprite.src = 'assets/images/lompat.png';
      };

      // Jika sudah cache
      if (this.sprite.complete && this.sprite.naturalWidth) {
        this.onSpriteLoad();
      }

      this.hookGameLoop();
      this.findPlayerLoop();
    }

    onSpriteLoad() {
      this.frameWidth = this.sprite.naturalWidth / 4;
      this.frameHeight = this.sprite.naturalHeight;
      this.loaded = true;
      if (CONFIG.debug) {
        console.log('[JumpSprite] ✅ Sprite loaded:', this.frameWidth + 'x' + this.frameHeight);
      }
    }

    /* ---------- PLAYER DETECTION ---------- */
    findPlayerLoop() {
      const tryFind = () => {
        if (this.playerFound) return;

        // Cari nama variabel umum
        const candidates = ['player', 'hero', 'wukong', 'p', 'monkey', 'char', 'sunwukong'];
        for (let name of candidates) {
          if (window[name] && typeof window[name] === 'object' && window[name].x !== undefined) {
            this.player = window[name];
            this.playerFound = true;
            if (CONFIG.debug) console.log('[JumpSprite] Player found:', name);
            return;
          }
        }

        // Auto-detect dari global scope
        for (let key in window) {
          try {
            const obj = window[key];
            if (obj && typeof obj === 'object' && !Array.isArray(obj) &&
                obj.x !== undefined && obj.y !== undefined &&
                (obj.vy !== undefined || obj.velocityY !== undefined || obj.speedY !== undefined)) {
              this.player = obj;
              this.playerFound = true;
              if (CONFIG.debug) console.log('[JumpSprite] Auto-detected:', key);
              return;
            }
          } catch(e) {}
        }
      };

      tryFind();
      setTimeout(() => tryFind(), 500);
      setTimeout(() => tryFind(), 1200);
      setTimeout(() => tryFind(), 2500);
    }

    getPlayerState() {
      if (!this.player) return null;
      const p = this.player;
      return {
        x: p.x || p.posX || p.positionX || 0,
        y: p.y || p.posY || p.positionY || 0,
        w: p.width || p.w || p.size || 50,
        h: p.height || p.h || 70,
        vx: p.vx || p.velocityX || p.speedX || 0,
        vy: p.vy || p.velocityY || p.speedY || 0,
        onGround: p.onGround !== undefined ? p.onGround 
                : p.grounded !== undefined ? p.grounded 
                : (p.vy === 0),
        facing: p.facing || p.direction || p.flip || (p.vx < 0 ? -1 : 1)
      };
    }

    /* ---------- EFEK VISUAL (pakai CSS class) ---------- */
    spawnDust(x, y) {
      if (!CONFIG.effectsEnabled || !this.fxContainer) return;
      for (let i = 0; i < 6; i++) {
        const dust = document.createElement('div');
        dust.className = 'jump-dust';
        const angle = (Math.PI * 2 * i) / 6;
        const dist = 15 + Math.random() * 25;
        dust.style.setProperty('--dx', (Math.cos(angle) * dist).toFixed(1) + 'px');
        dust.style.setProperty('--dy', (Math.sin(angle) * dist * 0.4).toFixed(1) + 'px');
        dust.style.left = (x + Math.random() * 16 - 8) + 'px';
        dust.style.top = (y + Math.random() * 8) + 'px';
        const sz = 5 + Math.random() * 7;
        dust.style.width = sz + 'px';
        dust.style.height = sz + 'px';
        this.fxContainer.appendChild(dust);
        requestAnimationFrame(() => dust.classList.add('animate'));
        setTimeout(() => { if (dust.parentNode) dust.remove(); }, 500);
      }
    }

    spawnLandingRing(x, y) {
      if (!CONFIG.effectsEnabled || !this.fxContainer) return;
      const ring = document.createElement('div');
      ring.className = 'landing-ring';
      ring.style.left = x + 'px';
      ring.style.top = y + 'px';
      ring.style.width = '70px';
      ring.style.height = '22px';
      this.fxContainer.appendChild(ring);
      requestAnimationFrame(() => ring.classList.add('animate'));
      setTimeout(() => { if (ring.parentNode) ring.remove(); }, 600);
    }

    spawnAirTrail(x, y, facing) {
      if (!CONFIG.effectsEnabled || !this.fxContainer) return;
      const now = performance.now();
      if (now - this.lastTrailTime < 90) return;
      this.lastTrailTime = now;
      const trail = document.createElement('div');
      trail.className = 'air-trail';
      trail.style.left = (x + (facing === -1 ? 25 : -5)) + 'px';
      trail.style.top = (y + 30) + 'px';
      trail.style.transform = facing === -1 ? 'scaleX(-1)' : 'scaleX(1)';
      this.fxContainer.appendChild(trail);
      requestAnimationFrame(() => trail.classList.add('show'));
      setTimeout(() => { if (trail.parentNode) trail.remove(); }, 400);
    }

    screenShake() {
      if (!CONFIG.effectsEnabled) return;
      this.body.classList.remove('screen-shake');
      void this.body.offsetWidth;
      this.body.classList.add('screen-shake');
      setTimeout(() => this.body.classList.remove('screen-shake'), 260);
    }

    /* ---------- STATE MACHINE ---------- */
    updateJumpState(ps) {
      const vy = ps.vy;

      if (!ps.onGround && Math.abs(vy) > 0.3) {
        this.isActive = true;
        if (vy < -0.5) {
          if (this.jumpState !== STATE.TAKEOFF) {
            this.jumpState = STATE.TAKEOFF;
            this.dustSpawned = false;
          }
        } else if (vy > 0.5) {
          this.jumpState = STATE.LANDING;
        } else {
          this.jumpState = STATE.AIR;
        }
      } else if (ps.onGround && this.jumpState === STATE.LANDING) {
        this.landTimer++;
        if (this.landTimer > 10) {
          this.isActive = false;
          this.jumpState = STATE.IDLE;
          this.currentFrame = 0;
          this.landTimer = 0;
          this.dustSpawned = false;
        }
      } else if (ps.onGround) {
        this.isActive = false;
        this.jumpState = STATE.IDLE;
        this.currentFrame = 0;
        this.landTimer = 0;
        this.dustSpawned = false;
      }
      this.prevVy = vy;
    }

    updateAnimation() {
      if (!this.isActive) return;
      this.animTimer++;
      if (this.animTimer < CONFIG.animSpeed) return;
      this.animTimer = 0;

      switch (this.jumpState) {
        case STATE.TAKEOFF:
          if (this.currentFrame < 1) this.currentFrame++;
          else this.currentFrame = 1;
          break;
        case STATE.AIR:
          this.currentFrame = 2;
          break;
        case STATE.LANDING:
          if (this.currentFrame < 3) this.currentFrame++;
          else this.currentFrame = 3;
          break;
      }
    }

    /* ---------- RENDER ---------- */
    draw() {
      if (!this.loaded || !this.isActive) return;
      const ps = this.getPlayerState();
      if (!ps) return;

      const renderW = this.frameWidth * CONFIG.scale;
      const renderH = this.frameHeight * CONFIG.scale;
      const renderX = ps.x + (ps.w - renderW) / 2;
      const renderY = ps.y + (ps.h - renderH) + CONFIG.yOffset;
      const centerX = ps.x + ps.w / 2;
      const bottomY = ps.y + ps.h;

      // Efek Takeoff
      if (this.jumpState === STATE.TAKEOFF && !this.dustSpawned) {
        this.spawnDust(centerX, bottomY);
        this.dustSpawned = true;
      }

      // Efek Air Trail
      if (this.jumpState === STATE.AIR) {
        this.spawnAirTrail(ps.x, ps.y, ps.facing);
      }

      // Efek Landing
      if (this.jumpState === STATE.LANDING && this.currentFrame === 3 && this.landTimer === 0) {
        this.spawnLandingRing(centerX, bottomY);
        if (Math.abs(this.prevVy) > 7) this.screenShake();
      }

      // Render Sprite
      this.ctx.save();
      if (ps.facing === -1 || ps.facing === 'left') {
        this.ctx.translate(renderX + renderW, renderY);
        this.ctx.scale(-1, 1);
        this.ctx.drawImage(
          this.sprite,
          this.currentFrame * this.frameWidth, 0,
          this.frameWidth, this.frameHeight,
          0, 0, renderW, renderH
        );
      } else {
        this.ctx.drawImage(
          this.sprite,
          this.currentFrame * this.frameWidth, 0,
          this.frameWidth, this.frameHeight,
          renderX, renderY, renderW, renderH
        );
      }

      // Bayangan di bawah saat di udara
      if (this.jumpState !== STATE.IDLE) {
        this.ctx.globalAlpha = 0.1;
        this.ctx.fillStyle = '#000';
        this.ctx.beginPath();
        this.ctx.ellipse(centerX, bottomY - 1, ps.w * 0.3, 4, 0, 0, Math.PI * 2);
        this.ctx.fill();
      }
      this.ctx.restore();
    }

    /* ---------- GAME LOOP HOOK ---------- */
    hookGameLoop() {
      const originalRAF = window.requestAnimationFrame;
      const self = this;
      window.requestAnimationFrame = function(callback) {
        return originalRAF.call(window, function(timestamp) {
          const ps = self.getPlayerState();
          if (ps) {
            self.updateJumpState(ps);
            self.updateAnimation();
          }
          callback(timestamp);
          self.draw();
        });
      };
    }
  }

  /* ---------- INITIALIZE ---------- */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new JumpSpriteSystem());
  } else {
    new JumpSpriteSystem();
  }
})();
