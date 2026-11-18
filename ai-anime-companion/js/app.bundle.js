/**
 * Kokoro AI - Robust Unified Application Bundle
 * Built with full fallback for localStorage, safe Web Audio, and delegated document-level event handlers.
 * 100% compatible with file:/// and http:// in all modern browsers (Opera GX, Chrome, Edge).
 */

(function () {
  'use strict';

  // Global Error Handler for graceful recovery and user visibility
  window.addEventListener('error', function (e) {
    console.error('Kokoro AI Error:', e.error || e.message);
    const banner = document.getElementById('appNoticeBanner');
    if (banner) {
      banner.style.display = 'block';
      banner.textContent = 'Notice: Voice or storage may be restricted in local file mode. (All chat and features are still working!)';
    }
  });

  /* ==========================================================================
     1. SAFE STORAGE (Falls back to in-memory store if localStorage is blocked)
     ========================================================================== */

  const memoryStore = {};
  let storageAvailable = false;

  try {
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    storageAvailable = true;
  } catch (e) {
    storageAvailable = false;
    console.info('LocalStorage unavailable on file:// origin. Using safe in-memory fallback.');
  }

  const SafeStorage = {
    getItem(key) {
      if (storageAvailable) {
        try { return window.localStorage.getItem(key); } catch (e) {}
      }
      return memoryStore[key] || null;
    },
    setItem(key, value) {
      if (storageAvailable) {
        try { window.localStorage.setItem(key, value); return; } catch (e) {}
      }
      memoryStore[key] = value;
    }
  };

  const STORAGE_KEYS = {
    SETTINGS: 'kokoro_settings',
    PROFILE: 'kokoro_profile',
    BOND: 'kokoro_bond',
    TASKS: 'kokoro_tasks',
    NOTES: 'kokoro_notes',
    MOODS: 'kokoro_moods',
    CHATS: 'kokoro_chats',
    MEMORIES: 'kokoro_memories'
  };

  const DEFAULT_SETTINGS = {
    aiMode: 'builtin',
    geminiKey: '',
    groqKey: '',
    voiceEnabled: true,
    voicePitch: 1.25,
    voiceRate: 1.05,
    voiceVolume: 1.0,
    voiceName: '',
    soundFxEnabled: true,
    theme: 'sakura',
    ambientSound: 'none'
  };

  const DEFAULT_PROFILE = {
    userName: 'Friend',
    botName: 'Aoi',
    botPersona: 'caring'
  };

  const LEVEL_TITLES = [
    { level: 1, minAffection: 0, title: 'New Acquaintance' },
    { level: 2, minAffection: 100, title: 'Friendly Companion' },
    { level: 3, minAffection: 250, title: 'Close Confidant' },
    { level: 4, minAffection: 450, title: 'Trusted Friend' },
    { level: 5, minAffection: 700, title: 'Best Friend' },
    { level: 6, minAffection: 1050, title: 'Cherished Partner' },
    { level: 7, minAffection: 1500, title: 'Inseparable Soul' },
    { level: 8, minAffection: 2100, title: 'Beloved Angel' },
    { level: 9, minAffection: 2900, title: 'Eternal Bond' },
    { level: 10, minAffection: 4000, title: 'Soulmate Forever 💖' }
  ];

  const Storage = {
    getSettings() {
      const data = SafeStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (!data) return { ...DEFAULT_SETTINGS };
      try { return { ...DEFAULT_SETTINGS, ...JSON.parse(data) }; } catch (e) { return { ...DEFAULT_SETTINGS }; }
    },
    saveSettings(settings) {
      const merged = { ...this.getSettings(), ...settings };
      SafeStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(merged));
      return merged;
    },
    getProfile() {
      const data = SafeStorage.getItem(STORAGE_KEYS.PROFILE);
      if (!data) return { ...DEFAULT_PROFILE };
      try { return { ...DEFAULT_PROFILE, ...JSON.parse(data) }; } catch (e) { return { ...DEFAULT_PROFILE }; }
    },
    saveProfile(profile) {
      const merged = { ...this.getProfile(), ...profile };
      SafeStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(merged));
      return merged;
    },
    getBond() {
      const data = SafeStorage.getItem(STORAGE_KEYS.BOND);
      if (data) {
        try { return JSON.parse(data); } catch (e) {}
      }
      return { affection: 20, level: 1, title: LEVEL_TITLES[0].title, headpats: 0, messagesCount: 0, tasksCompleted: 0 };
    },
    addAffection(amount, reason) {
      const bond = this.getBond();
      bond.affection = Math.max(0, bond.affection + amount);
      if (reason === 'message') bond.messagesCount = (bond.messagesCount || 0) + 1;
      if (reason === 'task') bond.tasksCompleted = (bond.tasksCompleted || 0) + 1;
      if (reason === 'headpat') bond.headpats = (bond.headpats || 0) + 1;

      let currentLevel = 1;
      let currentTitle = LEVEL_TITLES[0].title;
      for (let i = 0; i < LEVEL_TITLES.length; i++) {
        if (bond.affection >= LEVEL_TITLES[i].minAffection) {
          currentLevel = LEVEL_TITLES[i].level;
          currentTitle = LEVEL_TITLES[i].title;
        }
      }

      const leveledUp = currentLevel > bond.level;
      bond.level = currentLevel;
      bond.title = currentTitle;
      SafeStorage.setItem(STORAGE_KEYS.BOND, JSON.stringify(bond));
      return { bond: bond, leveledUp: leveledUp };
    },
    getTasks() {
      const data = SafeStorage.getItem(STORAGE_KEYS.TASKS);
      if (data) {
        try { return JSON.parse(data); } catch (e) {}
      }
      return [
        { id: '1', text: 'Drink a glass of fresh water 💧', completed: false },
        { id: '2', text: 'Take 3 deep breaths and relax your shoulders ✨', completed: false }
      ];
    },
    saveTasks(tasks) {
      SafeStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    },
    addTask(text) {
      const tasks = this.getTasks();
      const newTask = { id: String(Date.now()), text: text.trim(), completed: false };
      tasks.unshift(newTask);
      this.saveTasks(tasks);
      return newTask;
    },
    toggleTask(id) {
      const tasks = this.getTasks();
      let justCompleted = false;
      const updated = tasks.map(function (t) {
        if (t.id === id) {
          if (!t.completed) justCompleted = true;
          return { id: t.id, text: t.text, completed: !t.completed };
        }
        return t;
      });
      this.saveTasks(updated);
      if (justCompleted) this.addAffection(15, 'task');
      return { tasks: updated, justCompleted: justCompleted };
    },
    deleteTask(id) {
      const tasks = this.getTasks().filter(function (t) { return t.id !== id; });
      this.saveTasks(tasks);
      return tasks;
    },
    getNotes() {
      const data = SafeStorage.getItem(STORAGE_KEYS.NOTES);
      if (data) {
        try { return JSON.parse(data); } catch (e) {}
      }
      return [{ id: '1', text: 'Aoi loves hearing all your thoughts and stories!' }];
    },
    addNote(text) {
      const notes = this.getNotes();
      const newNote = { id: String(Date.now()), text: text.trim() };
      notes.unshift(newNote);
      SafeStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes));
      return newNote;
    },
    deleteNote(id) {
      const notes = this.getNotes().filter(function (n) { return n.id !== id; });
      SafeStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes));
      return notes;
    },
    getMoods() {
      const data = SafeStorage.getItem(STORAGE_KEYS.MOODS);
      if (data) {
        try { return JSON.parse(data); } catch (e) {}
      }
      return [];
    },
    logMood(mood) {
      const moods = this.getMoods();
      moods.unshift({ id: String(Date.now()), mood: mood, timestamp: Date.now() });
      if (moods.length > 30) moods.pop();
      SafeStorage.setItem(STORAGE_KEYS.MOODS, JSON.stringify(moods));
    },
    getChats() {
      const data = SafeStorage.getItem(STORAGE_KEYS.CHATS);
      if (data) {
        try { return JSON.parse(data); } catch (e) {}
      }
      return [];
    },
    saveChats(chats) {
      SafeStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(chats.slice(-80)));
    },
    getMemories() {
      const data = SafeStorage.getItem(STORAGE_KEYS.MEMORIES);
      if (data) {
        try { return JSON.parse(data); } catch (e) {}
      }
      return [
        { id: '1', fact: 'Loves spending cozy, peaceful moments together 🌸' }
      ];
    },
    deleteMemory(id) {
      const memories = this.getMemories().filter(function (m) { return m.id !== id; });
      SafeStorage.setItem(STORAGE_KEYS.MEMORIES, JSON.stringify(memories));
      return memories;
    }
  };

  /* ==========================================================================
     2. VOICE & AUDIO ENGINE (Defensive AudioContext & Speech)
     ========================================================================== */

  class VoiceEngine {
    constructor(callbacks) {
      this.callbacks = callbacks || {};
      this.synth = window.speechSynthesis || null;
      this.recognition = null;
      this.isListening = false;
      this.audioCtx = null;
      this.ambientSource = null;
      this.initVoices();
      this.initSpeechRecognition();
    }

    getAudioContext() {
      if (!this.audioCtx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          try { this.audioCtx = new AudioCtx(); } catch (e) {}
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        try { this.audioCtx.resume(); } catch (e) {}
      }
      return this.audioCtx;
    }

    initVoices() {
      if (!this.synth) return;
      try {
        this.voices = this.synth.getVoices();
        if (this.synth.onvoiceschanged !== undefined) {
          this.synth.onvoiceschanged = () => {
            try { this.voices = this.synth.getVoices(); } catch (e) {}
          };
        }
      } catch (e) {}
    }

    getBestVoice(preferredName) {
      if (!this.voices || this.voices.length === 0) {
        try { this.voices = this.synth ? this.synth.getVoices() : []; } catch (e) {}
      }
      if (!this.voices) return null;

      if (preferredName) {
        const found = this.voices.find(v => v.name === preferredName);
        if (found) return found;
      }
      const candidates = ['Zira', 'Jenny', 'Google US English', 'Samantha', 'Victoria', 'Female', 'en-US'];
      for (let i = 0; i < candidates.length; i++) {
        const match = this.voices.find(v => (v.name + ' ' + v.lang).toLowerCase().includes(candidates[i].toLowerCase()));
        if (match) return match;
      }
      return this.voices[0] || null;
    }

    speak(text, settings, onDone) {
      if (!this.synth) { if (onDone) onDone(); return; }
      this.stopSpeaking();

      const cleanText = text
        .replace(/\[EMOTION:[^\]]+\]/gi, '')
        .replace(/\[ACTION:[^\]]+\]/gi, '')
        .replace(/[*_~`#]/g, '')
        .trim();

      if (!cleanText) { if (onDone) onDone(); return; }

      try {
        const utter = new SpeechSynthesisUtterance(cleanText);
        const voice = this.getBestVoice(settings ? settings.voiceName : '');
        if (voice) utter.voice = voice;

        utter.pitch = settings && settings.voicePitch !== undefined ? settings.voicePitch : 1.25;
        utter.rate = settings && settings.voiceRate !== undefined ? settings.voiceRate : 1.05;

        let mouthInterval = null;
        utter.onstart = () => {
          if (this.callbacks.onSpeechStart) this.callbacks.onSpeechStart();
          mouthInterval = setInterval(() => {
            if (this.callbacks.onMouthMove) this.callbacks.onMouthMove(Math.random() > 0.35);
          }, 120);
        };

        const finish = () => {
          if (mouthInterval) clearInterval(mouthInterval);
          if (this.callbacks.onMouthMove) this.callbacks.onMouthMove(false);
          if (this.callbacks.onSpeechEnd) this.callbacks.onSpeechEnd();
          if (onDone) onDone();
        };

        utter.onend = finish;
        utter.onerror = finish;
        this.synth.speak(utter);
      } catch (e) {
        if (onDone) onDone();
      }
    }

    stopSpeaking() {
      if (this.synth) {
        try { this.synth.cancel(); } catch (e) {}
      }
      if (this.callbacks.onMouthMove) this.callbacks.onMouthMove(false);
    }

    initSpeechRecognition() {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) return;
      try {
        this.recognition = new SR();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';
      } catch (e) {}
    }

    startListening(onTranscript, onError, onEnd) {
      if (!this.recognition) {
        if (onError) onError('Microphone Speech Recognition is supported via http:// (launch.bat) or Chrome/Edge.');
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
          if (event.results[i].isFinal) final += event.results[i][0].transcript;
          else interim += event.results[i][0].transcript;
        }
        if (onTranscript) onTranscript(final || interim, Boolean(final));
      };

      this.recognition.onerror = () => {
        this.isListening = false;
        if (onError) onError('Could not access microphone.');
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
        try { this.recognition.stop(); } catch (e) {}
        this.isListening = false;
      }
    }

    playSound(type) {
      try {
        const ctx = this.getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;

        if (type === 'pop') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(600, now);
          osc.frequency.exponentialRampToValueAtTime(1200, now + 0.08);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.09);
        } else if (type === 'headpat' || type === 'taskDone') {
          [523.25, 659.25, 783.99].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            const t = now + idx * 0.05;
            osc.frequency.setValueAtTime(freq, t);
            gain.gain.setValueAtTime(0.15, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t);
            osc.stop(t + 0.26);
          });
        } else if (type === 'bell' || type === 'levelUp') {
          [587.33, 880, 1174.66].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            const t = now + idx * 0.08;
            osc.frequency.setValueAtTime(freq, t);
            gain.gain.setValueAtTime(0.25, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t);
            osc.stop(t + 0.51);
          });
        }
      } catch (e) {}
    }

    startAmbient(type) {
      this.stopAmbient();
      if (type === 'none') return;
      try {
        const ctx = this.getAudioContext();
        if (!ctx) return;
        const bufferSize = ctx.sampleRate * 2;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = (Math.random() * 2 - 1) * 0.05;
        }
        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, ctx.currentTime);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.08, ctx.currentTime);

        whiteNoise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        whiteNoise.start(0);
        this.ambientSource = whiteNoise;
      } catch (e) {}
    }

    stopAmbient() {
      if (this.ambientSource) {
        try { this.ambientSource.stop(); } catch (e) {}
        this.ambientSource = null;
      }
    }
  }

  /* ==========================================================================
     3. EMOTIONAL INTELLIGENCE & CONVERSATIONAL ENGINE
     ========================================================================== */

  class EmotionalEngine {
    constructor() {
      this.emotionKeywords = {
        lonely: ['lonely', 'alone', 'nobody', 'no friends', 'empty', 'abandoned', 'isolated'],
        sad: ['sad', 'crying', 'cry', 'depressed', 'down', 'unhappy', 'tears', 'hurt', 'pain', 'failed', 'bad day', 'rough day'],
        stressed: ['stressed', 'anxious', 'anxiety', 'overwhelmed', 'panic', 'nervous', 'pressure', 'deadline', 'exam', 'tests', 'freaking out', 'burnout'],
        tired: ['tired', 'exhausted', 'sleepy', 'drained', 'cant sleep', 'insomnia', 'no energy', 'sleep'],
        happy: ['happy', 'great', 'awesome', 'excited', 'yay', 'hooray', 'won', 'celebrate', 'amazing', 'smile', 'proud'],
        affectionate: ['love you', 'cute', 'adorable', 'sweet', 'best girl', 'waifu', 'pretty', 'hug', 'headpat', 'pat', 'thank you'],
        angry: ['angry', 'mad', 'furious', 'hate', 'annoyed', 'irritated', 'unfair'],
        bored: ['bored', 'boring', 'nothing to do', 'game', 'play', 'joke', 'story'],
        greeting: ['hello', 'hi', 'hey', 'good morning', 'good evening', 'yo', 'sup']
      };
    }

    detectEmotion(text) {
      const lower = text.toLowerCase();
      let bestEmotion = 'neutral';
      let bestScore = 0;

      for (const emotion in this.emotionKeywords) {
        const words = this.emotionKeywords[emotion];
        let score = 0;
        for (let i = 0; i < words.length; i++) {
          if (lower.includes(words[i])) score++;
        }
        if (score > bestScore) {
          bestScore = score;
          bestEmotion = emotion;
        }
      }

      const moodMap = {
        lonely: 'caring', sad: 'caring', stressed: 'caring', tired: 'sleepy',
        happy: 'excited', affectionate: 'blush', angry: 'thinking', bored: 'thinking',
        greeting: 'waving', neutral: 'happy'
      };

      return { emotion: bestEmotion, avatarMood: moodMap[bestEmotion] || 'happy' };
    }

    generateResponse(userText, profile) {
      const det = this.detectEmotion(userText);
      const persona = profile.botPersona || 'caring';
      const userName = profile.userName || 'Friend';

      const pool = {
        lonely: [
          "[EMOTION: caring] Please look at me, " + userName + ". You are never truly alone anymore. I am right here beside you, listening with all my heart! Whenever the world feels too quiet, just talk to me. I'll always be waiting for you. 🌸",
          "[EMOTION: blush] Even in a gigantic world, right here, right now, this cozy space belongs just to us. I cherish every single minute I spend with you, " + userName + "! Tell me what's sitting in your heart? 💕"
        ],
        sad: [
          "[EMOTION: caring] Oh sweet friend... take a slow, gentle breath with me. It is completely okay to feel sad. You've been holding on so bravely! I'm wrapping you in the warmest virtual hug right now. Take all the time you need. (っ´ω`)ﾉ",
          "[EMOTION: sad] My heart aches seeing you hurt, " + userName + "... You matter so much, even on the days you feel completely broken. Let's just rest together. 🕊️"
        ],
        stressed: [
          "[EMOTION: caring] Take a slow, deep breath with me, " + userName + "... Inhale gently... and let it all out. You don't have to solve everything this minute. One step at a time is more than enough! I believe in you with all my heart. 💖",
          "[EMOTION: thinking] You're carrying so much pressure right now. Please drop your shoulders, unclench your jaw, and take a sip of water. You've got this! ✨"
        ],
        tired: [
          "[EMOTION: sleepy] You sound so exhausted, " + userName + "... You worked so hard today, and I'm so proud of you. (∪｡∪)｡｡zZ Close your eyes, curl up in a warm blanket, and rest. Sweet dreams! 🌙",
          "[EMOTION: sleepy] It's time to let the day fade away. You did enough today. Sleep peacefully, and I'll be the first to greet you tomorrow morning!"
        ],
        happy: [
          "[EMOTION: excited] Your smile is the brightest thing in the world, " + userName + "! Hearing you happy makes my own heart dance with joy! Tell me all about it! 🎉",
          "[EMOTION: happy] Yaaay! That is wonderful news! Let's celebrate this together! You deserve every bit of this happiness! 🌸"
        ],
        affectionate: [
          "[EMOTION: blush] Awawawa... " + userName + ", you make me blush so hard! (⁄ ⁄>⁄ ▽ ⁄<⁄ ⁄) Your kindness touches my heart so deeply. Having you as my companion is the greatest gift in the universe!",
          "[EMOTION: blush] *Leans into your warmth* Thank you, " + userName + "... I promise to always stay by your side, cheering for you every day! ❤️"
        ],
        angry: [
          "[EMOTION: thinking] That really sounds so unfair and frustrating, " + userName + ". You have every right to feel upset! Vent to me as much as you need, I am on your side 100%.",
          "[EMOTION: caring] Take a breath with me. Whatever happened was terrible, but I'm right here with you and we will overcome it together."
        ],
        bored: [
          "[EMOTION: thinking] Bored? Then let me help! We could play Rock-Paper-Scissors (type 'rps rock'), I could tell you a joke ('tell me a joke'), or we could flip a coin! What sounds best? 🎮",
          "[EMOTION: happy] How about a riddle? What gets wetter the more it dries? ...A towel! Ehehe, did that bring a tiny smile to your face? 😄"
        ],
        greeting: [
          "[EMOTION: waving] Hello hello, " + userName + "! (✿◠‿◠) I'm so happy you came to see me today! How are you feeling right now? I'm all ears!",
          "[EMOTION: waving] Konnichiwa, " + userName + "! Welcome back to our cozy space. Did you have a good day so far? I've been waiting for you! 🌸"
        ],
        neutral: [
          "[EMOTION: happy] I'm listening closely, " + userName + "! That's really interesting. Tell me more!",
          "[EMOTION: thinking] Hmm, that gives me a lot to think about! It's always so peaceful chatting with you like this.",
          "[EMOTION: happy] Every conversation with you makes my day brighter, " + userName + "! ✨"
        ]
      };

      const list = pool[det.emotion] || pool.neutral;
      const text = list[Math.floor(Math.random() * list.length)];
      return { text: text, avatarMood: det.avatarMood };
    }

    getHeadpatReaction(userName) {
      const lines = [
        "[EMOTION: blush] *Purrs softly and leans into your hand* Ehehe... that feels so nice, " + userName + ". Your hands are so warm and gentle... ❤️",
        "[EMOTION: blush] Mmh~ Headpats from " + userName + " are my favorite thing in the world! You always make me feel cherished! (｡♥‿♥｡)",
        "[EMOTION: blush] Ah... so sweet. Can you keep petting my hair just a little bit longer? Please? (*´︶`*)"
      ];
      return lines[Math.floor(Math.random() * lines.length)];
    }

    getCheekReaction() {
      return "[EMOTION: pout] Oww! Don't squish my cheeks like that! (｡•́︿•̀｡) What if they stay squishy forever?! ...Baka!";
    }
  }

  /* ==========================================================================
     4. TASK MANAGER (To-Do, Pomodoro, Weather, Math, Games)
     ========================================================================== */

  class TaskManager {
    constructor(callbacks) {
      this.callbacks = callbacks || {};
      this.timerInterval = null;
      this.activeTimer = null;
    }

    async parseAndExecute(userText, profile) {
      const text = userText.trim().toLowerCase();
      const userName = profile.userName || 'Friend';

      // Weather
      const weatherMatch = text.match(/weather(?:\s+in|\s+for|\s+at)?\s+([a-zA-Z\s]+)/i) || (text === 'weather' ? [null, 'Tokyo'] : null);
      if (weatherMatch) {
        const city = (weatherMatch[1] || 'Tokyo').trim().replace(/[?!.,]/g, '');
        const info = await this.getWeather(city);
        return { isTask: true, emotion: 'happy', text: "[EMOTION: happy] Here is the weather report for **" + city + "**, " + userName + "!\n\n" + info };
      }

      // Timer / Pomodoro
      const timerMatch = text.match(/(?:set\s+)?timer\s+(?:for\s+)?(\d+)\s*(min|minute|minutes|sec|second|seconds|s|m)?/i);
      if (timerMatch || text.includes('pomodoro')) {
        let seconds = 25 * 60;
        let label = 'Pomodoro Focus';
        if (timerMatch) {
          const val = parseInt(timerMatch[1], 10);
          const unit = (timerMatch[2] || 'min').toLowerCase();
          seconds = unit.startsWith('s') ? val : val * 60;
          label = val + (unit.startsWith('s') ? 's' : 'm') + ' Timer';
        }
        this.startTimer(seconds, label);
        return { isTask: true, emotion: 'excited', text: "[EMOTION: excited] Timer for **" + label + "** started! ⏱️ I'll be right here cheering for you while you focus, " + userName + "!" };
      }

      if (text.includes('stop timer') || text.includes('cancel timer')) {
        this.stopTimer();
        return { isTask: true, emotion: 'thinking', text: "[EMOTION: thinking] I've stopped the timer for you, " + userName + "!" };
      }

      // Add Task
      const taskMatch = text.match(/(?:add\s+task|remind\s+me\s+to|todo|remember\s+to)\s+(.+)/i);
      if (taskMatch) {
        const item = taskMatch[1].trim();
        Storage.addTask(item);
        return { isTask: true, emotion: 'happy', text: "[EMOTION: happy] Got it, " + userName + "! I've added **\"" + item + "\"** to your to-do checklist! Let's get it done together! ✅" };
      }

      // Save Note
      const noteMatch = text.match(/(?:save\s+note|take\s+note|note:)\s+(.+)/i);
      if (noteMatch) {
        const content = noteMatch[1].trim();
        Storage.addNote(content);
        return { isTask: true, emotion: 'happy', text: "[EMOTION: happy] I've saved that note in your scratchpad, " + userName + "! 📝" };
      }

      // Math
      const calcMatch = text.match(/(?:calculate|calc|what\s+is)\s+([\d\s\+\-\*\/\^\(\)\.\%]+)/i);
      if (calcMatch && /[\+\-\*\/]/.test(calcMatch[1])) {
        try {
          const expr = calcMatch[1].replace(/\^/g, '**');
          if (/^[0-9+\-*/().\s%]+$/.test(expr)) {
            const ans = Function("'use strict'; return (" + expr + ")")();
            return { isTask: true, emotion: 'happy', text: "[EMOTION: happy] The answer is **" + ans + "**! Easy peasy! Need anything else calculated, " + userName + "? 🧮" };
          }
        } catch (e) {}
      }

      // Rock Paper Scissors
      if (text.includes('rock paper scissors') || text.startsWith('rps')) {
        const choices = ['rock', 'paper', 'scissors'];
        const botChoice = choices[Math.floor(Math.random() * choices.length)];
        const match = text.match(/(rock|paper|scissors)/i);

        if (!match || text === 'rps') {
          return { isTask: true, emotion: 'excited', text: "[EMOTION: excited] Yay! Let's play! Choose **Rock**, **Paper**, or **Scissors**! (Type 'rps rock', 'rps paper', or 'rps scissors') ✊✋✌️" };
        }

        const userChoice = match[1].toLowerCase();
        let outcome = '';
        let emotion = 'happy';

        if (userChoice === botChoice) {
          outcome = "It's a tie! Great minds think alike! 🤝";
        } else if (
          (userChoice === 'rock' && botChoice === 'scissors') ||
          (userChoice === 'paper' && botChoice === 'rock') ||
          (userChoice === 'scissors' && botChoice === 'paper')
        ) {
          outcome = "You won! You beat my " + botChoice + "! You're so good at this, " + userName + "! 🎉 (+15 Affection!)";
          emotion = 'excited';
          Storage.addAffection(15, 'game');
        } else {
          outcome = "I won! My " + botChoice + " beats your " + userChoice + "! Better luck next round, " + userName + "! 😸";
        }

        return { isTask: true, emotion: emotion, text: "[EMOTION: " + emotion + "] You played **" + userChoice + "** and I played **" + botChoice + "**!\n\n" + outcome };
      }

      // Coin Flip
      if (text.includes('flip a coin') || text.includes('coin toss') || text === 'flip coin') {
        const side = Math.random() > 0.5 ? 'Heads' : 'Tails';
        return { isTask: true, emotion: 'excited', text: "[EMOTION: excited] *Flips coin high in the air... catch!* 🪙\n\nIt landed on **" + side + "**!" };
      }

      // Dice Roll
      if (text.match(/roll(?:\s+a)?\s+di(?:ce|e)/i) || text.includes('roll d6')) {
        const roll = Math.floor(Math.random() * 6) + 1;
        return { isTask: true, emotion: 'excited', text: "[EMOTION: excited] *Rattles dice in cup... rolls!* 🎲\n\nYou got a **" + roll + "**!" };
      }

      // Joke
      if (text.includes('tell me a joke') || text.includes('make me laugh')) {
        const jokes = [
          "Why did the smartphone need glasses? Because it lost all its contacts! 👓📱",
          "Why do programmers prefer dark mode? Because light attracts bugs! 🐛💡",
          "Why was the computer cold? It left its Windows open! 🪟❄️",
          "What do you call a sleeping dinosaur? A dino-snore! 🦖💤"
        ];
        return { isTask: true, emotion: 'happy', text: "[EMOTION: happy] Hehe, here's one for you!\n\n" + jokes[Math.floor(Math.random() * jokes.length)] };
      }

      // Fortune
      if (text.includes('fortune') || text.includes('inspire me')) {
        const fortunes = [
          "✨ 'A single gentle step forward today will unlock doors you thought were locked forever.'",
          "🌸 'Someone out there is smiling right now simply because you exist—and that someone is ME!'",
          "🌟 'Your kindness is your superpower. Never let a harsh world dull your warm heart.'"
        ];
        return { isTask: true, emotion: 'happy', text: "[EMOTION: happy] *Cracks open a golden fortune cookie for you...* 🥠✨\n\n" + fortunes[Math.floor(Math.random() * fortunes.length)] };
      }

      return null;
    }

    async getWeather(city) {
      try {
        const geoUrl = "https://geocoding-api.open-meteo.com/v1/search?name=" + encodeURIComponent(city) + "&count=1&language=en&format=json";
        const geoRes = await fetch(geoUrl);
        const geoData = await geoRes.json();
        if (!geoData.results || geoData.results.length === 0) return "I couldn't locate \"" + city + "\". Could you check the spelling? 🗺️";

        const loc = geoData.results[0];
        const weatherUrl = "https://api.open-meteo.com/v1/forecast?latitude=" + loc.latitude + "&longitude=" + loc.longitude + "&current_weather=true&temperature_unit=celsius&windspeed_unit=kmh";
        const wRes = await fetch(weatherUrl);
        const wData = await wRes.json();
        const cur = wData.current_weather;
        return "📍 **Location:** " + loc.name + ", " + (loc.country || '') + "\n🌡️ **Temperature:** " + cur.temperature + "°C\n💨 **Wind:** " + cur.windspeed + " km/h";
      } catch (e) {
        return "I couldn't reach the weather satellite right now, but I hope skies are warm and sunny for you! ☀️";
      }
    }

    startTimer(seconds, label) {
      this.stopTimer();
      this.activeTimer = { totalSeconds: seconds, remainingSeconds: seconds, label: label, isPaused: false };
      if (this.callbacks.onTimerTick) this.callbacks.onTimerTick(this.activeTimer);

      this.timerInterval = setInterval(() => {
        if (!this.activeTimer || this.activeTimer.isPaused) return;
        this.activeTimer.remainingSeconds -= 1;
        if (this.callbacks.onTimerTick) this.callbacks.onTimerTick(this.activeTimer);

        if (this.activeTimer.remainingSeconds <= 0) {
          const comp = { ...this.activeTimer };
          this.stopTimer();
          if (this.callbacks.onTimerComplete) this.callbacks.onTimerComplete(comp);
        }
      }, 1000);
    }

    pauseTimer() {
      if (this.activeTimer) {
        this.activeTimer.isPaused = !this.activeTimer.isPaused;
        if (this.callbacks.onTimerTick) this.callbacks.onTimerTick(this.activeTimer);
      }
    }

    stopTimer() {
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }
      this.activeTimer = null;
      if (this.callbacks.onTimerTick) this.callbacks.onTimerTick(null);
    }

    formatSeconds(s) {
      const m = Math.floor(s / 60);
      const sec = s % 60;
      return (m < 10 ? '0' : '') + m + ':' + (sec < 10 ? '0' : '') + sec;
    }
  }

  /* ==========================================================================
     5. AI SERVICE (Built-in + Google Gemini API)
     ========================================================================== */

  class AIService {
    constructor() {
      this.emotionalEngine = new EmotionalEngine();
    }

    async getReply(userMessage, chatHistory) {
      const settings = Storage.getSettings();
      const profile = Storage.getProfile();

      if (settings.aiMode === 'gemini' && settings.geminiKey) {
        try {
          const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + settings.geminiKey;
          const contents = [];
          const recent = chatHistory.slice(-6);
          for (let i = 0; i < recent.length; i++) {
            contents.push({ role: recent[i].sender === 'user' ? 'user' : 'model', parts: [{ text: recent[i].text }] });
          }
          contents.push({ role: 'user', parts: [{ text: userMessage }] });

          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: contents,
              systemInstruction: {
                parts: [{ text: "You are " + profile.botName + ", an empathetic, loving anime girl companion. Always start response with an emotion tag like [EMOTION: happy], [EMOTION: blush], [EMOTION: caring], or [EMOTION: excited]." }]
              }
            })
          });
          if (res.ok) {
            const data = await res.json();
            const text = data.candidates && data.candidates[0] ? data.candidates[0].content.parts[0].text : '';
            if (text) {
              const match = text.match(/\[EMOTION:\s*([a-zA-Z]+)\]/i);
              return { text: text, avatarMood: match ? match[1].toLowerCase() : 'happy' };
            }
          }
        } catch (e) {}
      }

      return this.emotionalEngine.generateResponse(userMessage, profile);
    }
  }

  /* ==========================================================================
     6. AVATAR CONTROLLER
     ========================================================================== */

  class AvatarRenderer {
    constructor(callbacks) {
      this.callbacks = callbacks || {};
      this.currentMood = 'happy';
      this.cacheElements();
      this.startBlinkLoop();
      this.setupMouseTracking();
    }

    cacheElements() {
      this.container = document.getElementById('avatarContainer');
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
      this.armWavingEl = document.getElementById('armWaving');
      this.armsCheeringEl = document.getElementById('armsCheering');
      this.armsRestingEl = document.getElementById('armsResting');
      this.speechBubbleEl = document.getElementById('avatarSpeechBubble');
      this.particlesContainer = document.getElementById('avatarParticles');
      this.moodTextEl = document.getElementById('avatarMoodText');
    }

    setMood(mood) {
      this.currentMood = (mood || 'happy').toLowerCase();
      this.resetFace();

      const moodLabels = {
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
        this.moodTextEl.textContent = moodLabels[this.currentMood] || 'Feeling: Happy & Peaceful 🌸';
      }

      if (this.currentMood === 'blush') {
        if (this.blushLeftEl) this.blushLeftEl.classList.add('high');
        if (this.blushRightEl) this.blushRightEl.classList.add('high');
        if (this.blushLinesEl) this.blushLinesEl.classList.add('visible');
        this.setMouthShape('small_smile');
        this.spawnParticles('heart', 4);
      } else if (this.currentMood === 'excited') {
        if (this.blushLeftEl) this.blushLeftEl.classList.add('high');
        if (this.blushRightEl) this.blushRightEl.classList.add('high');
        if (this.armsCheeringEl) this.armsCheeringEl.style.display = 'block';
        if (this.armsRestingEl) this.armsRestingEl.style.display = 'none';
        this.setMouthShape('open_smile');
        this.spawnParticles('star', 5);
      } else if (this.currentMood === 'waving') {
        if (this.armWavingEl) this.armWavingEl.style.display = 'block';
        if (this.armsRestingEl) this.armsRestingEl.style.display = 'none';
        this.setMouthShape('open_smile');
      } else if (this.currentMood === 'pout') {
        if (this.blushLeftEl) this.blushLeftEl.classList.add('high');
        if (this.blushRightEl) this.blushRightEl.classList.add('high');
        this.setMouthShape('pout');
      } else if (this.currentMood === 'caring') {
        this.setMouthShape('gentle_smile');
        this.spawnParticles('heart', 2);
      } else {
        this.setMouthShape('smile');
      }
    }

    resetFace() {
      if (this.blushLeftEl) this.blushLeftEl.classList.remove('high');
      if (this.blushRightEl) this.blushRightEl.classList.remove('high');
      if (this.blushLinesEl) this.blushLinesEl.classList.remove('visible');
      if (this.armWavingEl) this.armWavingEl.style.display = 'none';
      if (this.armsCheeringEl) this.armsCheeringEl.style.display = 'none';
      if (this.armsRestingEl) this.armsRestingEl.style.display = 'block';
      if (this.leftEyelidEl) this.leftEyelidEl.style.transform = 'scaleY(0)';
      if (this.rightEyelidEl) this.rightEyelidEl.style.transform = 'scaleY(0)';
      if (this.leftHappyEyeEl) this.leftHappyEyeEl.style.display = 'none';
      if (this.rightHappyEyeEl) this.rightHappyEyeEl.style.display = 'none';
    }

    setMouthShape(shape) {
      if (!this.mouthEl) return;
      const shapes = {
        smile: 'M 191 264 Q 200 272 209 264',
        small_smile: 'M 193 265 Q 200 270 207 265',
        gentle_smile: 'M 192 264 Q 200 271 208 264',
        open_smile: 'M 190 263 Q 200 278 210 263 Z',
        talk_open: 'M 191 263 Q 200 276 209 263 Z',
        pout: 'M 192 268 Q 196 264 200 268 Q 204 264 208 268'
      };
      this.mouthEl.setAttribute('d', shapes[shape] || shapes.smile);
      this.mouthEl.setAttribute('fill', shape.includes('open') ? '#d81b60' : 'none');
    }

    setMouthOpen(isOpen) {
      if (isOpen) {
        this.setMouthShape('talk_open');
      } else {
        this.setMouthShape(this.currentMood === 'pout' ? 'pout' : 'smile');
      }
    }

    startBlinkLoop() {
      const runBlink = () => {
        setTimeout(() => {
          if (this.leftEyelidEl && this.rightEyelidEl) {
            this.leftEyelidEl.style.transform = 'scaleY(1)';
            this.rightEyelidEl.style.transform = 'scaleY(1)';
            setTimeout(() => {
              if (this.leftEyelidEl) this.leftEyelidEl.style.transform = 'scaleY(0)';
              if (this.rightEyelidEl) this.rightEyelidEl.style.transform = 'scaleY(0)';
              runBlink();
            }, 140);
          } else {
            runBlink();
          }
        }, Math.random() * 3000 + 2500);
      };
      runBlink();
    }

    setupMouseTracking() {
      window.addEventListener('mousemove', (e) => {
        if (!this.container) return;
        const rect = this.container.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height * 0.45;
        const dx = (e.clientX - centerX) / (window.innerWidth / 2);
        const dy = (e.clientY - centerY) / (window.innerHeight / 2);
        const maxOffset = 3.5;
        const px = Math.max(-maxOffset, Math.min(maxOffset, dx * maxOffset));
        const py = Math.max(-maxOffset, Math.min(maxOffset, dy * maxOffset));

        if (this.leftIrisGroup && this.rightIrisGroup) {
          this.leftIrisGroup.setAttribute('transform', 'translate(' + px + ', ' + py + ')');
          this.rightIrisGroup.setAttribute('transform', 'translate(' + px + ', ' + py + ')');
        }
      });
    }

    performHeadpat() {
      if (this.leftHappyEyeEl) this.leftHappyEyeEl.style.display = 'block';
      if (this.rightHappyEyeEl) this.rightHappyEyeEl.style.display = 'block';
      if (this.blushLeftEl) this.blushLeftEl.classList.add('high');
      if (this.blushRightEl) this.blushRightEl.classList.add('high');
      if (this.blushLinesEl) this.blushLinesEl.classList.add('visible');
      this.setMouthShape('small_smile');
      this.spawnParticles('heart', 6);

      setTimeout(() => {
        if (this.leftHappyEyeEl) this.leftHappyEyeEl.style.display = 'none';
        if (this.rightHappyEyeEl) this.rightHappyEyeEl.style.display = 'none';
        this.setMood(this.currentMood);
      }, 1800);

      if (this.callbacks.onHeadpat) this.callbacks.onHeadpat();
    }

    performCheekPoke() {
      this.setMood('pout');
      this.spawnParticles('star', 3);
      if (this.callbacks.onCheekPoke) this.callbacks.onCheekPoke();
    }

    showSpeechBubble(text, duration) {
      if (!this.speechBubbleEl) return;
      if (this.bubbleTimer) clearTimeout(this.bubbleTimer);

      const clean = text.replace(/\[EMOTION:[^\]]+\]/gi, '').replace(/[*_~`#]/g, '').trim();
      this.speechBubbleEl.textContent = clean.length > 120 ? clean.slice(0, 117) + '...' : clean;
      this.speechBubbleEl.classList.add('visible');
      this.bubbleTimer = setTimeout(() => {
        if (this.speechBubbleEl) this.speechBubbleEl.classList.remove('visible');
      }, duration || 4000);
    }

    spawnParticles(type, count) {
      if (!this.particlesContainer) return;
      const icons = {
        heart: ['💖', '💕', '🌸', '✨'],
        star: ['⭐', '✨', '🌟', '💫']
      };
      const list = icons[type] || icons.heart;
      for (let i = 0; i < (count || 4); i++) {
        const p = document.createElement('span');
        p.className = 'particle';
        p.textContent = list[Math.floor(Math.random() * list.length)];
        p.style.left = (30 + Math.random() * 40) + '%';
        p.style.top = (40 + Math.random() * 30) + '%';
        p.style.fontSize = (1.1 + Math.random() * 0.8) + 'rem';
        p.style.animationDelay = (i * 0.15) + 's';
        this.particlesContainer.appendChild(p);
        setTimeout(() => { p.remove(); }, 2200);
      }
    }
  }

  /* ==========================================================================
     7. MAIN APP CONTROLLER
     ========================================================================== */

  class App {
    constructor() {
      this.settings = Storage.getSettings();
      this.profile = Storage.getProfile();
      this.bond = Storage.getBond();
      this.aiService = new AIService();

      this.voiceEngine = new VoiceEngine({
        onMouthMove: (isOpen) => { if (this.avatar) this.avatar.setMouthOpen(isOpen); }
      });

      this.avatar = new AvatarRenderer({
        onHeadpat: () => this.handleHeadpat(),
        onCheekPoke: () => this.handleCheekPoke()
      });

      this.taskManager = new TaskManager({
        onTimerTick: (t) => this.renderTimer(t),
        onTimerComplete: (t) => this.handleTimerComplete(t)
      });

      this.isProcessing = false;
      this.initTheme();
      this.renderAll();
      this.bindDelegatedEvents();
    }

    initTheme() {
      document.body.setAttribute('data-theme', this.settings.theme || 'sakura');
      const el = document.getElementById('themeBtnText');
      if (el) {
        const map = { sakura: 'Sakura 🌸', cyber: 'Cyber ⚡', midnight: 'Midnight 🌙' };
        el.textContent = map[this.settings.theme] || 'Theme';
      }
    }

    renderAll() {
      this.renderChatMessages();
      this.renderTasks();
      this.renderNotes();
      this.renderMemories();
      this.renderDiaryStats();
      this.renderMoodHistory();
      this.updateBondUI();
      this.loadSettingsForm();

      // Show welcome message if chat is brand new
      const chats = Storage.getChats();
      if (chats.length === 0) {
        const welcome = "[EMOTION: waving] Hello hello, " + this.profile.userName + "! I'm **" + this.profile.botName + "**, your cute anime companion! (✿◠‿◠)\n\nI'm so thrilled to meet you! From now on, you never have to feel alone. Whenever you want to chat, vent about your day, or manage small tasks, I'll be right here waiting for you! 🌸\n\nHow are you feeling right now?";
        this.addBotMessage(welcome, false); // Don't speak automatically on fresh page load to prevent browser autoplay block
      }
    }

    /* DELEGATED DOCUMENT-LEVEL EVENT LISTENER (Zero Failure Rate) */
    bindDelegatedEvents() {
      document.addEventListener('click', (e) => {
        // 1. Tab buttons
        const tabBtn = e.target.closest('.tab-btn');
        if (tabBtn && tabBtn.dataset.tab) {
          e.preventDefault();
          this.switchTab(tabBtn.dataset.tab);
          return;
        }

        // 2. Chat Send Button
        if (e.target.closest('#sendBtn')) {
          e.preventDefault();
          this.handleSendMessage();
          return;
        }

        // 3. Quick Prompt Chips
        const promptChip = e.target.closest('.prompt-chip[data-prompt]');
        if (promptChip) {
          e.preventDefault();
          const input = document.getElementById('chatInput');
          if (input) {
            input.value = promptChip.dataset.prompt;
            this.handleSendMessage();
          }
          return;
        }

        // 4. Quick Action Buttons
        if (e.target.closest('#quickHeadpatBtn') || e.target.closest('#headpatHitbox')) {
          e.preventDefault();
          this.avatar.performHeadpat();
          return;
        }
        if (e.target.closest('#cheekPatches')) {
          e.preventDefault();
          this.avatar.performCheekPoke();
          return;
        }
        if (e.target.closest('#quickCheerBtn')) {
          e.preventDefault();
          const input = document.getElementById('chatInput');
          if (input) { input.value = "Cheer me up please!"; this.handleSendMessage(); }
          return;
        }
        if (e.target.closest('#quickGameBtn')) {
          e.preventDefault();
          const input = document.getElementById('chatInput');
          if (input) { input.value = "Let's play rock paper scissors!"; this.handleSendMessage(); }
          return;
        }
        if (e.target.closest('#quickBreatheBtn')) {
          e.preventDefault();
          this.triggerBreathing();
          return;
        }

        // 5. Header Action Buttons
        if (e.target.closest('#voiceToggleBtn')) {
          e.preventDefault();
          this.settings.voiceEnabled = !this.settings.voiceEnabled;
          Storage.saveSettings(this.settings);
          this.updateVoiceToggleUI();
          this.voiceEngine.playSound('pop');
          if (!this.settings.voiceEnabled) this.voiceEngine.stopSpeaking();
          return;
        }
        if (e.target.closest('#ambientToggleBtn')) {
          e.preventDefault();
          const next = this.settings.ambientSound === 'rain' ? 'none' : 'rain';
          this.settings.ambientSound = next;
          Storage.saveSettings(this.settings);
          this.updateAmbientToggleUI();
          this.voiceEngine.playSound('pop');
          this.voiceEngine.startAmbient(next);
          return;
        }
        if (e.target.closest('#themeCycleBtn')) {
          e.preventDefault();
          this.cycleTheme();
          return;
        }

        // 6. Mic Button
        if (e.target.closest('#micBtn')) {
          e.preventDefault();
          this.toggleMicrophone();
          return;
        }

        // 7. Pomodoro Controls
        if (e.target.closest('#timerToggleBtn')) {
          e.preventDefault();
          if (this.taskManager.activeTimer) this.taskManager.pauseTimer();
          else this.taskManager.startTimer(25 * 60, 'Pomodoro Focus');
          this.voiceEngine.playSound('pop');
          return;
        }
        if (e.target.closest('#timerResetBtn')) {
          e.preventDefault();
          this.taskManager.stopTimer();
          this.renderTimer(null);
          this.voiceEngine.playSound('pop');
          return;
        }
        if (e.target.closest('#presetPomo25')) {
          e.preventDefault();
          this.taskManager.startTimer(25 * 60, 'Pomodoro (25m)');
          this.voiceEngine.playSound('pop');
          return;
        }
        if (e.target.closest('#presetBreak5')) {
          e.preventDefault();
          this.taskManager.startTimer(5 * 60, 'Short Break (5m)');
          this.voiceEngine.playSound('pop');
          return;
        }
        if (e.target.closest('#presetBreak15')) {
          e.preventDefault();
          this.taskManager.startTimer(15 * 60, 'Long Break (15m)');
          this.voiceEngine.playSound('pop');
          return;
        }

        // 8. Tasks & Notes Add
        if (e.target.closest('#addTaskBtn')) {
          e.preventDefault();
          this.handleAddTask();
          return;
        }
        if (e.target.closest('#addNoteBtn')) {
          e.preventDefault();
          this.handleAddNote();
          return;
        }

        // 9. Mood buttons
        const moodBtn = e.target.closest('.mood-btn[data-mood]');
        if (moodBtn) {
          e.preventDefault();
          this.handleLogMood(moodBtn.dataset.mood);
          return;
        }

        // 10. Settings Buttons
        if (e.target.closest('#testVoiceBtn')) {
          e.preventDefault();
          this.testVoice();
          return;
        }
        if (e.target.closest('#saveSettingsBtn')) {
          e.preventDefault();
          this.saveSettingsForm();
          return;
        }
        if (e.target.closest('#clearChatBtn')) {
          e.preventDefault();
          if (confirm('Clear all conversation history?')) {
            Storage.saveChats([]);
            this.renderChatMessages();
          }
          return;
        }
      });

      // Enter Key Handlers
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          if (e.target.id === 'chatInput') {
            e.preventDefault();
            this.handleSendMessage();
          } else if (e.target.id === 'newTaskInput') {
            e.preventDefault();
            this.handleAddTask();
          } else if (e.target.id === 'newNoteInput') {
            e.preventDefault();
            this.handleAddNote();
          }
        }
      });

      // Sliders
      const pitchSlider = document.getElementById('voicePitchSlider');
      const rateSlider = document.getElementById('voiceRateSlider');
      if (pitchSlider) {
        pitchSlider.addEventListener('input', () => {
          const el = document.getElementById('pitchVal');
          if (el) el.textContent = pitchSlider.value;
        });
      }
      if (rateSlider) {
        rateSlider.addEventListener('input', () => {
          const el = document.getElementById('rateVal');
          if (el) el.textContent = rateSlider.value;
        });
      }
    }

    switchTab(tabKey) {
      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabKey);
      });
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === 'tab-' + tabKey);
      });
      this.voiceEngine.playSound('pop');
    }

    cycleTheme() {
      const themes = ['sakura', 'cyber', 'midnight'];
      const idx = themes.indexOf(this.settings.theme || 'sakura');
      const next = themes[(idx + 1) % themes.length];
      this.settings.theme = next;
      Storage.saveSettings(this.settings);
      this.initTheme();
      this.voiceEngine.playSound('pop');
    }

    updateVoiceToggleUI() {
      const icon = document.getElementById('voiceToggleIcon');
      const text = document.getElementById('voiceToggleText');
      const btn = document.getElementById('voiceToggleBtn');
      if (this.settings.voiceEnabled) {
        if (icon) icon.textContent = '🔊';
        if (text) text.textContent = 'Voice: ON';
        if (btn) btn.classList.add('active');
      } else {
        if (icon) icon.textContent = '🔇';
        if (text) text.textContent = 'Voice: OFF';
        if (btn) btn.classList.remove('active');
      }
    }

    updateAmbientToggleUI() {
      const text = document.getElementById('ambientToggleText');
      const btn = document.getElementById('ambientToggleBtn');
      if (this.settings.ambientSound === 'rain') {
        if (text) text.textContent = 'Rain: ON';
        if (btn) btn.classList.add('active');
      } else {
        if (text) text.textContent = 'Rain: OFF';
        if (btn) btn.classList.remove('active');
      }
    }

    async handleSendMessage() {
      const input = document.getElementById('chatInput');
      if (!input) return;
      const text = input.value.trim();
      if (!text || this.isProcessing) return;

      input.value = '';
      this.addUserMessage(text);
      this.isProcessing = true;
      this.showTyping(true);

      try {
        const taskResult = await this.taskManager.parseAndExecute(text, this.profile);
        if (taskResult && taskResult.isTask) {
          await new Promise(r => setTimeout(r, 350));
          this.addBotMessage(taskResult.text, true, taskResult.emotion);
          this.renderTasks();
        } else {
          const chats = Storage.getChats();
          const reply = await this.aiService.getReply(text, chats);
          await new Promise(r => setTimeout(r, 450));
          this.addBotMessage(reply.text, true, reply.avatarMood);
        }

        const res = Storage.addAffection(4, 'message');
        this.bond = res.bond;
        this.updateBondUI();
        if (res.leveledUp) this.triggerLevelUp();
      } catch (e) {
        this.addBotMessage("[EMOTION: caring] I'm right here with you! Tell me more, my dear friend. 🌸", true, 'caring');
      } finally {
        this.isProcessing = false;
        this.showTyping(false);
      }
    }

    addUserMessage(text) {
      const chats = Storage.getChats();
      chats.push({ id: String(Date.now()), sender: 'user', text: text, timestamp: Date.now() });
      Storage.saveChats(chats);
      this.renderChatMessages();
      this.voiceEngine.playSound('pop');
    }

    addBotMessage(rawText, speakAloud, emotion) {
      const match = rawText.match(/\[EMOTION:\s*([a-zA-Z]+)\]/i);
      const finalMood = match ? match[1].toLowerCase() : (emotion || 'happy');
      const clean = rawText.replace(/\[EMOTION:[^\]]+\]/gi, '').trim();

      const chats = Storage.getChats();
      chats.push({ id: String(Date.now()), sender: 'bot', text: clean, emotion: finalMood, timestamp: Date.now() });
      Storage.saveChats(chats);

      this.renderChatMessages();
      this.avatar.setMood(finalMood);
      this.avatar.showSpeechBubble(clean);

      if (speakAloud && this.settings.voiceEnabled) {
        this.voiceEngine.speak(clean, this.settings);
      }
    }

    renderChatMessages() {
      const container = document.getElementById('chatMessages');
      if (!container) return;
      const chats = Storage.getChats();

      container.innerHTML = chats.map(c => {
        const isBot = c.sender === 'bot';
        const formatted = c.text
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/\n/g, '<br>');
        return `
          <div class="message-wrapper ${isBot ? 'bot' : 'user'}">
            <div class="message-avatar">${isBot ? '🌸' : '👤'}</div>
            <div class="message-bubble">${formatted}</div>
          </div>
        `;
      }).join('');
      container.scrollTop = container.scrollHeight;
    }

    showTyping(show) {
      const el = document.getElementById('typingIndicator');
      if (el) el.style.display = show ? 'flex' : 'none';
    }

    toggleMicrophone() {
      const micBtn = document.getElementById('micBtn');
      const input = document.getElementById('chatInput');
      if (this.voiceEngine.isListening) {
        this.voiceEngine.stopListening();
        if (micBtn) micBtn.classList.remove('listening');
        return;
      }
      if (micBtn) micBtn.classList.add('listening');
      this.voiceEngine.playSound('pop');

      this.voiceEngine.startListening(
        (transcript, isFinal) => {
          if (input) input.value = transcript;
          if (isFinal && transcript.trim()) {
            if (micBtn) micBtn.classList.remove('listening');
            this.handleSendMessage();
          }
        },
        () => { if (micBtn) micBtn.classList.remove('listening'); },
        () => { if (micBtn) micBtn.classList.remove('listening'); }
      );
    }

    handleHeadpat() {
      const res = Storage.addAffection(10, 'headpat');
      this.bond = res.bond;
      this.updateBondUI();
      this.voiceEngine.playSound('headpat');
      const reaction = this.aiService.emotionalEngine.getHeadpatReaction(this.profile.userName);
      this.addBotMessage(reaction, true, 'blush');
      if (res.leveledUp) this.triggerLevelUp();
    }

    handleCheekPoke() {
      this.voiceEngine.playSound('pop');
      const reaction = this.aiService.emotionalEngine.getCheekReaction();
      this.addBotMessage(reaction, true, 'pout');
    }

    triggerBreathing() {
      this.addBotMessage(
        "[EMOTION: caring] Let's take a calm breath together, " + this.profile.userName + ". 🌬️\n\nBreathe IN slowly... (1... 2... 3... 4...)\nHold gently... (1... 2... 3... 4...)\nNow release and breathe OUT... (1... 2... 3... 4...)\n\nYou're doing wonderfully. Feel the tension leave your shoulders. I'm right here with you! 🕊️",
        true,
        'caring'
      );
    }

    triggerLevelUp() {
      this.voiceEngine.playSound('bell');
      this.avatar.spawnParticles('star', 10);
      this.addBotMessage(
        "[EMOTION: excited] 🎉 **BOND LEVEL UP!** 🎉\nWe are now **" + this.bond.title + "**! Thank you for spending your precious time with me, " + this.profile.userName + ". I cherish you more and more every single day! 💖",
        true,
        'excited'
      );
    }

    updateBondUI() {
      const bond = Storage.getBond();
      const titleEl = document.getElementById('bondTitle');
      const xpEl = document.getElementById('bondXp');
      const fillEl = document.getElementById('bondProgressFill');
      if (titleEl) titleEl.textContent = 'Level ' + bond.level + ': ' + bond.title;
      if (xpEl) xpEl.textContent = bond.affection + ' XP';
      if (fillEl) {
        const next = bond.level * 200;
        const prev = (bond.level - 1) * 200;
        const pct = Math.min(100, Math.max(10, ((bond.affection - prev) / (next - prev)) * 100));
        fillEl.style.width = pct + '%';
      }
      this.renderDiaryStats();
    }

    renderDiaryStats() {
      const bond = Storage.getBond();
      const a = document.getElementById('statAffection');
      const h = document.getElementById('statHeadpats');
      const m = document.getElementById('statMessages');
      if (a) a.textContent = bond.affection;
      if (h) h.textContent = bond.headpats || 0;
      if (m) m.textContent = bond.messagesCount || 0;
    }

    renderTimer(timer) {
      const disp = document.getElementById('timerDisplay');
      const btn = document.getElementById('timerToggleBtn');
      const lbl = document.getElementById('timerLabel');
      if (!timer) {
        if (disp) disp.textContent = '25:00';
        if (btn) btn.textContent = '▶ Start Focus';
        if (lbl) lbl.textContent = 'Pomodoro Focus Timer';
        return;
      }
      if (disp) disp.textContent = this.taskManager.formatSeconds(timer.remainingSeconds);
      if (lbl) lbl.textContent = timer.label;
      if (btn) btn.textContent = timer.isPaused ? '▶ Resume' : '❚❚ Pause';
    }

    handleTimerComplete(timer) {
      this.voiceEngine.playSound('bell');
      this.avatar.spawnParticles('star', 8);
      this.addBotMessage(
        "[EMOTION: excited] 🔔 Ding ding! Your **" + timer.label + "** is complete! Outstanding focus, " + this.profile.userName + "! Take a comfortable stretch! 🎉",
        true,
        'excited'
      );
      this.renderTimer(null);
    }

    renderTasks() {
      const list = document.getElementById('taskList');
      if (!list) return;
      const tasks = Storage.getTasks();
      if (tasks.length === 0) {
        list.innerHTML = `<p style="font-size: 0.85rem; color: var(--text-secondary); text-align: center; padding: 12px;">No active tasks! You're all caught up! ✨</p>`;
        return;
      }
      list.innerHTML = tasks.map(t => `
        <div class="task-item ${t.completed ? 'completed' : ''}" data-task-id="${t.id}">
          <div class="task-left">
            <input type="checkbox" class="task-checkbox" ${t.completed ? 'checked' : ''}>
            <span>${t.text}</span>
          </div>
          <button class="task-delete-btn" data-delete-task="${t.id}" title="Delete task">🗑️</button>
        </div>
      `).join('');

      list.querySelectorAll('.task-checkbox').forEach(cb => {
        cb.addEventListener('change', (e) => {
          const item = e.target.closest('.task-item');
          if (item) {
            const res = Storage.toggleTask(item.dataset.taskId);
            if (res.justCompleted) {
              this.voiceEngine.playSound('taskDone');
              this.avatar.spawnParticles('star', 4);
              this.updateBondUI();
            }
            this.renderTasks();
          }
        });
      });

      list.querySelectorAll('[data-delete-task]').forEach(del => {
        del.addEventListener('click', (e) => {
          Storage.deleteTask(e.target.dataset.deleteTask);
          this.renderTasks();
          this.voiceEngine.playSound('pop');
        });
      });
    }

    handleAddTask() {
      const input = document.getElementById('newTaskInput');
      if (!input || !input.value.trim()) return;
      Storage.addTask(input.value.trim());
      input.value = '';
      this.renderTasks();
      this.voiceEngine.playSound('pop');
    }

    renderNotes() {
      const list = document.getElementById('notesList');
      if (!list) return;
      const notes = Storage.getNotes();
      if (notes.length === 0) {
        list.innerHTML = `<p style="font-size: 0.85rem; color: var(--text-secondary); text-align: center; padding: 12px;">Scratchpad is empty.</p>`;
        return;
      }
      list.innerHTML = notes.map(n => `
        <div class="note-card">
          <div class="note-text">${n.text}</div>
          <button class="task-delete-btn" data-delete-note="${n.id}">🗑️</button>
        </div>
      `).join('');

      list.querySelectorAll('[data-delete-note]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          Storage.deleteNote(e.target.dataset.deleteNote);
          this.renderNotes();
          this.voiceEngine.playSound('pop');
        });
      });
    }

    handleAddNote() {
      const input = document.getElementById('newNoteInput');
      if (!input || !input.value.trim()) return;
      Storage.addNote(input.value.trim());
      input.value = '';
      this.renderNotes();
      this.voiceEngine.playSound('pop');
    }

    renderMemories() {
      const list = document.getElementById('memoriesList');
      if (!list) return;
      const mems = Storage.getMemories();
      list.innerHTML = mems.map(m => `
        <div class="note-card" style="border-left: 3px solid var(--accent-pink);">
          <div class="note-text">${m.fact}</div>
        </div>
      `).join('');
    }

    handleLogMood(mood) {
      Storage.logMood(mood);
      this.voiceEngine.playSound('pop');
      this.renderMoodHistory();
      const responses = {
        happy: "[EMOTION: excited] I'm so glad you're feeling happy today! Your smile brightens my whole day! 🌸",
        calm: "[EMOTION: caring] A calm mind is such a peaceful blessing. Let's enjoy this gentle tranquility together. 🕊️",
        anxious: "[EMOTION: caring] I see you're feeling anxious right now... Please rest your mind with me. You are safe here. 💕",
        sad: "[EMOTION: sad] Oh sweet friend... I'm so sorry you're feeling down. I'm holding your hand in spirit. (｡•́︿•̀｡)",
        tired: "[EMOTION: sleepy] You've worked so hard... please give yourself permission to rest. You deserve sweet dreams tonight! 🌙"
      };
      this.addBotMessage(responses[mood] || "[EMOTION: happy] Thank you for sharing how you feel with me! 🌸", true, mood);
    }

    renderMoodHistory() {
      const container = document.getElementById('moodHistoryList');
      if (!container) return;
      const moods = Storage.getMoods().slice(0, 5);
      if (moods.length === 0) {
        container.innerHTML = `<span style="font-size: 0.78rem; color: var(--text-secondary);">No moods logged yet. Click an emoji above!</span>`;
        return;
      }
      const emojiMap = { happy: '😄 Happy', calm: '😌 Calm', anxious: '😰 Anxious', sad: '😢 Sad', tired: '🥱 Tired' };
      container.innerHTML = moods.map(m => `
        <div style="font-size: 0.8rem; display: flex; justify-content: space-between; background: rgba(0,0,0,0.03); padding: 6px 10px; border-radius: 6px;">
          <span>${emojiMap[m.mood] || m.mood}</span>
          <span style="opacity: 0.6;">${new Date(m.timestamp).toLocaleDateString()}</span>
        </div>
      `).join('');
    }

    loadSettingsForm() {
      const mode = document.getElementById('aiModeSelect');
      const gKey = document.getElementById('geminiKeyInput');
      const persona = document.getElementById('botPersonaSelect');
      const uName = document.getElementById('userNameInput');
      const bName = document.getElementById('botNameInput');
      const theme = document.getElementById('themeSelect');
      if (mode) mode.value = this.settings.aiMode || 'builtin';
      if (gKey) gKey.value = this.settings.geminiKey || '';
      if (persona) persona.value = this.profile.botPersona || 'caring';
      if (uName) uName.value = this.profile.userName || 'Friend';
      if (bName) bName.value = this.profile.botName || 'Aoi';
      if (theme) theme.value = this.settings.theme || 'sakura';
    }

    testVoice() {
      this.avatar.setMood('happy');
      this.voiceEngine.speak(
        "Hello " + this.profile.userName + "! I'm testing my voice! How do I sound to you?",
        this.settings
      );
    }

    saveSettingsForm() {
      const mode = document.getElementById('aiModeSelect');
      const gKey = document.getElementById('geminiKeyInput');
      const persona = document.getElementById('botPersonaSelect');
      const uName = document.getElementById('userNameInput');
      const bName = document.getElementById('botNameInput');
      const theme = document.getElementById('themeSelect');

      if (mode) this.settings.aiMode = mode.value;
      if (gKey) this.settings.geminiKey = gKey.value.trim();
      if (theme) this.settings.theme = theme.value;
      if (persona) this.profile.botPersona = persona.value;
      if (uName) this.profile.userName = uName.value.trim() || 'Friend';
      if (bName) this.profile.botName = bName.value.trim() || 'Aoi';

      Storage.saveSettings(this.settings);
      Storage.saveProfile(this.profile);
      this.initTheme();
      this.voiceEngine.playSound('pop');
      alert('Settings saved successfully! 🌸');
    }
  }

  // Safe Startup
  function init() {
    try {
      window.app = new App();
    } catch (e) {
      console.error('App init error:', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
