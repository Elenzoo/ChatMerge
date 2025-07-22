const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const tmi = require("tmi.js");
const { LiveChat } = require("youtube-chat");
const { getLiveVideoId } = require("./ytChatReader");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

server.listen(3000, () => {
  console.log("✅ Serwer działa na http://localhost:3000");
});

// === TWITCH CHAT ===
const twitchClient = new tmi.Client({
  options: { debug: true },
  connection: {
    reconnect: true,
    secure: true
  },
  channels: ['kajma']
});

twitchClient.connect();

twitchClient.on('message', (channel, tags, message, self) => {
  if (self) return;

  io.emit('chatMessage', {
    source: 'Twitch',
    text: `${tags['display-name']}: ${message}`,
    timestamp: Date.now()
  });
});

// === YOUTUBE CHAT ===
async function startYouTubeChat(channelUrl) {
  const videoId = await getLiveVideoId(channelUrl);

  if (!videoId) {
    console.log("📭 Brak aktywnego streama na YouTube");
    return;
  }

  console.log("🔴 YouTube Live ID:", videoId);

  const chat = new LiveChat({ liveId: videoId });

  chat.on("chat", (msg) => {
    const messageText = Array.isArray(msg.message)
      ? msg.message.map(m => m.text).join(' ')
      : msg.message.text || msg.message;

    const text = `${msg.author.name}: ${messageText}`;

    io.emit("chatMessage", {
      source: "YouTube",
      text,
      timestamp: Date.now()
    });
  });

  chat.on("end", () => {
    console.log("📴 Live zakończony");
  });

  await chat.start();
}

// 👉 Ustaw adres kanału YouTube (nie /live, tylko główny)
startYouTubeChat("https://www.youtube.com/@Kajma");
