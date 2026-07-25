/* ========================================
   SUN WUKONG JUMP SPRITE SYSTEM
   File: css/jump-sprite.css
   Pisahkan agar mudah di-maintain & dikustomisasi
   ======================================== */

/* ---------- VARIABLES ---------- */
:root{
  --jump-scale: 1.6;
  --jump-anim-speed: 6;
  --jump-glow: rgba(255, 215, 0, 0.4);
  --jump-shadow: rgba(0, 0, 0, 0.25);
}

/* ---------- SPRITE SHEET ---------- */
.sprite-sheet{
  display: none !important;
  pointer-events: none;
  user-select: none;
}

/* Container untuk sprite (auto-generated via JS) */
.jump-sprite-container{
  position: absolute;
  pointer-events: none;
  z-index: 12;
  will-change: transform, opacity;
}

/* ---------- LANDING EFFECT ---------- */
.landing-ring{
  position: absolute;
  border-radius: 50%;
  border: 2px solid var(--jump-glow);
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.3);
  pointer-events: none;
  z-index: 11;
}

.landing-ring.animate{
  animation: landingRipple 0.5s ease-out forwards;
}

@keyframes landingRipple{
  0%   { opacity: 0.8; transform: translate(-50%, -50%) scale(0.3); }
  100% { opacity: 0;   transform: translate(-50%, -50%) scale(2.0); }
}

/* ---------- DUST EFFECT (saat takeoff) ---------- */
.jump-dust{
  position: absolute;
  width: 8px;
  height: 8px;
  background: rgba(200, 180, 140, 0.6);
  border-radius: 50%;
  pointer-events: none;
  z-index: 11;
}

.jump-dust.animate{
  animation: dustPoof 0.4s ease-out forwards;
}

@keyframes dustPoof{
  0%   { opacity: 0.8; transform: translate(0, 0) scale(1); }
  100% { opacity: 0;   transform: translate(var(--dx), var(--dy)) scale(0); }
}

/* ---------- AIR TRAIL (jejak saat di udara) ---------- */
.air-trail{
  position: absolute;
  width: 20px;
  height: 4px;
  background: linear-gradient(90deg, rgba(255,215,0,0.3), transparent);
  border-radius: 2px;
  pointer-events: none;
  opacity: 0;
  z-index: 10;
}

.air-trail.show{
  animation: trailFade 0.3s ease-out forwards;
}

@keyframes trailFade{
  0%   { opacity: 0.5; transform: scaleX(1); }
  100% { opacity: 0;   transform: scaleX(0.2) translateX(-10px); }
}

/* ---------- SCREEN SHAKE (saat landing keras) ---------- */
.screen-shake{
  animation: shake 0.25s ease-in-out;
}

@keyframes shake{
  0%, 100% { transform: translate(0, 0); }
  20%      { transform: translate(-3px, 2px); }
  40%      { transform: translate(3px, -2px); }
  60%      { transform: translate(-2px, 1px); }
  80%      { transform: translate(2px, -1px); }
}

/* ---------- GLOW PULSE (saat charge lompat) ---------- */
.jump-charge-glow{
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255,215,0,0.2) 0%, transparent 70%);
  opacity: 0;
  pointer-events: none;
  z-index: 11;
}

.jump-charge-glow.active{
  animation: chargePulse 0.6s ease-in-out infinite alternate;
}

@keyframes chargePulse{
  0%   { opacity: 0.3; transform: translate(-50%, -50%) scale(0.8); }
  100% { opacity: 0.7; transform: translate(-50%, -50%) scale(1.3); }
}

/* ---------- RESPONSIVE SCALE ---------- */
@media (max-width: 600px){
  :root{ --jump-scale: 1.3; }
}
@media (min-width: 1025px){
  :root{ --jump-scale: 1.9; }
}
