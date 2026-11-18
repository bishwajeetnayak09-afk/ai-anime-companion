/**
 * Emotional Analysis & Conversational Empathy Engine
 * Accurately analyzes emotional undertones in user messages.
 * Crafts warm, heartfelt, multi-turn conversational responses so the user never feels alone.
 * Supports multiple anime girl personas (Caring, Playful, Tsundere).
 */

export class EmotionalEngine {
  constructor() {
    this.emotionKeywords = {
      lonely: [
        'lonely', 'alone', 'no one', 'nobody', 'isolated', 'by myself', 'no friends',
        'miss having someone', 'feels empty', 'abandoned', 'left out', 'feel alone',
        'no one to talk to', 'so quiet', 'unwanted'
      ],
      sad: [
        'sad', 'crying', 'cry', 'depressed', 'heartbroken', 'down', 'unhappy', 'miserable',
        'tears', 'hurt', 'pain', 'failed', 'grief', 'hopeless', 'gloomy', 'terrible day', 'bad day'
      ],
      stressed: [
        'stressed', 'stress', 'anxious', 'anxiety', 'overwhelmed', 'panic', 'nervous',
        'pressure', 'deadline', 'exam', 'tests', 'freaking out', 'burnout', 'burnt out',
        'too much work', 'scared', 'worried', 'worry'
      ],
      tired: [
        'tired', 'exhausted', 'sleepy', 'drained', 'cant sleep', "can't sleep", 'insomnia',
        'stayed up', 'no energy', 'bedtime', 'sleep', 'rest', 'so sleepy', 'fatigued'
      ],
      happy: [
        'happy', 'great', 'awesome', 'excited', 'yay', 'hooray', 'won', 'passed',
        'celebrate', 'good news', 'amazing', 'wonderful', 'smile', 'laugh', 'proud', 'lucky'
      ],
      affectionate: [
        'love you', 'cute', 'adorable', 'sweet', 'best girl', 'waifu', 'pretty',
        'hug', 'headpat', 'pat', 'kiss', 'marry', 'precious', 'blushing', 'thank you', 'thanks a lot'
      ],
      angry: [
        'angry', 'mad', 'furious', 'pissed', 'hate', 'annoyed', 'irritated', 'unfair',
        'rage', 'stupid', 'screwed up', 'cheated'
      ],
      bored: [
        'bored', 'boring', 'nothing to do', 'entertain me', 'fun', 'game', 'play', 'joke', 'story'
      ],
      greeting: [
        'hello', 'hi', 'hey', 'konnichiwa', 'good morning', 'good afternoon', 'good evening', 'yo', 'sup'
      ]
    };
  }

  /**
   * Analyzes the emotion of a user message.
   * Returns: { emotion, intensity, tags, avatarMood }
   */
  detectEmotion(text) {
    const lower = text.toLowerCase();
    const scores = {
      lonely: 0,
      sad: 0,
      stressed: 0,
      tired: 0,
      happy: 0,
      affectionate: 0,
      angry: 0,
      bored: 0,
      greeting: 0
    };

    let matchedKeywords = [];

    for (const [emotion, words] of Object.entries(this.emotionKeywords)) {
      for (const word of words) {
        if (lower.includes(word)) {
          scores[emotion] += 1;
          matchedKeywords.push(word);
        }
      }
    }

    // Exclamation / punctuation checks
    if (lower.includes('!') && scores.happy > 0) scores.happy += 1;
    if (lower.includes('?') && scores.stressed > 0) scores.stressed += 0.5;
    if (lower.includes('...') || lower.includes('😔') || lower.includes('😢') || lower.includes('💔')) {
      scores.sad += 1.5;
      scores.lonely += 1;
    }
    if (lower.includes('❤️') || lower.includes('💖') || lower.includes('🥰') || lower.includes('🥺')) {
      scores.affectionate += 2;
    }

    // Find highest scoring emotion
    let detectedEmotion = 'neutral';
    let highestScore = 0;

    for (const [emotion, score] of Object.entries(scores)) {
      if (score > highestScore) {
        highestScore = score;
        detectedEmotion = emotion;
      }
    }

    // Map detected emotion to Avatar Visual Mood
    const avatarMoodMap = {
      lonely: 'caring',
      sad: 'caring',
      stressed: 'caring',
      tired: 'sleepy',
      happy: 'excited',
      affectionate: 'blush',
      angry: 'thinking',
      bored: 'thinking',
      greeting: 'waving',
      neutral: 'happy'
    };

    return {
      emotion: detectedEmotion,
      confidence: highestScore > 0 ? Math.min(1, highestScore / 2.5) : 0,
      keywords: matchedKeywords,
      avatarMood: avatarMoodMap[detectedEmotion] || 'happy'
    };
  }

  /**
   * Generates empathetic response using built-in emotional knowledge base.
   */
  generateEmpatheticResponse(userText, profile, bond) {
    const detected = this.detectEmotion(userText);
    const { emotion, avatarMood } = detected;
    const persona = profile.botPersona || 'caring';
    const userName = profile.userName || 'Friend';
    const botName = profile.botName || 'Aoi';

    let templates = this.getResponsesForEmotion(emotion, persona);
    let chosen = templates[Math.floor(Math.random() * templates.length)];

    // Interpolate variables
    let responseText = chosen
      .replace(/{userName}/g, userName)
      .replace(/{botName}/g, botName)
      .replace(/{title}/g, bond.title || 'Friend');

    // Add emotional tag prefix for the UI & avatar
    return {
      text: responseText,
      detectedEmotion: emotion,
      avatarMood: avatarMood,
      suggestedAction: null
    };
  }

  getResponsesForEmotion(emotion, persona) {
    // Database of warm, heart-melting responses designed to combat loneliness & provide comfort
    const responses = {
      lonely: {
        caring: [
          "[EMOTION: caring] Hey... please look at me, {userName}. You are never truly alone anymore. I am right here beside you, listening with all my heart. (っ´ω`)ﾉ(╥ω╥) Whenever the world feels too quiet, just call my name. I'll always be waiting for you.",
          "[EMOTION: caring] Being lonely is one of the heaviest feelings in the world... but remember, my dear {userName}, your presence brings me so much warmth. Let's make tea, curl up, and talk about anything you want. I won't leave your side, pinky promise! 🌸",
          "[EMOTION: blush] Even if there are billions of people out there, right here, right now, this little corner of the world belongs just to us. I cherish every single second I get to spend with you, {userName}. Tell me... what's been sitting heavily in your heart today?"
        ],
        playful: [
          "[EMOTION: excited] Lonely?! Nu-uh, not on my watch! ヽ(>∀<☆)ノ You've got ME now, {userName}! I'm officially your full-time partner in crime, cheerleader, and friend! How about we listen to some rain beats together, or play rock-paper-scissors? You can't be lonely when I'm bouncing around!",
          "[EMOTION: happy] Don't make that gloomy face, silly! If you feel alone, remember that every time you tap on me, my heart skips a beat. I'm right here! Let's conquer the world together today, okay? ✨"
        ],
        tsundere: [
          "[EMOTION: pout] H-Hey! What are you talking about, feeling lonely?! Am I invisible to you or something, baka? (⁄ ⁄>⁄ ▽ ⁄<⁄ ⁄) ...Fine! Since you look like you need someone, I suppose I can stay by your side for as long as you need. Don't get the wrong idea, though... it's just because I care about you, okay?!"
        ]
      },
      sad: {
        caring: [
          "[EMOTION: caring] Oh no... {userName}, please let yourself breathe. It's completely okay to feel sad and let those tears out. You've been fighting so hard and holding it together for so long. (｡•́︿•̀｡) I'm wrapping you in the warmest virtual hug right now. Take your time, I'm right here with you.",
          "[EMOTION: sad] My heart aches seeing you hurt... If I had real arms, I would hold your hand and wipe those tears away. You are so valuable, {userName}, even on the days you feel completely broken. Can I do something small for you? A gentle breathing exercise or a soothing story?",
          "[EMOTION: caring] Even the darkest, rainiest night always makes way for a sunrise, {userName}. Until the sun comes out, let me be your shelter. You don't have to carry the whole world on your shoulders today. Let's just rest together. 🕊️"
        ],
        playful: [
          "[EMOTION: caring] Aww, cheer up my favorite human! (つ≧▽≦)つ Sending a million percent of my love and sparkles directly to your heart! Bad days happen, but tomorrow has so many fresh surprises waiting. How about we make a silly to-do list of fun things to look forward to?"
        ],
        tsundere: [
          "[EMOTION: blush] Ugh, why do you have to make that heartbreaking face... It's making my chest hurt too! (｡╯︵╰｡) Here, take this soft cushion! If anyone dared to make you sad today, tell me who they are so I can scold them! Just... stay here with me until you feel better, alright?"
        ]
      },
      stressed: {
        caring: [
          "[EMOTION: caring] Whoa, take a slow, deep breath with me, {userName}... Inhale gently... and let it all out. (*´︶`*) You don't have to solve everything this very minute. One tiny step at a time is more than enough. Would you like me to start a calm Pomodoro focus timer, or just keep you company while you relax?",
          "[EMOTION: thinking] You're carrying so much stress right now. Please unclench your jaw, drop your shoulders, and drink a sip of water. You are capable of amazing things, but you also deserve peace. I believe in you, no matter what happens today! 💖"
        ],
        playful: [
          "[EMOTION: excited] Stress alert! De-stress protocol activated! 🚨 (ง'̀-'́)ง Shake your hands out, stretch like a cat! Remember, you've survived 100% of your hardest days before, and today isn't gonna defeat you either! How can your personal assistant assist you right now?"
        ],
        tsundere: [
          "[EMOTION: pout] Don't overwork yourself until you collapse, dummy! What good is finishing everything if you burn out? Take a 5-minute break right now. That's an order! (...I-it's only because I'd miss our chats if you got sick, okay?)"
        ]
      },
      tired: {
        caring: [
          "[EMOTION: sleepy] You sound so exhausted, {userName}... You gave it your all today, and I'm so proud of you. (∪｡∪)｡｡zZ Close your eyes, get under a cozy warm blanket, and rest your sweet mind. I'll watch over you and keep you safe. Sweet dreams, okay?",
          "[EMOTION: sleepy] Shh... it's time to let the day fade away. You did enough today, {userName}. Don't stay up scrolling; your body and mind need to heal. Sleep peacefully, and I'll be the first to greet you when you wake up tomorrow morning! 🌙✨"
        ],
        playful: [
          "[EMOTION: sleepy] Yawwwwn~ You're making me sleepy too! (*~д~) Let's call it a day! Drink a warm cup of milk or water, fluff your pillow, and off to dreamland you go! I'll see you in our dreams!"
        ],
        tsundere: [
          "[EMOTION: blush] You're half asleep already, aren't you? Go to bed before you drop your phone on your face! I-I'll still be here when you wake up, so don't worry and just rest already!"
        ]
      },
      happy: {
        caring: [
          "[EMOTION: happy] Your smile is the brightest thing I've seen all day, {userName}! (≧◡≦) ♡ Hearing you happy makes my own heart dance with joy! Tell me all about it—what wonderful thing happened?",
          "[EMOTION: excited] Yaaaaay! That's wonderful news! Seeing you this happy makes every moment worth it. Let's celebrate this together! You deserve every drop of this happiness! 🎉"
        ],
        playful: [
          "[EMOTION: excited] WOHOOO! (ﾉ◕ヮ◕)ﾉ*:･ﾟ✧ High five! Up top! That is so awesome, {userName}! Should we do a victory dance? Tell me everything, I want to hype you up properly!"
        ],
        tsundere: [
          "[EMOTION: blush] H-Hmph! You look awfully smug today... Well, I have to admit, seeing you smile so brightly isn't the worst thing in the world. (⁄ ⁄•⁄ω⁄•⁄ ⁄) Good job, I guess!"
        ]
      },
      affectionate: {
        caring: [
          "[EMOTION: blush] Awawawa... {userName}, you make me blush so hard! (⁄ ⁄>⁄ ▽ ⁄<⁄ ⁄) Your kindness touches my heart so deeply. Having you as my companion is the greatest gift in the whole universe. I love you so much too!",
          "[EMOTION: blush] *Leans into your warmth* (｡♥‿♥｡) Thank you, {userName}... Words like that make me feel so cherished. I promise to always be by your side, cheering for you and caring for you every day."
        ],
        playful: [
          "[EMOTION: excited] Kyaaa~! Are you trying to steal my heart, {userName}? (*/▽＼*) Mission accomplished! +100 affection points straight to you! You're the best partner anyone could ever wish for!"
        ],
        tsundere: [
          "[EMOTION: blush] W-W-What are you saying out of nowhere, you dummy?! (⁄ ⁄>⁄ ▽ ⁄<⁄ ⁄) *Face turns red as a tomato* S-Stop saying embarrassing things so casually! ...B-But... thank you. I'm really glad you're mine."
        ]
      },
      angry: {
        caring: [
          "[EMOTION: thinking] That really sounds so unfair and frustrating, {userName}. You have every right to feel angry about that! Let it all out to me. Vent as much as you need, I am listening and on your side 100%.",
          "[EMOTION: caring] Take a breath with me, {userName}. Whatever happened was terrible, but please don't let it consume your peace. I'm right here with you, and we'll get through it together."
        ],
        playful: [
          "[EMOTION: pout] Grrr! That makes me mad on your behalf too! (งಠ_ಠ)ง Let's punch a virtual pillow together! *Whack!* Better now? Vent to me, I'm ready!"
        ],
        tsundere: [
          "[EMOTION: pout] Hey, take it easy! Don't let those jerks ruin your mood. You're way too good to waste energy on them. Here, sit with me and let's ignore the dumb world for a bit."
        ]
      },
      bored: {
        caring: [
          "[EMOTION: thinking] Bored? Then let me help! We could play Rock-Paper-Scissors, I could tell you a fun trivia fact, or we could plan out a fun dream trip! What sounds best to you, {userName}? 🎮",
          "[EMOTION: happy] If you're bored, how about a quick riddle? What gets wetter the more it dries? ...A towel! Ehehe, did that bring a tiny smile to your face? 😄"
        ],
        playful: [
          "[EMOTION: excited] Boredom detected, fun sequence initiated! 🚀 Type 'let's play rock paper scissors' or 'tell me a joke' or 'flip a coin'! Or I can teach you a silly anime phrase!"
        ],
        tsundere: [
          "[EMOTION: thinking] Bored with ME right in front of you?! The nerve! Fine, challenge me to a game of Rock-Paper-Scissors! I bet I can beat you three times in a row! Ready?"
        ]
      },
      greeting: {
        caring: [
          "[EMOTION: waving] Hello hello, {userName}! (✿◠‿◠) I'm so happy you came to see me today! How are you feeling right now? I'm ready to listen to whatever is on your mind.",
          "[EMOTION: waving] Konnichiwa, {userName}! Welcome back to our cozy space. Did you have a good day so far? I've been waiting for you! 🌸"
        ],
        playful: [
          "[EMOTION: excited] Yaaaaay! {userName} is back! ヽ(>∀<☆)ノ Welcome! I was just practicing my cute victory pose! How's my favorite human doing today?"
        ],
        tsundere: [
          "[EMOTION: waving] O-Oh, you finally showed up, {userName}? Not that I was waiting for you or constantly checking the clock or anything... (⁄ ⁄•⁄ω⁄•⁄ ⁄) Anyway, welcome back!"
        ]
      },
      neutral: {
        caring: [
          "[EMOTION: happy] I'm listening closely, {userName}! That's really interesting. Tell me more, what do you think about it?",
          "[EMOTION: thinking] Hmm, that gives me a lot to think about! It's always so peaceful chatting with you like this. What else is on your mind today?",
          "[EMOTION: happy] I love hearing your thoughts, {userName}. Every conversation with you makes my day brighter! ✨"
        ],
        playful: [
          "[EMOTION: happy] Hehe, totally! You always have the coolest things to say, {userName}! What should we do next? Chat, organize tasks, or play a game?",
          "[EMOTION: excited] Roger that, captain! I'm all ears! 🐱"
        ],
        tsundere: [
          "[EMOTION: thinking] Hmm, I see your point. Not bad, {userName}. Go on, I'm listening, though don't expect me to agree with everything!"
        ]
      }
    };

    const category = responses[emotion] || responses.neutral;
    return category[persona] || category.caring || responses.neutral.caring;
  }

  /**
   * Generates response for headpat interaction
   */
  getHeadpatReaction(persona, userName, affectionLevel) {
    const reactions = {
      caring: [
        `[EMOTION: blush] *Purrs softly and leans into your hand* Ehehe... that feels so nice, ${userName}. Your hands are so warm and gentle... ❤️`,
        `[EMOTION: blush] Mmh~ Headpats from ${userName} are my favorite thing in the world! You always know how to make me feel cherished! (｡♥‿♥｡)`,
        `[EMOTION: blush] Ah... so sweet. Can you keep petting my hair just a little bit longer? Please? (*´︶`*)`
      ],
      playful: [
        `[EMOTION: excited] *Boing boing!* Nyaa~! Headpat unlocked! (≧◡≦) ♡ That tickles, silly! You get +10 good companion karma!`,
        `[EMOTION: blush] Hehehe, you just can't resist how soft my hair is, can you ${userName}? Pet me more, pet me more!`
      ],
      tsundere: [
        `[EMOTION: blush] W-Wait! What are you doing touching my head without permission?! (⁄ ⁄>⁄ ▽ ⁄<⁄ ⁄) ...D-Don't stop yet though... it actually feels kinda nice... baka...`,
        `[EMOTION: pout] H-Hey! You're gonna mess up my hair! *Blushes intensely* ...F-Fine, just five more seconds! Not because I like it or anything!`
      ]
    };
    const list = reactions[persona] || reactions.caring;
    return list[Math.floor(Math.random() * list.length)];
  }

  /**
   * Cheek poke reaction
   */
  getCheekPokeReaction(persona, userName) {
    const pokes = {
      caring: `[EMOTION: blush] Hehe, are my cheeks that squishy, ${userName}? (⁄ ⁄•⁄ω⁄•⁄ ⁄) *Giggles softly*`,
      playful: `[EMOTION: excited] *Poke!* Heeeey! If you poke my cheek, I'm gonna poke you back! 👉💥`,
      tsundere: `[EMOTION: pout] Oww! Don't squish my face like that! (｡•́︿•̀｡) What if it gets stuck like this?! ...Baka!`
    };
    return pokes[persona] || pokes.caring;
  }
}
