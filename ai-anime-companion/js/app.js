/**
 * Kokoro AI - Main Application Controller
 * Orchestrates Avatar, Voice, Emotional Engine, Task Manager, and State.
 */

import { Storage } from './storage.js';
import { VoiceEngine } from './voice-engine.js';
import { AvatarRenderer } from './avatar.js';
import { TaskManager } from './task-manager.js';
import { AIService } from './ai-service.js';

class App {
  constructor() {
    this.settings = Storage.getSettings();
    this.profile = Storage.getProfile();
    this.bond = Storage.getBond();

    this.aiService = new AIService();

    // 1. Initialize Voice Engine
    this.voiceEngine = new VoiceEngine({
      onMouthMove: (isOpen) => {
        if (this.avatar) this.avatar.setMouthOpen(isOpen);
      },
      onSpeechStart: () => {},
      onSpeechEnd: () => {
        if (this.avatar) this.avatar.setMouthOpen(false);
      }
    });

    // 2. Initialize Avatar
    this.avatar = new AvatarRenderer('avatarContainer', {
      onHeadpat: () => this.handleHeadpat(),
      onCheekPoke: () => this.handleCheekPoke()
    });

    // 3. Initialize Task Manager
    this.taskManager = new TaskManager({
      onTimerTick: (timer) => this.renderTimer(timer),
      onTimerComplete: (timer) => this.handleTimerComplete(timer)
    });

    this.isProcessing = false;

    this.initUI();
    this.bindEvents();
    this.loadInitialData();
  }

  initUI() {
    // Apply theme
    document.body.setAttribute('data-theme', this.settings.theme || 'sakura');
    this.updateThemeButton();

    // Populate voice dropdown once voices are available
    setTimeout(() => this.populateVoiceDropdown(), 300);
    if (window.speechSynthesis && window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = () => this.populateVoiceDropdown();
    }

    // Update voice toggle button state
    this.updateVoiceToggleUI();
    this.updateAmbientToggleUI();
    this.updateBondUI();
  }

  loadInitialData() {
    this.renderChatMessages();
    this.renderTasks();
    this.renderNotes();
    this.renderMemories();
    this.renderDiaryStats();
    this.renderMoodHistory();
    this.loadSettingsForm();

    // If chat is brand new, show warm introductory message!
    const chats = Storage.getChats();
    if (chats.length === 0) {
      const welcome = `[EMOTION: waving] Hello hello, ${this.profile.userName}! I'm **${this.profile.botName}**, your cute anime companion! (✿◠‿◠)\n\nI'm so thrilled to meet you! From now on, you never have to feel alone. Whenever you want to chat, vent about your day, keep track of small tasks, or just need someone warm by your side, I'll be right here waiting for you! 🌸\n\nHow are you feeling right now?`;
      this.addBotMessage(welcome);
    }
  }

  /* ================== EVENT BINDINGS ================== */

  bindEvents() {
    // 1. Workspace Tab Switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tabKey = btn.dataset.tab;
        this.switchTab(tabKey);
      });
    });

    // 2. Chat Input & Send
    const sendBtn = document.getElementById('sendBtn');
    const chatInput = document.getElementById('chatInput');

    if (sendBtn && chatInput) {
      sendBtn.addEventListener('click', () => this.handleSendMessage());
      chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.handleSendMessage();
        }
      });
    }

    // 3. Quick Prompt Chips
    document.querySelectorAll('.prompt-chip[data-prompt]').forEach(chip => {
      chip.addEventListener('click', () => {
        if (chatInput) {
          chatInput.value = chip.dataset.prompt;
          this.handleSendMessage();
        }
      });
    });

    // 4. Microphone Voice Input
    const micBtn = document.getElementById('micBtn');
    if (micBtn) {
      micBtn.addEventListener('click', () => this.toggleMicrophone());
    }

    // 5. Header Action Buttons
    const voiceToggleBtn = document.getElementById('voiceToggleBtn');
    if (voiceToggleBtn) {
      voiceToggleBtn.addEventListener('click', () => {
        this.settings.voiceEnabled = !this.settings.voiceEnabled;
        Storage.saveSettings(this.settings);
        this.updateVoiceToggleUI();
        this.voiceEngine.playSound('pop');
        if (!this.settings.voiceEnabled) {
          this.voiceEngine.stopSpeaking();
        }
      });
    }

    const ambientToggleBtn = document.getElementById('ambientToggleBtn');
    if (ambientToggleBtn) {
      ambientToggleBtn.addEventListener('click', () => {
        const next = this.settings.ambientSound === 'rain' ? 'none' : 'rain';
        this.settings.ambientSound = next;
        Storage.saveSettings(this.settings);
        this.updateAmbientToggleUI();
        this.voiceEngine.playSound('pop');
        this.voiceEngine.startAmbient(next);
      });
    }

    const themeCycleBtn = document.getElementById('themeCycleBtn');
    if (themeCycleBtn) {
      themeCycleBtn.addEventListener('click', () => this.cycleTheme());
    }

    // 6. Stage Quick Action Buttons
    document.getElementById('quickHeadpatBtn')?.addEventListener('click', () => {
      this.avatar.performHeadpat();
    });

    document.getElementById('quickCheerBtn')?.addEventListener('click', () => {
      if (chatInput) {
        chatInput.value = "Cheer me up please!";
        this.handleSendMessage();
      }
    });

    document.getElementById('quickGameBtn')?.addEventListener('click', () => {
      if (chatInput) {
        chatInput.value = "Let's play rock paper scissors!";
        this.handleSendMessage();
      }
    });

    document.getElementById('quickBreatheBtn')?.addEventListener('click', () => {
      this.triggerBreathingExercise();
    });

    // 7. Tasks & Pomodoro Controls
    document.getElementById('timerToggleBtn')?.addEventListener('click', () => {
      if (this.taskManager.activeTimer) {
        this.taskManager.pauseTimer();
      } else {
        this.taskManager.startTimer(25 * 60, 'Pomodoro Focus');
      }
      this.voiceEngine.playSound('pop');
    });

    document.getElementById('timerResetBtn')?.addEventListener('click', () => {
      this.taskManager.stopTimer();
      this.renderTimer(null);
      this.voiceEngine.playSound('pop');
    });

    document.getElementById('presetPomo25')?.addEventListener('click', () => {
      this.taskManager.startTimer(25 * 60, 'Pomodoro (25m)');
      this.voiceEngine.playSound('pop');
    });

    document.getElementById('presetBreak5')?.addEventListener('click', () => {
      this.taskManager.startTimer(5 * 60, 'Short Break (5m)');
      this.voiceEngine.playSound('pop');
    });

    document.getElementById('presetBreak15')?.addEventListener('click', () => {
      this.taskManager.startTimer(15 * 60, 'Long Break (15m)');
      this.voiceEngine.playSound('pop');
    });

    // Add Task
    document.getElementById('addTaskBtn')?.addEventListener('click', () => this.handleAddTask());
    document.getElementById('newTaskInput')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.handleAddTask();
    });

    // Add Note
    document.getElementById('addNoteBtn')?.addEventListener('click', () => this.handleAddNote());
    document.getElementById('newNoteInput')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.handleAddNote();
    });

    // Mood Diary Logging Buttons
    document.querySelectorAll('.mood-btn[data-mood]').forEach(btn => {
      btn.addEventListener('click', () => {
        const mood = btn.dataset.mood;
        this.handleLogMood(mood);
      });
    });

    // Settings Controls
    const aiModeSelect = document.getElementById('aiModeSelect');
    if (aiModeSelect) {
      aiModeSelect.addEventListener('change', () => this.updateSettingsKeyVisibility());
    }

    document.getElementById('testVoiceBtn')?.addEventListener('click', () => {
      this.testVoice();
    });

    document.getElementById('saveSettingsBtn')?.addEventListener('click', () => {
      this.saveSettingsForm();
    });

    document.getElementById('clearChatBtn')?.addEventListener('click', () => {
      if (confirm('Clear all conversation history?')) {
        Storage.saveChats([]);
        this.renderChatMessages();
      }
    });

    // Voice Pitch & Rate slider readouts
    const pitchSlider = document.getElementById('voicePitchSlider');
    const rateSlider = document.getElementById('voiceRateSlider');
    pitchSlider?.addEventListener('input', () => {
      document.getElementById('pitchVal').textContent = pitchSlider.value;
    });
    rateSlider?.addEventListener('input', () => {
      document.getElementById('rateVal').textContent = rateSlider.value;
    });
  }

  /* ================== TABS & THEMES ================== */

  switchTab(tabKey) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabKey);
    });
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.id === `tab-${tabKey}`);
    });
    this.voiceEngine.playSound('pop');
  }

  cycleTheme() {
    const themes = ['sakura', 'cyber', 'midnight'];
    const currentIdx = themes.indexOf(this.settings.theme || 'sakura');
    const next = themes[(currentIdx + 1) % themes.length];
    this.settings.theme = next;
    Storage.saveSettings(this.settings);
    document.body.setAttribute('data-theme', next);
    this.updateThemeButton();
    this.voiceEngine.playSound('pop');
  }

  updateThemeButton() {
    const map = { sakura: 'Sakura 🌸', cyber: 'Cyber ⚡', midnight: 'Midnight 🌙' };
    const el = document.getElementById('themeBtnText');
    if (el) el.textContent = map[this.settings.theme] || 'Theme';
  }

  updateVoiceToggleUI() {
    const icon = document.getElementById('voiceToggleIcon');
    const text = document.getElementById('voiceToggleText');
    const btn = document.getElementById('voiceToggleBtn');
    if (this.settings.voiceEnabled) {
      if (icon) icon.textContent = '🔊';
      if (text) text.textContent = 'Voice: ON';
      btn?.classList.add('active');
    } else {
      if (icon) icon.textContent = '🔇';
      if (text) text.textContent = 'Voice: OFF';
      btn?.classList.remove('active');
    }
  }

  updateAmbientToggleUI() {
    const text = document.getElementById('ambientToggleText');
    const btn = document.getElementById('ambientToggleBtn');
    if (this.settings.ambientSound === 'rain') {
      if (text) text.textContent = 'Rain: ON';
      btn?.classList.add('active');
    } else {
      if (text) text.textContent = 'Rain: OFF';
      btn?.classList.remove('active');
    }
  }

  /* ================== CHAT MESSAGING & AI ================== */

  async handleSendMessage() {
    const chatInput = document.getElementById('chatInput');
    if (!chatInput) return;
    const text = chatInput.value.trim();
    if (!text || this.isProcessing) return;

    chatInput.value = '';
    this.addUserMessage(text);

    this.isProcessing = true;
    this.showTypingIndicator(true);

    try {
      // 1. Check if input is a small task command (Weather, Timer, Add task, Math, Games)
      const taskResult = await this.taskManager.parseAndExecute(text, this.profile);

      if (taskResult && taskResult.isTask) {
        await new Promise(r => setTimeout(r, 400));
        this.addBotMessage(taskResult.text, taskResult.emotion);
        this.renderTasks(); // Refresh tasks in case one was added
      } else {
        // 2. Conversational Message (Empathy & Chat)
        const chats = Storage.getChats();
        const reply = await this.aiService.getReply(text, chats);

        await new Promise(r => setTimeout(r, 500));
        this.addBotMessage(reply.text, reply.avatarMood);
      }

      // Add affection point for chatting
      const { bond, leveledUp } = Storage.addAffection(4, 'message');
      this.bond = bond;
      this.updateBondUI();
      if (leveledUp) this.triggerLevelUpFanfare();

    } catch (e) {
      console.error('Chat error:', e);
      this.addBotMessage("[EMOTION: caring] I'm right here with you! Tell me more, my dear friend. 🌸", 'caring');
    } finally {
      this.isProcessing = false;
      this.showTypingIndicator(false);
    }
  }

  addUserMessage(text) {
    const chats = Storage.getChats();
    const msg = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      timestamp: Date.now()
    };
    chats.push(msg);
    Storage.saveChats(chats);
    this.renderChatMessages();
    this.voiceEngine.playSound('pop');
  }

  addBotMessage(rawText, emotion = 'happy') {
    // Extract emotion tag if present
    const emotionMatch = rawText.match(/\[EMOTION:\s*([a-zA-Z]+)\]/i);
    let finalEmotion = emotion;
    if (emotionMatch) {
      finalEmotion = emotionMatch[1].toLowerCase();
    }

    const cleanDisplay = rawText.replace(/\[EMOTION:[^\]]+\]/gi, '').trim();

    const chats = Storage.getChats();
    const msg = {
      id: Date.now().toString(),
      sender: 'bot',
      text: cleanDisplay,
      emotion: finalEmotion,
      timestamp: Date.now()
    };
    chats.push(msg);
    Storage.saveChats(chats);

    this.renderChatMessages();

    // Trigger Avatar Expression & Speech Bubble
    this.avatar.setMood(finalEmotion);
    this.avatar.showSpeechBubble(cleanDisplay);

    // Speak with cute anime voice if enabled
    if (this.settings.voiceEnabled) {
      this.voiceEngine.speak(cleanDisplay, this.settings);
    }
  }

  renderChatMessages() {
    const container = document.getElementById('chatMessages');
    if (!container) return;
    const chats = Storage.getChats();

    container.innerHTML = chats.map(c => {
      const isBot = c.sender === 'bot';
      const timeStr = new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const avatarIcon = isBot ? '🌸' : '👤';

      // Parse bold, italics and line breaks
      const formatted = c.text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>');

      return `
        <div class="message-wrapper ${isBot ? 'bot' : 'user'}">
          <div class="message-avatar">${avatarIcon}</div>
          <div class="message-bubble">
            ${formatted}
            <span class="message-time">${timeStr}</span>
          </div>
        </div>
      `;
    }).join('');

    container.scrollTop = container.scrollHeight;
  }

  showTypingIndicator(show) {
    const el = document.getElementById('typingIndicator');
    if (el) el.style.display = show ? 'flex' : 'none';
  }

  /* ================== VOICE SPEECH RECOGNITION (MIC) ================== */

  toggleMicrophone() {
    const micBtn = document.getElementById('micBtn');
    const chatInput = document.getElementById('chatInput');

    if (this.voiceEngine.isListening) {
      this.voiceEngine.stopListening();
      micBtn?.classList.remove('listening');
      return;
    }

    micBtn?.classList.add('listening');
    this.voiceEngine.playSound('pop');

    this.voiceEngine.startListening(
      (transcript, isFinal) => {
        if (chatInput) chatInput.value = transcript;
        if (isFinal && transcript.trim()) {
          micBtn?.classList.remove('listening');
          this.handleSendMessage();
        }
      },
      (error) => {
        console.warn('Speech error:', error);
        micBtn?.classList.remove('listening');
      },
      () => {
        micBtn?.classList.remove('listening');
      }
    );
  }

  /* ================== INTERACTIONS: HEADPAT, CALM BREATHING ================== */

  handleHeadpat() {
    const { bond, leveledUp } = Storage.addAffection(10, 'headpat');
    this.bond = bond;
    this.updateBondUI();

    this.voiceEngine.playSound('headpat');

    const reaction = this.aiService.emotionalEngine.getHeadpatReaction(
      this.profile.botPersona,
      this.profile.userName,
      this.bond.level
    );

    this.addBotMessage(reaction, 'blush');
    if (leveledUp) this.triggerLevelUpFanfare();
  }

  handleCheekPoke() {
    this.voiceEngine.playSound('pop');
    const reaction = this.aiService.emotionalEngine.getCheekPokeReaction(
      this.profile.botPersona,
      this.profile.userName
    );
    this.addBotMessage(reaction, 'pout');
  }

  triggerBreathingExercise() {
    this.addBotMessage(
      `[EMOTION: caring] Let's take a calm breath together, ${this.profile.userName}. 🌬️\n\nBreathe IN slowly... (1... 2... 3... 4...)\nHold gently... (1... 2... 3... 4...)\nNow release and breathe OUT... (1... 2... 3... 4...)\n\nYou're doing wonderfully. Feel the tension leave your shoulders. I'm right here with you! 🕊️`,
      'caring'
    );
  }

  triggerLevelUpFanfare() {
    this.voiceEngine.playSound('levelUp');
    this.avatar.spawnParticles('star', 10);
    const msg = `[EMOTION: excited] 🎉 **BOND LEVEL UP!** 🎉\nWe are now **${this.bond.title}**! Thank you for spending your precious time with me, ${this.profile.userName}. I cherish you more and more every single day! 💖`;
    this.addBotMessage(msg, 'excited');
  }

  /* ================== BOND & STATS UI ================== */

  updateBondUI() {
    const bond = Storage.getBond();
    const bondTitleEl = document.getElementById('bondTitle');
    const bondXpEl = document.getElementById('bondXp');
    const bondProgressFill = document.getElementById('bondProgressFill');

    if (bondTitleEl) bondTitleEl.textContent = `Level ${bond.level}: ${bond.title}`;
    
    // Calculate progress within current bracket
    const nextBracket = (bond.level) * 200;
    const currentBracket = (bond.level - 1) * 200;
    const progressInBracket = Math.min(100, Math.max(5, ((bond.affection - currentBracket) / (nextBracket - currentBracket)) * 100));

    if (bondXpEl) bondXpEl.textContent = `${bond.affection} XP`;
    if (bondProgressFill) bondProgressFill.style.width = `${progressInBracket}%`;

    this.renderDiaryStats();
  }

  renderDiaryStats() {
    const bond = Storage.getBond();
    const statAffection = document.getElementById('statAffection');
    const statHeadpats = document.getElementById('statHeadpats');
    const statMessages = document.getElementById('statMessages');

    if (statAffection) statAffection.textContent = bond.affection;
    if (statHeadpats) statHeadpats.textContent = bond.headpats || 0;
    if (statMessages) statMessages.textContent = bond.messagesCount || 0;
  }

  /* ================== TASKS & POMODORO UI ================== */

  renderTimer(timer) {
    const display = document.getElementById('timerDisplay');
    const toggleBtn = document.getElementById('timerToggleBtn');
    const label = document.getElementById('timerLabel');

    if (!timer) {
      if (display) display.textContent = '25:00';
      if (toggleBtn) toggleBtn.textContent = '▶ Start Focus';
      if (label) label.textContent = 'Pomodoro Focus Timer';
      return;
    }

    if (display) display.textContent = this.taskManager.formatSeconds(timer.remainingSeconds);
    if (label) label.textContent = timer.label;
    if (toggleBtn) toggleBtn.textContent = timer.isPaused ? '▶ Resume' : '❚❚ Pause';
  }

  handleTimerComplete(timer) {
    this.voiceEngine.playSound('bell');
    this.avatar.spawnParticles('star', 8);
    this.addBotMessage(
      `[EMOTION: excited] 🔔 Ding ding! Your **${timer.label}** is complete! Outstanding focus, ${this.profile.userName}! You did so well! Take a comfortable stretch and drink some water! 🥤🎉`,
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
      <div class="task-item ${t.completed ? 'completed' : ''}" data-id="${t.id}">
        <div class="task-left">
          <input type="checkbox" class="task-checkbox" ${t.completed ? 'checked' : ''}>
          <span>${t.text}</span>
        </div>
        <button class="task-delete-btn" title="Delete task">🗑️</button>
      </div>
    `).join('');

    // Attach listeners
    list.querySelectorAll('.task-item').forEach(item => {
      const id = item.dataset.id;
      item.querySelector('.task-checkbox')?.addEventListener('change', () => {
        const { justCompleted } = Storage.toggleTask(id);
        if (justCompleted) {
          this.voiceEngine.playSound('taskDone');
          this.avatar.spawnParticles('star', 4);
          this.updateBondUI();
        }
        this.renderTasks();
      });

      item.querySelector('.task-delete-btn')?.addEventListener('click', () => {
        Storage.deleteTask(id);
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

  /* ================== NOTES & MEMORIES UI ================== */

  renderNotes() {
    const list = document.getElementById('notesList');
    if (!list) return;
    const notes = Storage.getNotes();

    if (notes.length === 0) {
      list.innerHTML = `<p style="font-size: 0.85rem; color: var(--text-secondary); text-align: center; padding: 12px;">Scratchpad is empty. Add thoughts here anytime!</p>`;
      return;
    }

    list.innerHTML = notes.map(n => `
      <div class="note-card" data-id="${n.id}">
        <div class="note-text">${n.text}</div>
        <button class="task-delete-btn" title="Delete note">🗑️</button>
      </div>
    `).join('');

    list.querySelectorAll('.note-card').forEach(item => {
      const id = item.dataset.id;
      item.querySelector('.task-delete-btn')?.addEventListener('click', () => {
        Storage.deleteNote(id);
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
    const memories = Storage.getMemories();

    list.innerHTML = memories.map(m => `
      <div class="note-card" data-id="${m.id}" style="border-left: 3px solid var(--accent-pink);">
        <div class="note-text">${m.fact}</div>
        <button class="task-delete-btn" title="Delete memory">🗑️</button>
      </div>
    `).join('');

    list.querySelectorAll('.note-card').forEach(item => {
      const id = item.dataset.id;
      item.querySelector('.task-delete-btn')?.addEventListener('click', () => {
        Storage.deleteMemory(id);
        this.renderMemories();
        this.voiceEngine.playSound('pop');
      });
    });
  }

  /* ================== MOOD DIARY ================== */

  handleLogMood(mood) {
    Storage.logMood(mood);
    this.voiceEngine.playSound('pop');
    this.renderMoodHistory();

    const moodResponses = {
      happy: "[EMOTION: excited] I'm so glad you're feeling happy today! Your smile brightens my whole day! Let's ride this good wave together! 🌸",
      calm: "[EMOTION: caring] A calm mind is such a peaceful blessing. Let's enjoy this gentle tranquility together. 🕊️",
      anxious: "[EMOTION: caring] I see you're feeling anxious right now... Please rest your mind with me. You are safe here, and we'll take it one second at a time. 💕",
      sad: "[EMOTION: sad] Oh sweet friend... I'm so sorry you're feeling down. I'm holding your hand in spirit. Cry if you need to, I'm right here with you. (｡•́︿•̀｡)",
      tired: "[EMOTION: sleepy] You've worked so hard... please give yourself permission to rest. You deserve sweet dreams tonight! 🌙"
    };

    this.addBotMessage(moodResponses[mood] || "[EMOTION: happy] Thank you for sharing how you feel with me! 🌸", mood);
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

  /* ================== SETTINGS FORM ================== */

  loadSettingsForm() {
    const aiModeSelect = document.getElementById('aiModeSelect');
    const geminiKeyInput = document.getElementById('geminiKeyInput');
    const groqKeyInput = document.getElementById('groqKeyInput');
    const botPersonaSelect = document.getElementById('botPersonaSelect');
    const userNameInput = document.getElementById('userNameInput');
    const botNameInput = document.getElementById('botNameInput');
    const pitchSlider = document.getElementById('voicePitchSlider');
    const rateSlider = document.getElementById('voiceRateSlider');
    const themeSelect = document.getElementById('themeSelect');

    if (aiModeSelect) aiModeSelect.value = this.settings.aiMode || 'builtin';
    if (geminiKeyInput) geminiKeyInput.value = this.settings.geminiKey || '';
    if (groqKeyInput) groqKeyInput.value = this.settings.groqKey || '';
    if (botPersonaSelect) botPersonaSelect.value = this.profile.botPersona || 'caring';
    if (userNameInput) userNameInput.value = this.profile.userName || 'Friend';
    if (botNameInput) botNameInput.value = this.profile.botName || 'Aoi';
    if (pitchSlider) pitchSlider.value = this.settings.voicePitch || 1.25;
    if (rateSlider) rateSlider.value = this.settings.voiceRate || 1.05;
    if (themeSelect) themeSelect.value = this.settings.theme || 'sakura';

    document.getElementById('pitchVal').textContent = pitchSlider ? pitchSlider.value : '1.25';
    document.getElementById('rateVal').textContent = rateSlider ? rateSlider.value : '1.05';

    this.updateSettingsKeyVisibility();
  }

  updateSettingsKeyVisibility() {
    const mode = document.getElementById('aiModeSelect')?.value;
    const geminiRow = document.getElementById('geminiKeyRow');
    const groqRow = document.getElementById('groqKeyRow');

    if (geminiRow) geminiRow.style.display = mode === 'gemini' ? 'flex' : 'none';
    if (groqRow) groqRow.style.display = mode === 'groq' ? 'flex' : 'none';
  }

  populateVoiceDropdown() {
    const select = document.getElementById('voiceSelect');
    if (!select) return;
    const voices = this.voiceEngine.getAvailableVoices();
    if (voices.length === 0) return;

    select.innerHTML = voices.map(v => `
      <option value="${v.name}" ${v.name === this.settings.voiceName ? 'selected' : ''}>
        ${v.name} (${v.lang})
      </option>
    `).join('');
  }

  testVoice() {
    const pitch = parseFloat(document.getElementById('voicePitchSlider')?.value || '1.25');
    const rate = parseFloat(document.getElementById('voiceRateSlider')?.value || '1.05');
    const voiceName = document.getElementById('voiceSelect')?.value || '';

    this.avatar.setMood('happy');
    this.voiceEngine.speak(
      `Hello ${this.profile.userName}! I'm testing my voice! How do I sound to you?`,
      { voicePitch: pitch, voiceRate: rate, voiceName }
    );
  }

  saveSettingsForm() {
    this.settings.aiMode = document.getElementById('aiModeSelect')?.value || 'builtin';
    this.settings.geminiKey = document.getElementById('geminiKeyInput')?.value.trim() || '';
    this.settings.groqKey = document.getElementById('groqKeyInput')?.value.trim() || '';
    this.settings.voicePitch = parseFloat(document.getElementById('voicePitchSlider')?.value || '1.25');
    this.settings.voiceRate = parseFloat(document.getElementById('voiceRateSlider')?.value || '1.05');
    this.settings.voiceName = document.getElementById('voiceSelect')?.value || '';
    this.settings.theme = document.getElementById('themeSelect')?.value || 'sakura';

    this.profile.botPersona = document.getElementById('botPersonaSelect')?.value || 'caring';
    this.profile.userName = document.getElementById('userNameInput')?.value.trim() || 'Friend';
    this.profile.botName = document.getElementById('botNameInput')?.value.trim() || 'Aoi';

    Storage.saveSettings(this.settings);
    Storage.saveProfile(this.profile);

    document.body.setAttribute('data-theme', this.settings.theme);
    this.updateThemeButton();
    this.voiceEngine.playSound('pop');

    alert('Settings saved successfully! 🌸');
  }
}

// Instantiate application on DOM ready
window.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
