/**
 * Voice & Sound Engine
 * Free Text-to-Speech (Web Speech API) with anime pitch tuning and lip-sync events.
 * Free Speech-to-Text (SpeechRecognition) for hands-free voice chat.
 * Web Audio API synthesizer for adorable sound effects & soothing ambient rain (100% free, zero external files!).
 */

export class VoiceEngine {
  constructor(options = {}) {
    this.options = options;
    this.synth = window.speechSynthesis || null;
    this.recognition = null;
    this.isListening = false;
    this.isSpeaking = false;
    this.voices = [];
    this.audioCtx = null;
    this.ambientSource = null;
    this.ambientGain = null;

    this.onMouthMove = options.onMouthMove || (() => {});
    this.onSpeechStart = options.onSpeechStart || (() => {});
    this.onSpeechEnd = options.onSpeechEnd || (() => {});

    this.initVoices();
    this.initSpeechRecognition();
  }

  // Ensure AudioContext is initialized on user interaction
  getAudioContext() {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  initVoices() {
    if (!this.synth) return;
    const loadVoices = () => {
      this.voices = this.synth.getVoices();
    };
    loadVoices();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = loadVoices;
    }
  }

  getAvailableVoices() {
    if (!this.synth) return [];
    if (!this.voices || this.voices.length === 0) {
      this.voices = this.synth.getVoices();
    }
    return this.voices;
  }

  getBestAnimeVoice(preferredName) {
    const list = this.getAvailableVoices();
    if (preferredName) {
      const found = list.find(v => v.name === preferredName);
      if (found) return found;
    }
    // Prefer clear female English or Japanese voices
    const candidates = [
      'Microsoft Zira',
      'Microsoft Jenny',
      'Google US English',
      'Google UK English Female',
      'Samantha',
      'Victoria',
      'Karen',
      'Kyoko',
      'Ayumi',
      'Nanami',
      'Haruka'
    ];
    for (const name of candidates) {
      const match = list.find(v => v.name.toLowerCase().includes(name.toLowerCase()));
      if (match) return match;
    }
    // Fallback: any female voice, or English voice
    const female = list.find(v => v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('girl'));
    if (female) return female;
    const en = list.find(v => v.lang.startsWith('en'));
    return en || list[0] || null;
  }

  speak(text, settings = {}, onDone = null) {
    if (!this.synth) {
      if (onDone) onDone();
      return;
    }

    this.stopSpeaking();

    // Clean text of markdown asterisks or code formatting for natural speech
    const cleanText = text
      .replace(/\[EMOTION:[^\]]+\]/gi, '')
      .replace(/\[ACTION:[^\]]+\]/gi, '')
      .replace(/[*_~`#]/g, '')
      .replace(/\(⁄[^\)]+⁄\)/g, '') // remove complex emoticon noise
      .replace(/\([^\)]*[\u3040-\u30ff\u4e00-\u9faf][^\)]*\)/g, '')
      .trim();

    if (!cleanText) {
      if (onDone) onDone();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voice = this.getBestAnimeVoice(settings.voiceName);
    if (voice) utterance.voice = voice;

    // Anime girl pitch and rate
    utterance.pitch = settings.voicePitch !== undefined ? settings.voicePitch : 1.25;
    utterance.rate = settings.voiceRate !== undefined ? settings.voiceRate : 1.05;
    utterance.volume = settings.voiceVolume !== undefined ? settings.voiceVolume : 1.0;

    let mouthInterval = null;

    utterance.onstart = () => {
      this.isSpeaking = true;
      this.onSpeechStart();
      // Lip sync flapping: alternate mouth states
      mouthInterval = setInterval(() => {
        const mouthOpen = Math.random() > 0.35;
        this.onMouthMove(mouthOpen);
      }, 120);
    };

    const cleanup = () => {
      if (mouthInterval) clearInterval(mouthInterval);
      this.isSpeaking = false;
      this.onMouthMove(false);
      this.onSpeechEnd();
      if (onDone) onDone();
    };

    utterance.onend = cleanup;
    utterance.onerror = (e) => {
      console.warn('Speech synthesis error', e);
      cleanup();
    };

    this.synth.speak(utterance);
  }

  stopSpeaking() {
    if (this.synth && this.synth.speaking) {
      this.synth.cancel();
      this.isSpeaking = false;
      this.onMouthMove(false);
      this.onSpeechEnd();
    }
  }

  initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.info('Speech recognition is not supported in this browser environment.');
      return;
    }
    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
    } catch (e) {
      console.warn('Could not initialize SpeechRecognition', e);
    }
  }

  startListening(onTranscript, onError, onEnd) {
    if (!this.recognition) {
      if (onError) onError('Voice recognition not supported in this browser. Please use Chrome, Edge, or Opera!');
      return;
    }
    if (this.isListening) {
      this.stopListening();
      return;
    }

    this.isListening = true;

    this.recognition.onresult = (event) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      if (onTranscript) onTranscript(final || interim, Boolean(final));
    };

    this.recognition.onerror = (err) => {
      console.warn('Recognition error:', err.error);
      this.isListening = false;
      if (onError) onError(err.error);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (onEnd) onEnd();
    };

    try {
      this.recognition.start();
    } catch (e) {
      this.isListening = false;
      if (onError) onError(e.message);
    }
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {}
      this.isListening = false;
    }
  }

  /* ================== SOUND EFFECTS (Web Audio API Synthesizer) ================== */

  playSound(type) {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      if (type === 'pop') {
        // Cute bubble pop
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.08);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.09);
      } else if (type === 'headpat') {
        // Soft warm melodic chime for headpat
        const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        freqs.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(f, now + idx * 0.04);
          gain.gain.setValueAtTime(0.15, now + idx * 0.04);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.04 + 0.25);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.04);
          osc.stop(now + idx * 0.04 + 0.26);
        });
      } else if (type === 'taskDone') {
        // Bright crystal bell
        [587.33, 880, 1174.66].forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now + idx * 0.06);
          gain.gain.setValueAtTime(0.2, now + idx * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.4);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.06);
          osc.stop(now + idx * 0.06 + 0.41);
        });
      } else if (type === 'levelUp') {
        // Joyful level up fanfare
        const notes = [440, 554.37, 659.25, 880, 1108.73, 1318.51];
        notes.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          const t = now + idx * 0.07;
          osc.frequency.setValueAtTime(f, t);
          gain.gain.setValueAtTime(0.25, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 0.36);
        });
      } else if (type === 'bell') {
        // Gentle alarm chime
        [659.25, 523.25, 659.25, 783.99].forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          const t = now + idx * 0.2;
          osc.frequency.setValueAtTime(f, t);
          gain.gain.setValueAtTime(0.25, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 0.61);
        });
      }
    } catch (e) {
      console.warn('Audio synthesis warning', e);
    }
  }

  /* ================== AMBIENT SOUND GENERATOR (Relaxing Rain & White Noise) ================== */

  startAmbient(type) {
    this.stopAmbient();
    if (type === 'none') return;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);

      // Pink/Brown noise generator for gentle soothing rain sound
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
        b6 = white * 0.115926;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      // Filter to simulate soft raindrops
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(type === 'rain' ? 800 : 500, ctx.currentTime);

      this.ambientGain = ctx.createGain();
      this.ambientGain.gain.setValueAtTime(0.08, ctx.currentTime);

      whiteNoise.connect(filter);
      filter.connect(this.ambientGain);
      this.ambientGain.connect(ctx.destination);

      whiteNoise.start(0);
      this.ambientSource = whiteNoise;
    } catch (e) {
      console.warn('Ambient noise error', e);
    }
  }

  stopAmbient() {
    if (this.ambientSource) {
      try {
        this.ambientSource.stop();
        this.ambientSource.disconnect();
      } catch (e) {}
      this.ambientSource = null;
    }
  }
}
