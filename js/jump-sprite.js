/* ========================================
   SUN WUKONG JUMP EFFECTS
   File: js/jump-sprite.js
   Hanya efek visual: dust, trail, landing ring, screen shake
   Render sprite lompat sudah di-handle oleh game.js
   ======================================== */

(function() {
  'use strict';

  const CONFIG = {
    effectsEnabled: true,
    debug: false
  };

  class JumpEffectsSystem {
    constructor() {
      this.fxContainer = document.getElementById('jumpEffects');
      this.body = document.body;
      this.player = null;
      this.playerFound = false;

      this.prevOnGround = true;
      this.prevVy = 0;
      this.lastTrailTime = 0;

      this.init();
    }

    init() {
      this.findPlayerLoop();
      this.hookGameLoop();
      if (CONFIG.debug) console.log('[JumpEffects] Initialized');
    }

    findPlayerLoop() {
      const scan = () => {
        if (this.playerFound) return;
        const names = ['player', 'hero', 'wukong', 'p', 'monkey'];
        for (let n of names) {
          if (window[n] && typeof window[n] === 'object' && window[n].x !== undefined) {
            this.player = window[n];
            this.playerFound = true;
            if (CONFIG.debug) console.log('[JumpEffects] Player found:', n);
            return;
          }
        }
      };
      scan();
      setTimeout(scan, 600);
      setTimeout(scan, 2000);
    }

    getPlayerState() {
      if (!this.player) return null;
      const p = this.player;
      return {
        x: p.x || 0,
        y: p.y || 0,
        w: p.width || p.w || 50,
        h: p.height || p.h || 70,
        vy: p.vy || p.velocityY || 0,
        onGround: p.onGround !== undefined ? p.onGround : false,
        facing: p.facing || (p.vx < 0 ? -1 : 1)
      };
    }

    /* ---------- EFEK ---------- */
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
        dust.style.top = (y + Math.random() * 10) + 'px';
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

    /* ---------- LOOP ---------- */
    update() {
      const ps = this.getPlayerState();
      if (!ps) return;

      const centerX = ps.x + ps.w / 2;
      const bottomY = ps.y + ps.h;

      // Takeoff effect
      if (!ps.onGround && this.prevOnGround && ps.vy < -2) {
        this.spawnDust(centerX, bottomY);
      }

      // Air trail
      if (!ps.onGround && Math.abs(ps.vy) > 1) {
        this.spawnAirTrail(ps.x, ps.y, ps.facing);
      }

      // Landing effect
      if (ps.onGround && !this.prevOnGround && this.prevVy > 3) {
        this.spawnLandingRing(centerX, bottomY);
        if (this.prevVy > 8) this.screenShake();
      }

      this.prevOnGround = ps.onGround;
      this.prevVy = ps.vy;
    }

    hookGameLoop() {
      const originalRAF = window.requestAnimationFrame;
      const self = this;
      window.requestAnimationFrame = function(callback) {
        return originalRAF.call(window, function(timestamp) {
          self.update();
          callback(timestamp);
        });
      };
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new JumpEffectsSystem());
  } else {
    new JumpEffectsSystem();
  }
})();
