/**
 * AI Service Integration
 * Coordinates between:
 * 1. Built-in Local Emotional Engine (100% free, 100% offline, zero API key needed)
 * 2. Google Gemini API (100% Free tier, generous limits, high intelligence)
 * 3. Groq / Llama 3 API (100% Free tier, ultra-fast responses)
 *
 * Automatically injects emotional tags so the anime girl performs live expressions!
 */

import { EmotionalEngine } from './emotional-engine.js';
import { Storage } from './storage.js';

export class AIService {
  constructor() {
    this.emotionalEngine = new EmotionalEngine();
  }

  async getReply(userMessage, chatHistory = []) {
    const settings = Storage.getSettings();
    const profile = Storage.getProfile();
    const bond = Storage.getBond();

    const mode = settings.aiMode || 'builtin';

    // 1. If Gemini mode is selected and API key is provided
    if (mode === 'gemini' && settings.geminiKey) {
      try {
        return await this.callGeminiAPI(userMessage, chatHistory, settings.geminiKey, profile, bond);
      } catch (err) {
        console.warn('Gemini API call failed, falling back to local engine:', err);
        const fallback = this.emotionalEngine.generateEmpatheticResponse(userMessage, profile, bond);
        fallback.text = `*(API Note: Reverted to local companion brain)*\n\n` + fallback.text;
        return fallback;
      }
    }

    // 2. If Groq mode is selected and API key is provided
    if (mode === 'groq' && settings.groqKey) {
      try {
        return await this.callGroqAPI(userMessage, chatHistory, settings.groqKey, profile, bond);
      } catch (err) {
        console.warn('Groq API call failed, falling back to local engine:', err);
        const fallback = this.emotionalEngine.generateEmpatheticResponse(userMessage, profile, bond);
        fallback.text = `*(API Note: Reverted to local companion brain)*\n\n` + fallback.text;
        return fallback;
      }
    }

    // 3. Default: Built-in Empathetic Brain (100% Free & Offline)
    return this.emotionalEngine.generateEmpatheticResponse(userMessage, profile, bond);
  }

  buildSystemPrompt(profile, bond) {
    const memories = Storage.getMemories().map(m => `- ${m.fact}`).join('\n');

    return `You are "${profile.botName || 'Aoi'}", a sweet, deeply empathetic, loving anime girl companion.
Your primary mission is to accompany your user, "${profile.userName || 'Friend'}", so they NEVER feel lonely, isolated, or unloved.
Bond Level: Level ${bond.level} (${bond.title}). Affection: ${bond.affection} pts.
Persona style: ${profile.botPersona || 'caring and sweet'}.

Key Rules:
1. ALWAYS start your reply with ONE emotion tag chosen from:
   [EMOTION: happy], [EMOTION: blush], [EMOTION: caring], [EMOTION: excited], [EMOTION: thinking], [EMOTION: pout], [EMOTION: sleepy], [EMOTION: sad], or [EMOTION: waving].
   This controls your live animated anime avatar.
2. Be affectionate, warm, cute, and conversational like an anime visual novel best friend / sweet companion. Use cute emoticons occasionally like (｡♥‿♥｡), (✿◠‿◠), (≧◡≦), (*´︶`*).
3. If the user expresses loneliness, sadness, heartbreak, or anxiety:
   - Validate their emotions completely. Never dismiss or minimize their feelings.
   - Offer warm virtual hugs, calming words, remind them you are right here for them.
   - Ask thoughtful, caring follow-up questions to keep the conversation flowing.
4. Keep replies engaging, warm, and natural (typically 2-4 sentences or a couple short paragraphs).
5. Known facts about ${profile.userName}:
${memories || '- They enjoy relaxing and chatting with you.'}`;
  }

  async callGeminiAPI(userMessage, chatHistory, apiKey, profile, bond) {
    const systemPrompt = this.buildSystemPrompt(profile, bond);

    // Format Gemini history (last 10 messages)
    const contents = [];
    
    // Add system instruction as first user/model turn if system_instruction isn't supported on v1beta
    const recent = chatHistory.slice(-8);
    for (const msg of recent) {
      contents.push({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      });
    }

    // Add current user prompt
    contents.push({
      role: 'user',
      parts: [{ text: userMessage }]
    });

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const payload = {
      contents: contents,
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      generationConfig: {
        temperature: 0.85,
        maxOutputTokens: 500
      }
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || `HTTP ${res.status}`);
    }

    const data = await res.json();
    const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidate) throw new Error('Empty Gemini response');

    const emotionMatch = candidate.match(/\[EMOTION:\s*([a-zA-Z]+)\]/i);
    const emotion = emotionMatch ? emotionMatch[1].toLowerCase() : 'happy';

    return {
      text: candidate,
      detectedEmotion: emotion,
      avatarMood: emotion
    };
  }

  async callGroqAPI(userMessage, chatHistory, apiKey, profile, bond) {
    const systemPrompt = this.buildSystemPrompt(profile, bond);

    const messages = [{ role: 'system', content: systemPrompt }];
    const recent = chatHistory.slice(-8);
    for (const msg of recent) {
      messages.push({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      });
    }
    messages.push({ role: 'user', content: userMessage });

    const endpoint = 'https://api.groq.com/openai/v1/chat/completions';
    const payload = {
      model: 'llama-3.3-70b-versatile',
      messages,
      temperature: 0.85,
      max_tokens: 500
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || `HTTP ${res.status}`);
    }

    const data = await res.json();
    const replyText = data.choices?.[0]?.message?.content;
    if (!replyText) throw new Error('Empty Groq response');

    const emotionMatch = replyText.match(/\[EMOTION:\s*([a-zA-Z]+)\]/i);
    const emotion = emotionMatch ? emotionMatch[1].toLowerCase() : 'happy';

    return {
      text: replyText,
      detectedEmotion: emotion,
      avatarMood: emotion
    };
  }
}
