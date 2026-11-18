/**
 * Storage & Persistence Manager
 * Saves user settings, companion bond/affection, tasks, notes, mood diary, and memories.
 * Uses localStorage with sensible defaults so everything works offline and free forever.
 */

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
  aiMode: 'builtin', // 'builtin', 'gemini', 'groq'
  geminiKey: '',
  groqKey: '',
  voiceEnabled: true,
  voicePitch: 1.25,
  voiceRate: 1.05,
  voiceVolume: 1.0,
  voiceName: '',
  soundFxEnabled: true,
  theme: 'sakura', // 'sakura', 'cyber', 'midnight'
  ambientSound: 'none', // 'none', 'rain', 'lofi'
  speechRecognitionAutoSend: true
};

const DEFAULT_PROFILE = {
  userName: 'Friend',
  botName: 'Aoi',
  botPersona: 'caring', // 'caring', 'playful', 'tsundere', 'kuudere'
  startDate: new Date().toISOString()
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

export const Storage = {
  getSettings() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : { ...DEFAULT_SETTINGS };
    } catch (e) {
      console.warn('Storage read failed', e);
      return { ...DEFAULT_SETTINGS };
    }
  },

  saveSettings(settings) {
    try {
      const merged = { ...this.getSettings(), ...settings };
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(merged));
      return merged;
    } catch (e) {
      console.error('Failed to save settings', e);
    }
  },

  getProfile() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PROFILE);
      return data ? { ...DEFAULT_PROFILE, ...JSON.parse(data) } : { ...DEFAULT_PROFILE };
    } catch (e) {
      return { ...DEFAULT_PROFILE };
    }
  },

  saveProfile(profile) {
    try {
      const merged = { ...this.getProfile(), ...profile };
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(merged));
      return merged;
    } catch (e) {
      console.error('Failed to save profile', e);
    }
  },

  getBond() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.BOND);
      return data ? JSON.parse(data) : {
        affection: 20,
        level: 1,
        title: LEVEL_TITLES[0].title,
        headpats: 0,
        messagesCount: 0,
        tasksCompleted: 0
      };
    } catch (e) {
      return { affection: 20, level: 1, title: 'New Acquaintance', headpats: 0, messagesCount: 0, tasksCompleted: 0 };
    }
  },

  addAffection(amount, reason = '') {
    const bond = this.getBond();
    bond.affection = Math.max(0, bond.affection + amount);
    if (reason === 'message') bond.messagesCount = (bond.messagesCount || 0) + 1;
    if (reason === 'task') bond.tasksCompleted = (bond.tasksCompleted || 0) + 1;
    if (reason === 'headpat') bond.headpats = (bond.headpats || 0) + 1;

    // Calculate level
    let currentLevel = 1;
    let currentTitle = LEVEL_TITLES[0].title;
    for (const item of LEVEL_TITLES) {
      if (bond.affection >= item.minAffection) {
        currentLevel = item.level;
        currentTitle = item.title;
      }
    }

    const leveledUp = currentLevel > bond.level;
    bond.level = currentLevel;
    bond.title = currentTitle;

    localStorage.setItem(STORAGE_KEYS.BOND, JSON.stringify(bond));
    return { bond, leveledUp };
  },

  getTasks() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TASKS);
      return data ? JSON.parse(data) : [
        { id: '1', text: 'Drink a glass of fresh water 💧', completed: false, category: 'health', createdAt: Date.now() },
        { id: '2', text: 'Take 3 deep breaths and relax your shoulders ✨', completed: false, category: 'wellness', createdAt: Date.now() }
      ];
    } catch (e) {
      return [];
    }
  },

  saveTasks(tasks) {
    try {
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    } catch (e) {
      console.error('Failed to save tasks', e);
    }
  },

  addTask(text, category = 'general') {
    const tasks = this.getTasks();
    const newTask = {
      id: Date.now().toString(),
      text: text.trim(),
      completed: false,
      category,
      createdAt: Date.now()
    };
    tasks.unshift(newTask);
    this.saveTasks(tasks);
    return newTask;
  },

  toggleTask(id) {
    const tasks = this.getTasks();
    let justCompleted = false;
    const updated = tasks.map(t => {
      if (t.id === id) {
        if (!t.completed) justCompleted = true;
        return { ...t, completed: !t.completed, completedAt: !t.completed ? Date.now() : null };
      }
      return t;
    });
    this.saveTasks(updated);
    if (justCompleted) {
      this.addAffection(15, 'task');
    }
    return { tasks: updated, justCompleted };
  },

  deleteTask(id) {
    const tasks = this.getTasks().filter(t => t.id !== id);
    this.saveTasks(tasks);
    return tasks;
  },

  getNotes() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.NOTES);
      return data ? JSON.parse(data) : [
        { id: '1', text: 'Aoi loves hearing about your day! Tell her anything on your mind.', createdAt: Date.now() }
      ];
    } catch (e) {
      return [];
    }
  },

  addNote(text) {
    const notes = this.getNotes();
    const newNote = {
      id: Date.now().toString(),
      text: text.trim(),
      createdAt: Date.now()
    };
    notes.unshift(newNote);
    localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes));
    return newNote;
  },

  deleteNote(id) {
    const notes = this.getNotes().filter(n => n.id !== id);
    localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes));
    return notes;
  },

  getMoods() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MOODS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  logMood(mood, note = '') {
    const moods = this.getMoods();
    const newMood = {
      id: Date.now().toString(),
      mood, // 'happy', 'calm', 'anxious', 'sad', 'tired', 'excited'
      note: note.trim(),
      timestamp: Date.now()
    };
    moods.unshift(newMood);
    // Keep max 50 entries
    if (moods.length > 50) moods.pop();
    localStorage.setItem(STORAGE_KEYS.MOODS, JSON.stringify(moods));
    return newMood;
  },

  getChats() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CHATS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  saveChats(chats) {
    try {
      // Keep up to 100 recent messages
      const trimmed = chats.slice(-100);
      localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(trimmed));
    } catch (e) {
      console.error('Failed to save chats', e);
    }
  },

  getMemories() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MEMORIES);
      return data ? JSON.parse(data) : [
        { id: '1', fact: 'Loves spending warm, peaceful moments together 🌸' }
      ];
    } catch (e) {
      return [];
    }
  },

  addMemory(fact) {
    const memories = this.getMemories();
    if (memories.some(m => m.fact.toLowerCase() === fact.toLowerCase())) return;
    const newMem = { id: Date.now().toString(), fact: fact.trim() };
    memories.unshift(newMem);
    if (memories.length > 20) memories.pop();
    localStorage.setItem(STORAGE_KEYS.MEMORIES, JSON.stringify(memories));
    return newMem;
  },

  deleteMemory(id) {
    const memories = this.getMemories().filter(m => m.id !== id);
    localStorage.setItem(STORAGE_KEYS.MEMORIES, JSON.stringify(memories));
    return memories;
  }
};
