const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { createDeck, dealCards } = require('./gameLogic');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

let rooms = {}; // Otaqlar: { roomId: { players, deck, trump, field, turnIndex } }

io.on('connection', (socket) => {
  console.log('İstifadəçi qoşuldu:', socket.id);

  // Otaq yaratmaq
  socket.on('create_room', (playerName) => {
    const roomId = uuidv4().slice(0, 6).toUpperCase();
    rooms[roomId] = {
      id: roomId,
      players: [{ id: socket.id, name: playerName, hand: [], ready: false }],
      deck: [],
      field: [], // Masadakı kartlar
      trump: null,
      status: 'waiting', // waiting, playing
      turnIndex: 0
    };
    socket.join(roomId);
    socket.emit('room_created', roomId);
    io.to(roomId).emit('update_room', rooms[roomId]);
  });

  // Otağa qoşulmaq
  socket.on('join_room', ({ roomId, playerName }) => {
    if (rooms[roomId] && rooms[roomId].players.length < 6 && rooms[roomId].status === 'waiting') {
      rooms[roomId].players.push({ id: socket.id, name: playerName, hand: [], ready: false });
      socket.join(roomId);
      io.to(roomId).emit('update_room', rooms[roomId]);
    } else {
      socket.emit('error', 'Otaq tapılmadı və ya doludur');
    }
  });

  // Hazır olmaq və oyunu başlatmaq
  socket.on('player_ready', (roomId) => {
    const room = rooms[roomId];
    if (!room) return;
    
    const player = room.players.find(p => p.id === socket.id);
    if (player) player.ready = !player.ready;

    // Hər kəs hazırdırsa başlat
    if (room.players.length >= 2 && room.players.every(p => p.ready)) {
      room.status = 'playing';
      room.deck = createDeck();
      room.trump = room.deck[room.deck.length - 1]; // Sonuncu kart kozır
      dealCards(room.deck, room.players);
      io.to(roomId).emit('game_started', room);
    } else {
      io.to(roomId).emit('update_room', room);
    }
  });

  // Kart atmaq (Hücum və ya Müdafiə)
  socket.on('play_card', ({ roomId, card }) => {
    const room = rooms[roomId];
    if (!room) return;

    // Sadələşdirilmiş yoxlama (Real layihədə qaydalar dərinləşməlidir)
    const player = room.players.find(p => p.id === socket.id);
    
    // Oyunçunun əlindən kartı sil
    player.hand = player.hand.filter(c => c.id !== card.id);
    
    // Masaya əlavə et
    room.field.push({ card, player: player.name });
    
    // Növbəni dəyiş (Sadə məntiq)
    room.turnIndex = (room.turnIndex + 1) % room.players.length;

    // Kartlar bitibsə yenidən payla
    if (room.deck.length > 0 && room.players.some(p => p.hand.length < 6)) {
        dealCards(room.deck, room.players);
    }

    io.to(roomId).emit('update_game', room);
  });

  socket.on('disconnect', () => {
    // Oyunçu çıxanda otağı təmizləmək məntiqi bura yazılmalıdır
  });
});

server.listen(3001, () => {
  console.log('SERVER QAÇIR: 3001');
});
