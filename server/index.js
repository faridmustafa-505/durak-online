const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path'); // <--- YENİ: Fayl yollarını tapmaq üçün lazımdır
const { createDeck, dealCards } = require('./gameLogic');

const app = express();
app.use(cors());

const server = http.createServer(app);

// Socket.io tənzimləmələri
const io = new Server(server, {
  cors: {
    origin: "*", // İstənilən yerdən qoşulmağa icazə ver
    methods: ["GET", "POST"]
  }
});

// --- OYUN MƏNTİQİ (Burada dəyişiklik yoxdur) ---
let rooms = {};

io.on('connection', (socket) => {
  console.log('İstifadəçi qoşuldu:', socket.id);

  socket.on('create_room', (playerName) => {
    const roomId = uuidv4().slice(0, 6).toUpperCase();
    rooms[roomId] = {
      id: roomId,
      players: [{ id: socket.id, name: playerName, hand: [], ready: false }],
      deck: [],
      field: [],
      trump: null,
      status: 'waiting',
      turnIndex: 0
    };
    socket.join(roomId);
    socket.emit('room_created', roomId);
    io.to(roomId).emit('update_room', rooms[roomId]);
  });

  socket.on('join_room', ({ roomId, playerName }) => {
    if (rooms[roomId] && rooms[roomId].players.length < 6 && rooms[roomId].status === 'waiting') {
      rooms[roomId].players.push({ id: socket.id, name: playerName, hand: [], ready: false });
      socket.join(roomId);
      io.to(roomId).emit('update_room', rooms[roomId]);
    } else {
      socket.emit('error', 'Otaq tapılmadı və ya doludur');
    }
  });

  socket.on('player_ready', (roomId) => {
    const room = rooms[roomId];
    if (!room) return;
    
    const player = room.players.find(p => p.id === socket.id);
    if (player) player.ready = !player.ready;

    if (room.players.length >= 2 && room.players.every(p => p.ready)) {
      room.status = 'playing';
      room.deck = createDeck();
      room.trump = room.deck[room.deck.length - 1];
      dealCards(room.deck, room.players);
      io.to(roomId).emit('game_started', room);
    } else {
      io.to(roomId).emit('update_room', room);
    }
  });

  socket.on('play_card', ({ roomId, card }) => {
    const room = rooms[roomId];
    if (!room) return;
    const player = room.players.find(p => p.id === socket.id);
    
    // Sadə yoxlama: Əgər oyunçuda bu kart varsa
    const cardIndex = player.hand.findIndex(c => c.id === card.id);
    if (cardIndex > -1) {
        player.hand.splice(cardIndex, 1); // Kartı əldən sil
        room.field.push({ card, player: player.name });
        room.turnIndex = (room.turnIndex + 1) % room.players.length;

        if (room.deck.length > 0 && room.players.some(p => p.hand.length < 6)) {
            dealCards(room.deck, room.players);
        }
        io.to(roomId).emit('update_game', room);
    }
  });

  socket.on('disconnect', () => {
    console.log('İstifadəçi ayrıldı:', socket.id);
    // Buraya otaqdan silinmə məntiqi əlavə oluna bilər
  });
});
// ------------------------------------------------

// --- YENİ HİSSƏ: STATIC FAYLLARIN PAYLANMASI ---

// 1. Node.js-ə deyirik ki, "client/dist" qovluğundakı fayllar (CSS, JS, Şəkillər) statikdir.
// __dirname = server faylının olduğu yer. Biz bir pillə geri çıxıb (../) client/dist-ə giririk.
const distPath = path.join(__dirname, '../client/dist');
app.use(express.static(distPath));

// 2. Əgər istifadəçi sadəcə sayta giribsə (məsələn: durak-game.onrender.com),
// ona index.html faylını göndər.
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// ------------------------------------------------

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`SERVER ISŞLƏYİR: ${PORT}`);
});
