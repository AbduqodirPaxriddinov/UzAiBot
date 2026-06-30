let TelegramBot = require('node-telegram-bot-api');
if (typeof TelegramBot !== 'function' && TelegramBot.default) {
  TelegramBot = TelegramBot.default;
}
const axios = require('axios');
require('dotenv').config();

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.log(`⚠️ TELEGRAM_BOT_TOKEN не найден в файле .env`);
} else {
  startTelegramBot(token);
}

function startTelegramBot(botToken) {
  const bot = new TelegramBot(botToken, { polling: true });
  console.log(`🤖 Telegram бот UzAiBot четко запущен и готов к работе 24/7!`);

  bot.setMyCommands([
    { command: '/start', description: '🚀 Главное меню' },
    { command: '/chat', description: '💬 Живое общение (/chat start /chat stop)' },
    { command: '/weather', description: '🌤 Погода и курсы валют' },
    { command: '/reset', description: '🔄 Очистить память' }
  ]).catch(() => {});

  const userSessions = new Map();

  function getSession(chatId) {
    if (!userSessions.has(chatId)) {
      userSessions.set(chatId, { history: [], chatActive: true });
    }
    return userSessions.get(chatId);
  }

  const activeKeyboard = {
    reply_markup: {
      keyboard: [
        [{ text: "⏹ Завершить / Suhbatni yakunlash (/chat stop)" }],
        [{ text: "🌤 Погода / Ob-havo" }, { text: "💡 Интересный факт" }],
        [{ text: "🔄 Очистить память / Tozalash" }]
      ],
      resize_keyboard: true,
      persistent: true
    }
  };

  const idleKeyboard = {
    reply_markup: {
      keyboard: [
        [{ text: "💬 Начать общение / Suhbatni boshlash (/chat start)" }],
        [{ text: "🌤 Погода / Ob-havo" }, { text: "💻 Помощь с кодом / Kodlash" }],
        [{ text: "🔄 Очистить память" }]
      ],
      resize_keyboard: true,
      persistent: true
    }
  };

  // Central Command Router
  bot.on('message', async (msg) => {
    if (!msg.text) return;
    const chatId = msg.chat.id;
    const text = msg.text.trim();
    const session = getSession(chatId);

    // 1. /start command
    if (text === '/start') {
      session.chatActive = true;
      const welcome = `🤖 **Assalomu alaykum! Привет! Я UzAiBot — твой живой ИИ-партнер!** 😊\n\n` +
        `Men siz bilan **o'zbek**, **русском**, **english** va barcha tillarda erkin muloqot qila olaman!\n\n` +
        `✨ **Режим живого общения ВКЛЮЧЕН / Suhbat rejimi yoqildi!**\n` +
        `• Muloqotni to'xtatish: \`/chat stop\`\n` +
        `• Qayta boshlash: \`/chat start\`\n\n` +
        `Задайте любой вопрос или отправьте файл! 😊`;
      return bot.sendMessage(chatId, welcome, { parse_mode: 'Markdown', ...activeKeyboard });
    }

    // 2. /chat commands or Chat toggle buttons
    if (text.startsWith('/chat') || text.includes("Suhbatni boshlash") || text.includes("Начать общение")) {
      if (text.includes('stop') || text.includes('стоп')) {
        session.chatActive = false;
        return bot.sendMessage(chatId, "⏹ **Suhbat rejim to'xtatildi / Режим общения приостановлен.**\nМuloqotni qayta boshlash uchun `/chat start` deb yozing!", { parse_mode: 'Markdown', ...idleKeyboard });
      } else {
        session.chatActive = true;
        return bot.sendMessage(chatId, "💬 **Suhbat rejimi yoqildi! Режим живого общения активирован!** 😊\nЗадавай любой вопрос!", { parse_mode: 'Markdown', ...activeKeyboard });
      }
    }

    if (text.includes("Suhbatni yakunlash") || text.includes("Завершить общение")) {
      session.chatActive = false;
      return bot.sendMessage(chatId, "⏹ **Suhbat rejim to'xtatildi / Режим общения приостановлен.**", { parse_mode: 'Markdown', ...idleKeyboard });
    }

    // 3. /reset command
    if (text === '/reset' || text.includes("Очистить память") || text.includes("Tozalash")) {
      session.history = [];
      return bot.sendMessage(chatId, "🔄 Xotira tozalandi! Память очищена.", session.chatActive ? activeKeyboard : idleKeyboard);
    }

    // 4. /weather command or Weather button
    if (text.startsWith('/weather') || text.includes("Ob-havo") || text.includes("Погода")) {
      const ratesText = `🌤️ **Toshkentda ob-havo va valyuta kurslari / Погода и курсы:**\n\n` +
        `🏙 **Toshkent**: +24°C, Havo ochiq va quyoshli ☀️. Namlik 45%, shamol 3.2 m/s.\n\n` +
        `💱 **Valyuta kurslari:**\n` +
        `🇺🇸 1 USD = **12 850 UZS**\n` +
        `🇪🇺 1 EUR = **13 920 UZS**\n` +
        `🇷🇺 1 RUB = **140.5 UZS**`;
      return bot.sendMessage(chatId, ratesText, { parse_mode: 'Markdown', ...(session.chatActive ? activeKeyboard : idleKeyboard) });
    }

    // 5. Fact button
    if (text.includes("Интересный факт")) {
      return bot.sendMessage(chatId, "💡 **Интересный факт:** Человеческий мозг генерирует около 12-25 Ватт электричества — этого достаточно для работы лампочки!", { parse_mode: 'Markdown', ...(session.chatActive ? activeKeyboard : idleKeyboard) });
    }

    // 6. Standard Natural AI Companion Conversation
    if (!session.chatActive) {
      return bot.sendMessage(chatId, "💡 Режим общения приостановлен. Напишите `/chat start` или нажмите кнопку ниже! 😊", { parse_mode: 'Markdown', ...idleKeyboard });
    }

    bot.sendChatAction(chatId, 'typing');
    session.history.push({ role: 'user', content: text });
    if (session.history.length > 10) session.history.shift();

    try {
      const res = await axios.post(`http://localhost:${process.env.PORT || 3000}/api/chat`, {
        messages: session.history,
        webSearch: true,
        detailedMode: false
      });

      const aiReply = res.data.reply;
      session.history.push({ role: 'assistant', content: aiReply });

      bot.sendMessage(chatId, aiReply, { parse_mode: 'Markdown', ...(session.chatActive ? activeKeyboard : idleKeyboard) }).catch(() => {
        bot.sendMessage(chatId, aiReply, session.chatActive ? activeKeyboard : idleKeyboard);
      });

    } catch (e) {
      bot.sendMessage(chatId, "⚠️ Ошибка связи с сервером AI.", activeKeyboard);
    }
  });
}
