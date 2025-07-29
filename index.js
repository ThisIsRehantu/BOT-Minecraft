import mineflayer from 'mineflayer';
import { pathfinder, Movements, goals } from 'mineflayer-pathfinder';
import armorManager from 'mineflayer-armor-manager';
import autoeat from 'mineflayer-auto-eat';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import moment from 'moment';

dotenv.config();

const bot = mineflayer.createBot({
  host: process.env.MC_HOST,
  port: Number(process.env.MC_PORT),
  username: process.env.MC_USERNAME,
  password: process.env.MC_PASSWORD || undefined
});

bot.loadPlugin(pathfinder);
bot.loadPlugin(armorManager);
bot.loadPlugin(autoeat);

let lastResponse = '';
let lastAIChat = 0;

const worldName = 'BOT';
const AI_DELAY = 30000;

bot.once('spawn', () => {
  const mcData = require('minecraft-data')(bot.version);
  const defaultMove = new Movements(bot, mcData);
  bot.pathfinder.setMovements(defaultMove);

  bot.chat(`/execute in ${worldName} run tp ${bot.username} ~ ~ ~`);

  setInterval(() => {
    if (bot.entity && bot.entity.position) {
      const { y } = bot.entity.position;
      bot.setControlState('jump', true);
      setTimeout(() => bot.setControlState('jump', false), 500);
    }
  }, 10000);

  scheduleExitAndJoin();
  startBroadcasts();
});

bot.on('health', () => {
  if (bot.health < 20) {
    bot.chat('/effect give @s minecraft:instant_health 1 5');
  }
});

bot.on('chat', async (username, message) => {
  if (username === bot.username) return;

  const now = Date.now();
  const [cmd, ...args] = message.split(' ');

  if (cmd === '!help') {
    bot.chat('Fitur: !tanya, !ulangi, !heal, !translate [teks], !motivasi, !info');
  }

  else if (cmd === '!ulangi') {
    bot.chat(lastResponse || 'Belum ada respons.');
  }

  else if (cmd === '!heal') {
    bot.chat(`/effect give ${username} minecraft:instant_health 1 5`);
  }

  else if (cmd === '!give') {
  const itemName = args.join(' ').toLowerCase();
  const item = bot.inventory.items().find(i => i.name.includes(itemName));
  const player = bot.players[username]?.entity;

  if (!player) {
    bot.chat('Player tidak ditemukan.');
    return;
  }

  if (item) {
    bot.lookAt(player.position.offset(0, 1.6, 0), true, () => {
      bot.tossStack(item).then(() => {
        bot.chat(`Memberikan ${item.name} ke ${username}`);
      }).catch(() => {
        bot.chat('Gagal memberikan item.');
      });
    });
  } else {
    bot.chat(`Item "${itemName}" tidak ditemukan.`);
  }
  }

  else if (cmd === '!translate' || cmd === '!motivasi' || cmd === '!tanya') {
    if (now - lastAIChat < AI_DELAY) {
      const wait = Math.ceil((AI_DELAY - (now - lastAIChat)) / 1000);
      bot.chat(`Tunggu ${wait} detik sebelum menggunakan AI lagi.`);
      return;
    }

    let prompt = '';
    if (cmd === '!translate') prompt = `Terjemahkan teks ini ke Inggris: ${args.join(' ')}`;
    else if (cmd === '!motivasi') prompt = `Berikan 1 kalimat motivasi dalam bahasa Indonesia.`;
    else prompt = args.join(' ');

    const result = await askGemini(prompt);
    lastResponse = result;
    lastAIChat = Date.now();
    bot.chat(result);
  }

  else if (cmd === '!kick' && args[0]) {
    bot.chat(`/kick ${args[0]}`);
  }

  else if (cmd === '!info') {
    const players = Object.keys(bot.players).length;
    const pos = bot.entity.position;
    bot.chat(`Pemain online: ${players}. Posisi bot: ${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)}.`);
  }
});

async function askGemini(prompt) {
  try {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + process.env.GEMINI_API_KEY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Gagal mendapat balasan.';
  } catch {
    return 'Terjadi kesalahan saat menghubungi AI.';
  }
}

function scheduleExitAndJoin() {
  setInterval(() => {
    const now = moment().format('HH:mm');
    if (now === '22:00') {
      bot.chat('/say Bot keluar dulu ya, sampai besok!');
      bot.quit();
    }
  }, 60000);
}

function startBroadcasts() {
  setInterval(() => {
    const now = moment().format('HH:mm');
    if (now === '08:00') bot.chat('Selamat pagi! Jangan lupa semangat!');
    if (now === '09:00') bot.chat('Sudah jam 9, jangan lupa minum air!');
    if (now === '09:50') bot.chat('⚠️ Server akan mati jam 10 malam. Siapkan simpanan data!');
  }, 60000);
    }
