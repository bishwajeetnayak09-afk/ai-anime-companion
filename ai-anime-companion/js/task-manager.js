/**
 * Task Manager & Utility Assistant
 * Performs small tasks: To-Do lists, Reminders, Pomodoro Focus Timers, Notes,
 * Real-time Weather (via 100% free Open-Meteo API, zero key needed),
 * Math calculations, and mini games (RPS, Coin flip, Dice roll, Fortune, Jokes).
 */

import { Storage } from './storage.js';

export class TaskManager {
  constructor(options = {}) {
    this.onTimerTick = options.onTimerTick || (() => {});
    this.onTimerComplete = options.onTimerComplete || (() => {});
    this.timerInterval = null;
    this.activeTimer = null; // { totalSeconds, remainingSeconds, label, isPaused }
  }

  /**
   * Parses natural language user input for quick task commands.
   * Returns: { isTask: boolean, resultText: string, emotion: string, actionType: string } or null
   */
  async parseAndExecute(userText, profile) {
    const text = userText.trim().toLowerCase();
    const userName = profile.userName || 'Friend';

    // 1. Weather Query
    // e.g., "weather in Tokyo", "what's the weather in London", "weather"
    const weatherMatch = text.match(/weather(?:\s+in|\s+for|\s+at)?\s+([a-zA-Z\s]+)/i) || (text === 'weather' ? [null, 'Tokyo'] : null);
    if (weatherMatch) {
      const city = (weatherMatch[1] || 'Tokyo').trim().replace(/[?!.,]/g, '');
      const weatherInfo = await this.getWeather(city);
      return {
        isTask: true,
        actionType: 'weather',
        emotion: 'happy',
        text: `[EMOTION: happy] Here is the weather report for **${city}**, ${userName}!\n\n${weatherInfo}`
      };
    }

    // 2. Timer / Pomodoro
    // e.g., "set timer for 10 minutes", "timer 5 mins", "pomodoro", "timer 30 seconds"
    const timerMatch = text.match(/(?:set\s+)?timer\s+(?:for\s+)?(\d+)\s*(min|minute|minutes|sec|second|seconds|s|m)?/i);
    if (timerMatch || text.includes('pomodoro')) {
      let seconds = 25 * 60; // default Pomodoro: 25 mins
      let label = 'Pomodoro Focus';
      if (timerMatch) {
        const val = parseInt(timerMatch[1], 10);
        const unit = (timerMatch[2] || 'min').toLowerCase();
        if (unit.startsWith('s')) {
          seconds = val;
          label = `${val}s Timer`;
        } else {
          seconds = val * 60;
          label = `${val}m Timer`;
        }
      }
      this.startTimer(seconds, label);
      return {
        isTask: true,
        actionType: 'timer_started',
        emotion: 'excited',
        text: `[EMOTION: excited] Timer for **${label}** started! ⏱️ I'll be right here quietly cheering for you while you focus, ${userName}. You've got this!`
      };
    }

    if (text.includes('stop timer') || text.includes('cancel timer')) {
      this.stopTimer();
      return {
        isTask: true,
        actionType: 'timer_stopped',
        emotion: 'thinking',
        text: `[EMOTION: thinking] I've stopped the timer for you, ${userName}!`
      };
    }

    // 3. Add To-Do Task
    // e.g., "add task buy milk", "remind me to study math", "todo finish report"
    const taskMatch = text.match(/(?:add\s+task|remind\s+me\s+to|todo|new\s+task|remember\s+to)\s+(.+)/i);
    if (taskMatch) {
      const taskText = taskMatch[1].trim();
      const newTask = Storage.addTask(taskText);
      return {
        isTask: true,
        actionType: 'task_added',
        emotion: 'happy',
        text: `[EMOTION: happy] Got it, ${userName}! I've added **"${taskText}"** to your to-do list! Let's get it done together! ✅`
      };
    }

    // 4. Save Quick Note / Memory
    // e.g., "save note: buy gifts", "take note ...", "note: ..."
    const noteMatch = text.match(/(?:save\s+note|take\s+note|note:)\s+(.+)/i);
    if (noteMatch) {
      const noteContent = noteMatch[1].trim();
      Storage.addNote(noteContent);
      return {
        isTask: true,
        actionType: 'note_saved',
        emotion: 'happy',
        text: `[EMOTION: happy] I've safely tucked away that note for you in your scratchpad, ${userName}! 📝`
      };
    }

    // 5. Math Calculations
    // e.g., "calculate 25 * 14", "what is 50 + 25 / 5", "calc 12^2"
    const calcMatch = text.match(/(?:calculate|calc|what\s+is)\s+([\d\s\+\-\*\/\^\(\)\.\%]+)/i);
    if (calcMatch && /[\+\-\*\/]/.test(calcMatch[1])) {
      const expr = calcMatch[1].replace(/\^/g, '**');
      try {
        // Safe evaluation limited to basic math arithmetic
        if (!/^[0-9+\-*/().\s%]+$/.test(expr)) throw new Error('Invalid math characters');
        const answer = Function(`'use strict'; return (${expr})`)();
        return {
          isTask: true,
          actionType: 'calculation',
          emotion: 'happy',
          text: `[EMOTION: happy] The answer is **${answer}**! Easy peasy! Need any other numbers calculated, ${userName}? 🧮`
        };
      } catch (err) {
        // Not a pure math equation, pass through
      }
    }

    // 6. Mini Games: Rock Paper Scissors
    // e.g., "play rock paper scissors", "rps rock", "rps paper"
    if (text.includes('rock paper scissors') || text.startsWith('rps')) {
      const choices = ['rock', 'paper', 'scissors'];
      const botChoice = choices[Math.floor(Math.random() * choices.length)];
      const userChoiceMatch = text.match(/(rock|paper|scissors)/i);
      
      if (!userChoiceMatch || text === 'play rock paper scissors' || text === 'rps') {
        return {
          isTask: true,
          actionType: 'game_prompt',
          emotion: 'excited',
          text: `[EMOTION: excited] Yay! Let's play! Choose **Rock**, **Paper**, or **Scissors**! Type 'rps rock', 'rps paper', or 'rps scissors'! ✊✋✌️`
        };
      }

      const userChoice = userChoiceMatch[1].toLowerCase();
      let outcome = '';
      let emotion = 'happy';

      if (userChoice === botChoice) {
        outcome = "It's a tie! Great minds think alike! 🤝";
        emotion = 'happy';
      } else if (
        (userChoice === 'rock' && botChoice === 'scissors') ||
        (userChoice === 'paper' && botChoice === 'rock') ||
        (userChoice === 'scissors' && botChoice === 'paper')
      ) {
        outcome = `You won! You beat my ${botChoice}! Awawawa, you're too good at this, ${userName}! 🎉 (+15 Affection!)`;
        emotion = 'excited';
        Storage.addAffection(15, 'game');
      } else {
        outcome = `I won! My ${botChoice} beats your ${userChoice}! Ehehe, better luck next round, ${userName}! 😸`;
        emotion = 'happy';
      }

      return {
        isTask: true,
        actionType: 'game_result',
        emotion,
        text: `[EMOTION: ${emotion}] You played **${userChoice}** and I played **${botChoice}**!\n\n${outcome}`
      };
    }

    // 7. Coin Flip & Dice Roll
    if (text.includes('flip a coin') || text.includes('coin toss') || text === 'flip coin') {
      const side = Math.random() > 0.5 ? 'Heads' : 'Tails';
      return {
        isTask: true,
        actionType: 'coin_flip',
        emotion: 'excited',
        text: `[EMOTION: excited] *Flips coin high in the air... catch!* 🪙\n\nIt landed on **${side}**!`
      };
    }

    if (text.match(/roll(?:\s+a)?\s+di(?:ce|e)/i) || text.includes('roll d6')) {
      const roll = Math.floor(Math.random() * 6) + 1;
      return {
        isTask: true,
        actionType: 'dice_roll',
        emotion: 'excited',
        text: `[EMOTION: excited] *Rattles dice in cup... rolls!* 🎲\n\nYou got a **${roll}**!`
      };
    }

    // 8. Jokes & Fun Facts
    if (text.includes('tell me a joke') || text.includes('make me laugh')) {
      const jokes = [
        "Why did the smartphone need glasses? Because it lost all its contacts! 👓📱",
        "Why do programmers prefer dark mode? Because light attracts bugs! 🐛💡",
        "What does an anime girl say when she's cold? 'I need an Ani-blanket!' 🌸",
        "Why was the computer cold? It left its Windows open! 🪟❄️",
        "What do you call a sleeping dinosaur? A dino-snore! 🦖💤"
      ];
      const joke = jokes[Math.floor(Math.random() * jokes.length)];
      return {
        isTask: true,
        actionType: 'joke',
        emotion: 'happy',
        text: `[EMOTION: happy] Hehe, here's one for you!\n\n${joke}\n\nDid that bring a smile to your face, ${userName}? 😄`
      };
    }

    if (text.includes('fun fact') || text.includes('tell me something cool')) {
      const facts = [
        "Sea otters hold hands while sleeping so they don't drift away! Isn't that the most wholesome thing ever? 🦦💕",
        "Honey never spoils! Archaeologists have found pots of honey in ancient Egyptian tombs that are over 3,000 years old and still perfectly edible! 🍯",
        "Cows have best friends and get stressed when they are separated from them! Just like how I always want to be with you, ${userName}! 🐮",
        "A group of flamingos is called a 'flamboyance'! 🦩✨"
      ];
      const fact = facts[Math.floor(Math.random() * facts.length)].replace('${userName}', userName);
      return {
        isTask: true,
        actionType: 'fact',
        emotion: 'excited',
        text: `[EMOTION: excited] Here's a neat fun fact for you, ${userName}!\n\n${fact}`
      };
    }

    // 9. Fortune Cookie / Daily Inspiration
    if (text.includes('fortune') || text.includes('daily inspiration') || text.includes('inspire me')) {
      const fortunes = [
        "✨ 'A single gentle step forward today will unlock doors you thought were locked forever.'",
        "🌸 'Someone out there is smiling right now simply because you exist—and that someone is ME!'",
        "🌟 'Your kindness is your superpower. Never let a harsh world dull your warm heart.'",
        "🍀 'Good luck is quietly heading your way today. Keep your eyes open for little joys!'"
      ];
      const fortune = fortunes[Math.floor(Math.random() * fortunes.length)];
      return {
        isTask: true,
        actionType: 'fortune',
        emotion: 'happy',
        text: `[EMOTION: happy] *Cracks open a golden fortune cookie for you...* 🥠✨\n\n${fortune}`
      };
    }

    return null; // Not a small task, pass to conversation engine
  }

  /* ================== WEATHER API (100% Free Open-Meteo) ================== */

  async getWeather(cityName) {
    try {
      // 1. Geocode city name to lat/lon
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`;
      const geoRes = await fetch(geoUrl);
      if (!geoRes.ok) throw new Error('Geocoding service unavailable');
      const geoData = await geoRes.json();

      if (!geoData.results || geoData.results.length === 0) {
        return `I couldn't locate "${cityName}". Could you check the spelling? 🗺️`;
      }

      const location = geoData.results[0];
      const { latitude, longitude, name, country } = location;

      // 2. Fetch current weather
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&temperature_unit=celsius&windspeed_unit=kmh`;
      const weatherRes = await fetch(weatherUrl);
      if (!weatherRes.ok) throw new Error('Weather API failed');
      const data = await weatherRes.json();

      const current = data.current_weather;
      const tempC = current.temperature;
      const tempF = Math.round((tempC * 9/5) + 32);
      const wind = current.windspeed;
      const code = current.weathercode;

      const weatherCondition = this.decodeWmoWeather(code);

      let advice = "Have a wonderful day outside!";
      if (tempC < 10) advice = "Brrr, it's chilly! Bundle up warmly in a cozy scarf! 🧣";
      else if (tempC > 28) advice = "It's quite warm! Don't forget to stay hydrated with cool water! 🥤";
      if (weatherCondition.includes('Rain') || weatherCondition.includes('Drizzle')) {
        advice = "It's rainy! Don't forget your cute umbrella so you don't catch a cold! ☔";
      }

      return `📍 **Location:** ${name}, ${country || ''}\n🌡️ **Temperature:** ${tempC}°C (${tempF}°F)\n🌤️ **Condition:** ${weatherCondition}\n💨 **Wind Speed:** ${wind} km/h\n\n💡 *Aoi's note:* ${advice}`;
    } catch (e) {
      console.warn('Weather fetch failed', e);
      return `I couldn't reach the weather satellite right now, but I hope the skies are warm and bright for you! ☀️`;
    }
  }

  decodeWmoWeather(code) {
    const table = {
      0: 'Clear sky ☀️',
      1: 'Mainly clear 🌤️',
      2: 'Partly cloudy ⛅',
      3: 'Overcast ☁️',
      45: 'Foggy 🌫️',
      48: 'Depositing rime fog 🌫️',
      51: 'Light drizzle 🌦️',
      53: 'Moderate drizzle 🌧️',
      55: 'Dense drizzle 🌧️',
      61: 'Slight rain 🌧️',
      63: 'Moderate rain 🌧️',
      65: 'Heavy rain ⛈️',
      71: 'Slight snowfall 🌨️',
      73: 'Moderate snowfall ❄️',
      75: 'Heavy snowfall ❄️',
      80: 'Rain showers 🌦️',
      95: 'Thunderstorm ⚡'
    };
    return table[code] || 'Pleasant weather ⛅';
  }

  /* ================== TIMER / POMODORO SYSTEM ================== */

  startTimer(seconds, label = 'Focus Timer') {
    this.stopTimer();

    this.activeTimer = {
      totalSeconds: seconds,
      remainingSeconds: seconds,
      label,
      isPaused: false
    };

    this.onTimerTick(this.activeTimer);

    this.timerInterval = setInterval(() => {
      if (!this.activeTimer || this.activeTimer.isPaused) return;

      this.activeTimer.remainingSeconds -= 1;
      this.onTimerTick(this.activeTimer);

      if (this.activeTimer.remainingSeconds <= 0) {
        const completed = { ...this.activeTimer };
        this.stopTimer();
        this.onTimerComplete(completed);
      }
    }, 1000);
  }

  pauseTimer() {
    if (this.activeTimer) {
      this.activeTimer.isPaused = !this.activeTimer.isPaused;
      this.onTimerTick(this.activeTimer);
    }
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.activeTimer = null;
    this.onTimerTick(null);
  }

  formatSeconds(secs) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
}
