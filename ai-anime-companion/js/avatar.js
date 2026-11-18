/**
 * Anime Girl Avatar Controller & SVG Renderer
 * Implements:
 * - Expressive vector character geometry (hair, cat-ear headset, sparkles, accessories)
 * - Real-time lip-sync mouth flapping during TTS speech
 * - Smooth natural blinking & mouse cursor eye tracking
 * - 9 dynamic emotional states: happy, blush, caring, excited, thinking, pout, sleepy, sad, waving
 * - Interactive headpatting & cheek pinching mechanics with particle celebrations!
 */

export class AvatarRenderer {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) throw new Error(`Avatar container #${containerId} not found`);

    this.currentMood = 'happy';
    this.isSpeaking = false;
    this.mouthState = 'closed';
    this.blinkTimer = null;
    this.speechBubbleTimer = null;

    this.onHeadpatCallback = options.onHeadpat || (() => {});
    this.onCheekPokeCallback = options.onCheekPoke || (() => {});

    this.initDOM();
    this.startBlinkLoop();
    this.setupInteractivity();
    this.setupMouseTracking();
  }

  initDOM() {
    this.container.innerHTML = `
      <div class="avatar-halo"></div>
      <div class="headpat-hint">👋 Pet me!</div>
      <div class="avatar-speech-bubble" id="avatarSpeechBubble"></div>
      <div class="avatar-particles" id="avatarParticles"></div>

      <svg class="avatar-svg" id="avatarSvg" viewBox="0 0 400 500" preserveAspectRatio="xMidYMax meet">
        <defs>
          <!-- Gradients -->
          <linearGradient id="hairGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#f8bbd0" />
            <stop offset="50%" stop-color="#e1bee7" />
            <stop offset="100%" stop-color="#ba68c8" />
          </linearGradient>

          <linearGradient id="hairDarkGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#ce93d8" />
            <stop offset="100%" stop-color="#8e24aa" />
          </linearGradient>

          <linearGradient id="skinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#fff5f5" />
            <stop offset="100%" stop-color="#ffebee" />
          </linearGradient>

          <linearGradient id="eyeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#4a148c" />
            <stop offset="40%" stop-color="#7b1fa2" />
            <stop offset="80%" stop-color="#ab47bc" />
            <stop offset="100%" stop-color="#e1bee7" />
          </linearGradient>

          <linearGradient id="hoodieGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ffffff" />
            <stop offset="100%" stop-color="#f3e5f5" />
          </linearGradient>

          <linearGradient id="ribbonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ff4081" />
            <stop offset="100%" stop-color="#f50057" />
          </linearGradient>

          <!-- Headpat Target Area -->
          <clipPath id="headClip">
            <circle cx="200" cy="180" r="85" />
          </clipPath>
        </defs>

        <!-- Entire Character Group (Handles Idle Breathing) -->
        <g class="character-body-group" id="characterBody">

          <!-- 1. BACK HAIR (Twintails) -->
          <g id="hairBack">
            <!-- Left Twintail with sway -->
            <path class="hair-sway-left" d="M 120 180 C 80 200, 30 270, 50 380 C 60 410, 85 400, 80 360 C 70 300, 100 240, 130 200 Z" fill="url(#hairDarkGrad)" opacity="0.95" />
            <!-- Right Twintail with sway -->
            <path class="hair-sway-right" d="M 280 180 C 320 200, 370 270, 350 380 C 340 410, 315 400, 320 360 C 330 300, 300 240, 270 200 Z" fill="url(#hairDarkGrad)" opacity="0.95" />
            <!-- Back Hair Mass -->
            <path d="M 130 160 C 130 80, 270 80, 270 160 C 270 230, 130 230, 130 160 Z" fill="url(#hairDarkGrad)" />
          </g>

          <!-- 2. CAT EAR HEADSET (Behind head) -->
          <g id="headsetBack">
            <!-- Headband arc -->
            <path d="M 115 170 C 115 80, 285 80, 285 170" fill="none" stroke="#37474f" stroke-width="8" stroke-linecap="round" />
            <!-- Left Cat Ear Outer -->
            <polygon points="120,110 95,50 155,85" fill="#37474f" />
            <polygon points="122,105 102,58 148,87" fill="#ff80ab" />
            <!-- Left Cat Ear LED Glow -->
            <circle class="headset-led" cx="124" cy="85" r="4" fill="#00e5ff" />

            <!-- Right Cat Ear Outer -->
            <polygon points="280,110 305,50 245,85" fill="#37474f" />
            <polygon points="278,105 298,58 252,87" fill="#ff80ab" />
            <!-- Right Cat Ear LED Glow -->
            <circle class="headset-led" cx="276" cy="85" r="4" fill="#00e5ff" />
          </g>

          <!-- 3. BODY & OUTFIT -->
          <g id="bodyGroup">
            <!-- Neck -->
            <path d="M 188 260 L 188 295 C 188 300, 212 300, 212 295 L 212 260 Z" fill="#ffebee" />
            <!-- Neck shadow -->
            <path d="M 188 260 C 195 272, 205 272, 212 260 Z" fill="#f8bbd0" opacity="0.6" />

            <!-- Torso / Cozy Sailor Hoodie -->
            <path d="M 135 340 L 155 290 C 170 285, 230 285, 245 290 L 265 340 C 280 400, 285 500, 285 500 L 115 500 C 115 500, 120 400, 135 340 Z" fill="url(#hoodieGrad)" stroke="#e1bee7" stroke-width="2" />

            <!-- Sailor Collar -->
            <path d="M 155 290 L 180 345 L 200 325 L 220 345 L 245 290 C 220 285, 180 285, 155 290 Z" fill="#8e24aa" />
            <!-- Collar trim -->
            <path d="M 160 292 L 180 338 L 200 320 L 220 338 L 240 292" fill="none" stroke="#ffffff" stroke-width="2" />

            <!-- Cute Chest Ribbon Bow -->
            <g id="chestRibbon" transform="translate(200, 335)">
              <path d="M 0 0 C -25 -15, -35 10, -5 5 Z" fill="url(#ribbonGrad)" />
              <path d="M 0 0 C 25 -15, 35 10, 5 5 Z" fill="url(#ribbonGrad)" />
              <circle cx="0" cy="0" r="5" fill="#ffd54f" stroke="#ffb300" stroke-width="1.5" />
              <!-- Ribbon tails -->
              <path d="M -3 3 L -12 25 L -5 22 L 0 5" fill="url(#ribbonGrad)" />
              <path d="M 3 3 L 12 25 L 5 22 L 0 5" fill="url(#ribbonGrad)" />
            </g>

            <!-- Dynamic Arms / Poses -->
            <!-- Default Resting Arms -->
            <g id="armsResting">
              <path d="M 150 300 C 120 340, 130 420, 175 440 C 185 445, 190 435, 180 430 C 145 410, 140 350, 160 315 Z" fill="url(#hoodieGrad)" stroke="#e1bee7" stroke-width="1.5" />
              <path d="M 250 300 C 280 340, 270 420, 225 440 C 215 445, 210 435, 220 430 C 255 410, 260 350, 240 315 Z" fill="url(#hoodieGrad)" stroke="#e1bee7" stroke-width="1.5" />
              <!-- Hands clasped softly in front -->
              <ellipse cx="200" cy="440" rx="14" ry="10" fill="#ffebee" />
            </g>

            <!-- Waving Arm (Triggered when mood == 'waving') -->
            <g id="armWaving" class="arm-waving" style="display: none;">
              <!-- Right arm raised waving -->
              <path d="M 250 295 C 280 280, 310 240, 320 200 C 325 180, 340 190, 335 210 C 320 250, 290 310, 260 325 Z" fill="url(#hoodieGrad)" stroke="#e1bee7" stroke-width="1.5" />
              <!-- Hand with palm open -->
              <circle cx="325" cy="190" r="12" fill="#ffebee" />
              <circle cx="335" cy="182" r="4" fill="#ffebee" />
            </g>

            <!-- Cheering / Fists Pumped (Triggered when mood == 'excited') -->
            <g id="armsCheering" class="arm-cheering" style="display: none;">
              <path d="M 145 300 C 110 270, 95 230, 110 190 C 115 180, 130 185, 128 200 C 118 230, 130 265, 160 290 Z" fill="url(#hoodieGrad)" />
              <circle cx="112" cy="185" r="10" fill="#ffebee" />
              <path d="M 255 300 C 290 270, 305 230, 290 190 C 285 180, 270 185, 272 200 C 282 230, 270 265, 240 290 Z" fill="url(#hoodieGrad)" />
              <circle cx="288" cy="185" r="10" fill="#ffebee" />
            </g>
          </g>

          <!-- 4. HEAD & FACE -->
          <g id="headGroup">
            <!-- Head Base Shape -->
            <path id="faceBase" d="M 130 180 C 130 255, 160 285, 200 285 C 240 285, 270 255, 270 180 C 270 115, 130 115, 130 180 Z" fill="url(#skinGrad)" />

            <!-- Ears -->
            <path d="M 128 190 C 118 190, 118 215, 128 215 Z" fill="#ffebee" />
            <path d="M 272 190 C 282 190, 282 215, 272 215 Z" fill="#ffebee" />

            <!-- Headset Ear Cushions -->
            <rect x="110" y="175" width="16" height="40" rx="8" fill="#37474f" />
            <circle cx="118" cy="195" r="4" fill="#00e5ff" class="headset-led" />
            <rect x="274" y="175" width="16" height="40" rx="8" fill="#37474f" />
            <circle cx="282" cy="195" r="4" fill="#00e5ff" class="headset-led" />

            <!-- Nose -->
            <circle cx="200" cy="242" r="1.5" fill="#f48fb1" opacity="0.8" />

            <!-- Cheeks Blush Patches (Interactive / Clickable for cheek poke!) -->
            <g id="cheekPatches" cursor="pointer">
              <!-- Left Cheek -->
              <ellipse id="blushLeft" class="blush-patch" cx="152" cy="242" rx="15" ry="8" fill="#ff4081" />
              <!-- Right Cheek -->
              <ellipse id="blushRight" class="blush-patch" cx="248" cy="242" rx="15" ry="8" fill="#ff4081" />
              <!-- Manga Blush Slanted Lines -->
              <g id="blushLines" class="blush-lines">
                <line x1="145" y1="239" x2="149" y2="245" stroke="#e91e63" stroke-width="1.8" stroke-linecap="round" />
                <line x1="151" y1="239" x2="155" y2="245" stroke="#e91e63" stroke-width="1.8" stroke-linecap="round" />
                <line x1="157" y1="239" x2="161" y2="245" stroke="#e91e63" stroke-width="1.8" stroke-linecap="round" />
                <line x1="241" y1="239" x2="245" y2="245" stroke="#e91e63" stroke-width="1.8" stroke-linecap="round" />
                <line x1="247" y1="239" x2="251" y2="245" stroke="#e91e63" stroke-width="1.8" stroke-linecap="round" />
                <line x1="253" y1="239" x2="257" y2="245" stroke="#e91e63" stroke-width="1.8" stroke-linecap="round" />
              </g>
            </g>

            <!-- Dynamic Eyebrows -->
            <g id="eyebrows">
              <!-- Left Eyebrow -->
              <path id="eyebrowLeft" d="M 150 188 Q 165 182 180 188" fill="none" stroke="#ba68c8" stroke-width="2.8" stroke-linecap="round" />
              <!-- Right Eyebrow -->
              <path id="eyebrowRight" d="M 220 188 Q 235 182 250 188" fill="none" stroke="#ba68c8" stroke-width="2.8" stroke-linecap="round" />
            </g>

            <!-- EYES (LEFT & RIGHT) -->
            <g id="eyesContainer">
              <!-- Left Eye -->
              <g id="leftEyeGroup" transform="translate(165, 210)">
                <!-- Eye Sclera (White base) -->
                <path d="M -18 0 C -18 -12, 18 -12, 18 0 C 18 14, -18 14, -18 0 Z" fill="#ffffff" />
                <!-- Iris with Mouse Follower -->
                <g id="leftIrisGroup">
                  <ellipse cx="0" cy="1" rx="14" ry="14" fill="url(#eyeGrad)" />
                  <ellipse cx="0" cy="3" rx="8" ry="8" fill="#311b92" />
                  <!-- Big Sparkle Highlight -->
                  <circle cx="-4" cy="-3" r="4.5" fill="#ffffff" />
                  <!-- Small Secondary Sparkle -->
                  <circle cx="5" cy="5" r="2" fill="#ffffff" opacity="0.9" />
                  <circle cx="-5" cy="6" r="1.5" fill="#e1bee7" />
                </g>
                <!-- Upper Eyelash / Anime Liner -->
                <path d="M -22 -2 Q 0 -16 22 -2" fill="none" stroke="#263238" stroke-width="3.5" stroke-linecap="round" />
                <path d="M 18 -5 L 24 -9" stroke="#263238" stroke-width="2.5" stroke-linecap="round" />
                <!-- Dynamic Eyelid for Blinking -->
                <path id="leftEyelid" class="eyelids" d="M -22 -15 Q 0 -18 22 -15 L 22 18 Q 0 18 -22 18 Z" fill="#ffebee" />
                <!-- Closed Happy Eye Arc (Hidden by default) -->
                <path id="leftHappyEye" d="M -18 2 Q 0 -10 18 2" fill="none" stroke="#263238" stroke-width="3.5" stroke-linecap="round" style="display: none;" />
              </g>

              <!-- Right Eye -->
              <g id="rightEyeGroup" transform="translate(235, 210)">
                <!-- Eye Sclera (White base) -->
                <path d="M -18 0 C -18 -12, 18 -12, 18 0 C 18 14, -18 14, -18 0 Z" fill="#ffffff" />
                <!-- Iris with Mouse Follower -->
                <g id="rightIrisGroup">
                  <ellipse cx="0" cy="1" rx="14" ry="14" fill="url(#eyeGrad)" />
                  <ellipse cx="0" cy="3" rx="8" ry="8" fill="#311b92" />
                  <!-- Big Sparkle Highlight -->
                  <circle cx="-4" cy="-3" r="4.5" fill="#ffffff" />
                  <!-- Small Secondary Sparkle -->
                  <circle cx="5" cy="5" r="2" fill="#ffffff" opacity="0.9" />
                  <circle cx="-5" cy="6" r="1.5" fill="#e1bee7" />
                </g>
                <!-- Upper Eyelash / Anime Liner -->
                <path d="M -22 -2 Q 0 -16 22 -2" fill="none" stroke="#263238" stroke-width="3.5" stroke-linecap="round" />
                <path d="M 18 -5 L 24 -9" stroke="#263238" stroke-width="2.5" stroke-linecap="round" />
                <!-- Dynamic Eyelid for Blinking -->
                <path id="rightEyelid" class="eyelids" d="M -22 -15 Q 0 -18 22 -15 L 22 18 Q 0 18 -22 18 Z" fill="#ffebee" />
                <!-- Closed Happy Eye Arc (Hidden by default) -->
                <path id="rightHappyEye" d="M -18 2 Q 0 -10 18 2" fill="none" stroke="#263238" stroke-width="3.5" stroke-linecap="round" style="display: none;" />
              </g>
            </g>

            <!-- DYNAMIC MOUTH (Morphs for expressions & lipsync) -->
            <g id="mouthGroup">
              <!-- Default Smile -->
              <path id="avatarMouth" class="mouth-path" d="M 191 264 Q 200 272 209 264" fill="none" stroke="#d81b60" stroke-width="2.5" stroke-linecap="round" />
            </g>
          </g>

          <!-- 5. FRONT HAIR & BANGS (Layered over face) -->
          <g id="hairFront">
            <!-- Center Bangs -->
            <path d="M 180 130 C 185 180, 195 210, 200 215 C 205 210, 215 180, 220 130 Z" fill="url(#hairGrad)" />
            <!-- Left Bangs -->
            <path d="M 140 135 C 145 185, 160 215, 175 220 C 170 190, 165 160, 155 135 Z" fill="url(#hairGrad)" />
            <path d="M 125 150 C 125 210, 135 250, 142 255 C 138 230, 135 190, 132 155 Z" fill="url(#hairDarkGrad)" />
            <!-- Right Bangs -->
            <path d="M 260 135 C 255 185, 240 215, 225 220 C 230 190, 235 160, 245 135 Z" fill="url(#hairGrad)" />
            <path d="M 275 150 C 275 210, 265 250, 258 255 C 262 230, 265 190, 268 155 Z" fill="url(#hairDarkGrad)" />
            <!-- Forehead Hair Arch -->
            <path d="M 130 160 C 140 125, 260 125, 270 160 C 275 130, 250 90, 200 90 C 150 90, 125 130, 130 160 Z" fill="url(#hairGrad)" />
            <!-- Hair Gloss/Sheen Ring -->
            <path d="M 145 138 Q 200 126 255 138" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity="0.65" />

            <!-- Twintail Hair Ties / Ribbons -->
            <circle cx="120" cy="175" r="7" fill="#ff4081" />
            <circle cx="280" cy="175" r="7" fill="#ff4081" />
          </g>

          <!-- 6. EMOTIONAL OVERLAYS (Sweatdrop, Tear, Anger mark) -->
          <g id="emotionOverlays">
            <!-- Sweatdrop (for nervous / embarrassed) -->
            <path id="sweatDrop" d="M 265 170 C 260 178, 260 188, 265 190 C 270 188, 270 178, 265 170 Z" fill="#4fc3f7" opacity="0" />
            <!-- Tear Drop (for sad) -->
            <circle id="tearDrop" cx="178" cy="235" r="3.5" fill="#4fc3f7" opacity="0" />
          </g>

          <!-- 7. INVISIBLE HEADPAT DETECTOR (Covers top of hair) -->
          <ellipse id="headpatHitbox" cx="200" cy="140" rx="75" ry="50" fill="transparent" cursor="grab" />
        </g>
      </svg>

      <div class="avatar-mood-badge" id="avatarMoodBadge">
        <span class="avatar-mood-dot"></span>
        <span id="avatarMoodText">Feeling: Happy & Cheerful 🌸</span>
      </div>
    `;

    // Cache elements
    this.mouthEl = document.getElementById('avatarMouth');
    this.blushLeftEl = document.getElementById('blushLeft');
    this.blushRightEl = document.getElementById('blushRight');
    this.blushLinesEl = document.getElementById('blushLines');
    this.eyebrowLeftEl = document.getElementById('eyebrowLeft');
    this.eyebrowRightEl = document.getElementById('eyebrowRight');
    this.leftEyelidEl = document.getElementById('leftEyelid');
    this.rightEyelidEl = document.getElementById('rightEyelid');
    this.leftHappyEyeEl = document.getElementById('leftHappyEye');
    this.rightHappyEyeEl = document.getElementById('rightHappyEye');
    this.leftIrisGroup = document.getElementById('leftIrisGroup');
    this.rightIrisGroup = document.getElementById('rightIrisGroup');
    this.sweatDropEl = document.getElementById('sweatDrop');
    this.tearDropEl = document.getElementById('tearDrop');
    this.armWavingEl = document.getElementById('armWaving');
    this.armsCheeringEl = document.getElementById('armsCheering');
    this.armsRestingEl = document.getElementById('armsResting');
    this.speechBubbleEl = document.getElementById('avatarSpeechBubble');
    this.particlesContainer = document.getElementById('avatarParticles');
    this.moodTextEl = document.getElementById('avatarMoodText');
    this.headpatHitbox = document.getElementById('headpatHitbox');
    this.cheekPatches = document.getElementById('cheekPatches');
  }

  /* ================== EMOTIONAL STATES ================== */

  setMood(mood) {
    this.currentMood = mood.toLowerCase();
    this.resetFaceFeatures();

    const moodBadges = {
      happy: 'Feeling: Happy & Cheerful 🌸',
      blush: 'Feeling: Shy & Warmly Flustered (⁄ ⁄•⁄ω⁄•⁄ ⁄)',
      caring: 'Feeling: Caring & By Your Side 🕊️',
      excited: 'Feeling: Super Excited & Pumped! ✨',
      thinking: 'Feeling: Thinking & Pondering 💭',
      pout: 'Feeling: Pouting Playfully >3<',
      sleepy: 'Feeling: Cozy & Sleepy 🌙',
      sad: 'Feeling: Empathizing Deeply 💧',
      waving: 'Feeling: Greeting You Warmly! 👋'
    };

    if (this.moodTextEl) {
      this.moodTextEl.textContent = moodBadges[this.currentMood] || 'Feeling: Happy & Peaceful 🌸';
    }

    switch (this.currentMood) {
      case 'blush':
        this.blushLeftEl.classList.add('high');
        this.blushRightEl.classList.add('high');
        this.blushLinesEl.classList.add('visible');
        this.setMouthShape('small_smile');
        this.setEyebrows('soft');
        this.spawnParticles('heart', 4);
        break;

      case 'excited':
        this.blushLeftEl.classList.add('high');
        this.blushRightEl.classList.add('high');
        this.setMouthShape('open_smile');
        this.setEyebrows('raised');
        this.armWavingEl.style.display = 'none';
        this.armsCheeringEl.style.display = 'block';
        this.armsRestingEl.style.display = 'none';
        this.spawnParticles('star', 5);
        break;

      case 'caring':
        this.blushLeftEl.classList.remove('high');
        this.blushRightEl.classList.remove('high');
        this.blushLinesEl.classList.remove('visible');
        this.setMouthShape('gentle_smile');
        this.setEyebrows('caring');
        this.spawnParticles('heart', 2);
        break;

      case 'thinking':
        this.setMouthShape('cat');
        this.setEyebrows('thinking');
        break;

      case 'pout':
        this.blushLeftEl.classList.add('high');
        this.blushRightEl.classList.add('high');
        this.setMouthShape('pout');
        this.setEyebrows('furrowed');
        break;

      case 'sleepy':
        this.setMouthShape('small_flat');
        this.setEyebrows('soft');
        this.leftEyelidEl.style.transform = 'scaleY(0.65)';
        this.rightEyelidEl.style.transform = 'scaleY(0.65)';
        this.spawnParticles('zzz', 3);
        break;

      case 'sad':
        this.tearDropEl.style.opacity = '0.9';
        this.setMouthShape('sad');
        this.setEyebrows('sad');
        this.spawnParticles('rain', 3);
        break;

      case 'waving':
        this.armWavingEl.style.display = 'block';
        this.armsCheeringEl.style.display = 'none';
        this.armsRestingEl.style.display = 'none';
        this.setMouthShape('open_smile');
        this.setEyebrows('happy');
        break;

      case 'happy':
      default:
        this.setMouthShape('smile');
        this.setEyebrows('happy');
        break;
    }
  }

  resetFaceFeatures() {
    this.blushLeftEl.classList.remove('high');
    this.blushRightEl.classList.remove('high');
    this.blushLinesEl.classList.remove('visible');
    this.sweatDropEl.style.opacity = '0';
    this.tearDropEl.style.opacity = '0';
    this.armWavingEl.style.display = 'none';
    this.armsCheeringEl.style.display = 'none';
    this.armsRestingEl.style.display = 'block';
    this.leftEyelidEl.style.transform = 'scaleY(0)';
    this.rightEyelidEl.style.transform = 'scaleY(0)';
    this.leftHappyEyeEl.style.display = 'none';
    this.rightHappyEyeEl.style.display = 'none';
  }

  /* ================== EYEBROWS & MOUTH ================== */

  setEyebrows(style) {
    switch (style) {
      case 'caring':
      case 'sad':
        this.eyebrowLeftEl.setAttribute('d', 'M 150 184 Q 165 190 180 186');
        this.eyebrowRightEl.setAttribute('d', 'M 220 186 Q 235 190 250 184');
        break;
      case 'raised':
        this.eyebrowLeftEl.setAttribute('d', 'M 150 180 Q 165 174 180 180');
        this.eyebrowRightEl.setAttribute('d', 'M 220 180 Q 235 174 250 180');
        break;
      case 'furrowed':
        this.eyebrowLeftEl.setAttribute('d', 'M 150 190 Q 165 186 180 182');
        this.eyebrowRightEl.setAttribute('d', 'M 220 182 Q 235 186 250 190');
        break;
      case 'thinking':
        this.eyebrowLeftEl.setAttribute('d', 'M 150 182 Q 165 178 180 184');
        this.eyebrowRightEl.setAttribute('d', 'M 220 188 Q 235 186 250 188');
        break;
      case 'soft':
      case 'happy':
      default:
        this.eyebrowLeftEl.setAttribute('d', 'M 150 188 Q 165 182 180 188');
        this.eyebrowRightEl.setAttribute('d', 'M 220 188 Q 235 182 250 188');
        break;
    }
  }

  setMouthShape(shape) {
    const shapes = {
      smile: 'M 191 264 Q 200 272 209 264',
      small_smile: 'M 193 265 Q 200 270 207 265',
      gentle_smile: 'M 192 264 Q 200 271 208 264',
      open_smile: 'M 190 263 Q 200 278 210 263 Z',
      talk_open: 'M 191 263 Q 200 276 209 263 Z',
      talk_wide: 'M 189 262 Q 200 282 211 262 Z',
      pout: 'M 192 268 Q 196 264 200 268 Q 204 264 208 268',
      cat: 'M 191 267 Q 196 263 200 267 Q 204 263 209 267',
      sad: 'M 192 271 Q 200 265 208 271',
      small_flat: 'M 194 267 L 206 267'
    };
    if (this.mouthEl) {
      this.mouthEl.setAttribute('d', shapes[shape] || shapes.smile);
      if (shape.includes('open') || shape.includes('talk')) {
        this.mouthEl.setAttribute('fill', '#d81b60');
      } else {
        this.mouthEl.setAttribute('fill', 'none');
      }
    }
  }

  /* ================== REAL-TIME LIP-SYNC ================== */

  setMouthOpen(isOpen) {
    if (isOpen) {
      this.setMouthShape(Math.random() > 0.5 ? 'talk_open' : 'talk_wide');
    } else {
      // Revert to current mood's natural resting mouth
      switch (this.currentMood) {
        case 'excited': this.setMouthShape('open_smile'); break;
        case 'pout': this.setMouthShape('pout'); break;
        case 'thinking': this.setMouthShape('cat'); break;
        case 'sad': this.setMouthShape('sad'); break;
        default: this.setMouthShape('smile'); break;
      }
    }
  }

  /* ================== NATURAL BLINKING LOOP ================== */

  startBlinkLoop() {
    const nextBlink = () => {
      const delay = Math.random() * 3000 + 2500; // blink every 2.5 - 5.5s
      this.blinkTimer = setTimeout(() => {
        this.triggerBlink(() => {
          // 20% chance of an adorable double-blink!
          if (Math.random() < 0.2) {
            setTimeout(() => this.triggerBlink(nextBlink), 180);
          } else {
            nextBlink();
          }
        });
      }, delay);
    };
    nextBlink();
  }

  triggerBlink(onDone) {
    if (this.currentMood === 'sleepy') {
      if (onDone) onDone();
      return;
    }
    this.leftEyelidEl.style.transform = 'scaleY(1)';
    this.rightEyelidEl.style.transform = 'scaleY(1)';
    setTimeout(() => {
      this.leftEyelidEl.style.transform = 'scaleY(0)';
      this.rightEyelidEl.style.transform = 'scaleY(0)';
      if (onDone) onDone();
    }, 140);
  }

  /* ================== MOUSE CURSOR EYE TRACKING ================== */

  setupMouseTracking() {
    window.addEventListener('mousemove', (e) => {
      if (!this.container) return;
      const rect = this.container.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height * 0.45;

      const dx = (e.clientX - centerX) / (window.innerWidth / 2);
      const dy = (e.clientY - centerY) / (window.innerHeight / 2);

      // Clamp pupil displacement to stay naturally inside eye
      const maxOffset = 3.5;
      const pupilX = Math.max(-maxOffset, Math.min(maxOffset, dx * maxOffset));
      const pupilY = Math.max(-maxOffset, Math.min(maxOffset, dy * maxOffset));

      if (this.leftIrisGroup && this.rightIrisGroup) {
        this.leftIrisGroup.setAttribute('transform', `translate(${pupilX}, ${pupilY})`);
        this.rightIrisGroup.setAttribute('transform', `translate(${pupilX}, ${pupilY})`);
      }
    });
  }

  /* ================== INTERACTIVITY (Headpats & Pokes) ================== */

  setupInteractivity() {
    // 1. Headpat Hitbox Click / Drag
    if (this.headpatHitbox) {
      this.headpatHitbox.addEventListener('click', (e) => {
        e.stopPropagation();
        this.performHeadpat();
      });
    }

    // 2. Cheek Poke
    if (this.cheekPatches) {
      this.cheekPatches.addEventListener('click', (e) => {
        e.stopPropagation();
        this.performCheekPoke();
      });
    }
  }

  performHeadpat() {
    // Happy closed eyes `⌒ ⌒`
    this.leftEyelidEl.style.transform = 'scaleY(0)';
    this.rightEyelidEl.style.transform = 'scaleY(0)';
    this.leftHappyEyeEl.style.display = 'block';
    this.rightHappyEyeEl.style.display = 'block';

    // Intense blush
    this.blushLeftEl.classList.add('high');
    this.blushRightEl.classList.add('high');
    this.blushLinesEl.classList.add('visible');
    this.setMouthShape('small_smile');

    // Float heart icon over head
    const heart = document.createElement('div');
    heart.className = 'headpat-indicator';
    heart.textContent = '💖';
    heart.style.left = '50%';
    heart.style.transform = 'translateX(-50%)';
    this.container.appendChild(heart);
    setTimeout(() => heart.remove(), 1200);

    this.spawnParticles('heart', 6);

    // Revert expression after 1.8s
    setTimeout(() => {
      this.leftHappyEyeEl.style.display = 'none';
      this.rightHappyEyeEl.style.display = 'none';
      this.setMood(this.currentMood);
    }, 1800);

    if (this.onHeadpatCallback) {
      this.onHeadpatCallback();
    }
  }

  performCheekPoke() {
    this.setMood('pout');
    this.spawnParticles('star', 3);
    if (this.onCheekPokeCallback) {
      this.onCheekPokeCallback();
    }
  }

  /* ================== SPEECH BUBBLE & PARTICLES ================== */

  showSpeechBubble(text, duration = 4000) {
    if (!this.speechBubbleEl) return;
    if (this.speechBubbleTimer) clearTimeout(this.speechBubbleTimer);

    // Strip markdown formatting for cleaner bubble appearance
    const cleanText = text
      .replace(/\[EMOTION:[^\]]+\]/gi, '')
      .replace(/\[ACTION:[^\]]+\]/gi, '')
      .replace(/[*_~`#]/g, '')
      .trim();

    // Show first sentence or max 120 chars in bubble
    const snippet = cleanText.length > 120 ? cleanText.slice(0, 117) + '...' : cleanText;
    this.speechBubbleEl.textContent = snippet;
    this.speechBubbleEl.classList.add('visible');

    this.speechBubbleTimer = setTimeout(() => {
      this.speechBubbleEl.classList.remove('visible');
    }, duration);
  }

  spawnParticles(type, count = 4) {
    if (!this.particlesContainer) return;
    const icons = {
      heart: ['💖', '💕', '🌸', '✨'],
      star: ['⭐', '✨', '🌟', '💫'],
      rain: ['💧', '🌧️', '🌧️'],
      zzz: ['💤', 'z', 'Z']
    };

    const list = icons[type] || icons.heart;

    for (let i = 0; i < count; i++) {
      const p = document.createElement('span');
      p.className = 'particle';
      p.textContent = list[Math.floor(Math.random() * list.length)];
      p.style.left = `${30 + Math.random() * 40}%`;
      p.style.top = `${40 + Math.random() * 30}%`;
      p.style.fontSize = `${1.1 + Math.random() * 0.8}rem`;
      p.style.animationDelay = `${i * 0.15}s`;
      this.particlesContainer.appendChild(p);

      setTimeout(() => p.remove(), 2200);
    }
  }
}
