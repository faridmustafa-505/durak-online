import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { motion } from 'framer-motion';
import { Howl } from 'howler';
import './App.css';

// Server URL (Render.com-da bu hissə dəyişəcək)
const socket = io.connect('http://localhost:3001'); 

// Səs effektləri
const playSound = new Howl({ src: ['/assets/card-flip.mp3'] }); // Placeholder

function App() {
  const [isInRoom, setIsInRoom] = useState(false);
  const [room, setRoom] = useState(null);
  const [name, setName] = useState('');
  const [roomIdInput, setRoomIdInput] = useState('');
  
  useEffect(() => {
    socket.on('room_created', (id) => {
      setIsInRoom(true);
    });

    socket.on('update_room', (updatedRoom) => {
      setRoom(updatedRoom);
    });

    socket.on('game_started', (updatedRoom) => {
      setRoom(updatedRoom);
    });

    socket.on('update_game', (updatedRoom) => {
        setRoom(updatedRoom);
        playSound.play(); // Kart səsi
    });

    return () => socket.off();
  }, []);

  const createRoom = () => {
    if (name) socket.emit('create_room', name);
  };

  const joinRoom = () => {
    if (name && roomIdInput) socket.emit('join_room', { roomId: roomIdInput, playerName: name });
    setIsInRoom(true);
  };

  const setReady = () => {
    if (room) socket.emit('player_ready', room.id);
  };

  const playCard = (card) => {
      // Sadəcə nümayiş üçün: Öz növbənizdirsə
      socket.emit('play_card', { roomId: room.id, card });
  };

  if (!isInRoom) {
    return (
      <div className="lobby-container">
        <h1>Durak Online ♠️</h1>
        <input placeholder="Adınız" onChange={(e) => setName(e.target.value)} />
        <button onClick={createRoom}>Otaq Yarat</button>
        <div className="join-section">
            <input placeholder="Otaq Kodu" onChange={(e) => setRoomIdInput(e.target.value)} />
            <button onClick={joinRoom}>Qoşul</button>
        </div>
      </div>
    );
  }

  if (room && room.status === 'waiting') {
    return (
      <div className="waiting-room">
        <h2>Otaq Kodu: {room.id}</h2>
        <p>Dostlarınıza göndərin!</p>
        <ul>
          {room.players.map((p, i) => (
            <li key={i}>{p.name} {p.ready ? '✅ Hazırdır' : '⏳ Gözləyir'}</li>
          ))}
        </ul>
        <button className="ready-btn" onClick={setReady}>HAZIRAM</button>
      </div>
    );
  }

  if (room && room.status === 'playing') {
      const myPlayer = room.players.find(p => p.id === socket.id);
      
      return (
          <div className="game-board">
              <div className="top-info">
                  <span>Kozır: {room.trump.suit} {room.trump.rank}</span>
                  <span>Dəstə: {room.deck.length} kart</span>
              </div>

              {/* Masa (Field) */}
              <div className="field">
                  {room.field.map((item, index) => (
                      <motion.div 
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="card field-card" 
                        key={index}>
                          {item.card.rank}{item.card.suit}
                      </motion.div>
                  ))}
              </div>

              {/* Mənim Əlim */}
              <div className="my-hand">
                  {myPlayer && myPlayer.hand.map((card) => (
                      <div 
                        key={card.id} 
                        className={`card ${['♥', '♦'].includes(card.suit) ? 'red' : 'black'}`}
                        onClick={() => playCard(card)}
                      >
                          {card.rank}{card.suit}
                      </div>
                  ))}
              </div>
          </div>
      );
  }

  return <div>Yüklənir...</div>;
}

export default App;
