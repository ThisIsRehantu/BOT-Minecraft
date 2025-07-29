// index.js
const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const { Vec3 } = require('vec3');
const axios = require('axios');

const bot = mineflayer.createBot({
  host: '168.119.79.73', // ganti dengan IP server kamu
  port: 25565,
  username: 'Admin_Rehantu'
});

bot.loadPlugin(pathfinder);

let lastAIResponse = '';
let lastAIRequestTime = 0;

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

bot.on('spawn', () => {
  const mcData = require('minecraft-data')(bot.version);
  const movements = new Movements(bot, mcData);
  bot.pathfinder.setMovements(movements);

  setInterval(() => {
    bot.setControlState('jump', true);
    bot.setControlState('forward', true);
    setTimeout(() => {
      bot.setControlState('jump', false);
      bot.setControlState('forward', false);
    }, 500);
  }, 15000);
});

bot.on('playerJoined', (player) => {
  if (player.username !== bot.username) {
    bot.chat(`Selamat datang, ${player.username}! ✨`);
  }
});

bot.on('chat', async (username, message) => {
  if (username === bot.username) return;

  const args = message.split(' ');
  const cmd = args[0];
  const now = Date.now();

  if (['!tanya', '!translate', '!motivasi'].includes(cmd)) {
    if (now - lastAIRequestTime < 30000) {
      bot.chat(`Tunggu ${Math.ceil((30000 - (now - lastAIRequestTime)) / 1000)} detik sebelum tanya lagi.`);
      return;
    }
    lastAIRequestTime = now;
  }

  switch (cmd) {
    case '!tanya': {
      const prompt = args.slice(1).join(' ');
      const res = await askGemini(prompt);
      bot.chat(res);
      lastAIResponse = res;
      break;
    }
    case '!ulangi': {
      if (lastAIResponse) bot.chat(lastAIResponse);
      else bot.chat('Belum ada jawaban sebelumnya.');
      break;
    }
    case '!heal': {
      const apple = bot.inventory.items().find(item => item.name.includes('apple'));
      if (apple) bot.equip(apple, 'hand', () => bot.activateItem());
      else bot.chat('Tidak ada makanan untuk heal.');
      break;
    }
    case '!give': {
      const itemName = args[1]?.toLowerCase();
      const item = bot.inventory.items().find(i => i.name.includes(itemName));
      const target = bot.players[username]?.entity;
      if (item && target) bot.tossStack(item);
      else bot.chat('Item tidak ditemukan atau player tidak ada.');
      break;
    }
    case '!translate': {
      const text = args.slice(1).join(' ');
      const res = await askGemini(`Terjemahkan teks ini ke bahasa Indonesia: ${text}`);
      bot.chat(res);
      lastAIResponse = res;
      break;
    }
    case '!motivasi': {
      const res = await askGemini('Berikan saya kata-kata motivasi');
      bot.chat(res);
      lastAIResponse = res;
      break;
    }
    case '!help': {
      bot.chat('Fitur: !tanya, !ulangi, !translate, !motivasi,');
      break;
    }
  }
});

bot.on('health', () => {
  if (bot.health < 18) bot.chat('Aduh, HP-ku berkurang 😥');
});

bot.on('death', () => {
  bot.chat('Aku mati 😵');
});

async function askGemini(prompt) {
  try {
    const res = await axios.post('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=YOUR_API_KEY', {
      contents: [{ parts: [{ text: prompt }] }]
    });
    return res.data.candidates[0].content.parts[0].text.slice(0, 256);
  } catch (e) {
    return 'Maaf, gagal mengambil jawaban dari AI.';
  }
}
