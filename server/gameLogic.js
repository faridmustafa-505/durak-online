const suits = ['♥', '♦', '♣', '♠'];
const ranks = ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

const createDeck = () => {
  let deck = [];
  for (let suit of suits) {
    for (let rank of ranks) {
      deck.push({ suit, rank, id: `${rank}${suit}` });
    }
  }
  return deck.sort(() => Math.random() - 0.5); // Qarışdırma
};

const dealCards = (deck, players) => {
  players.forEach(player => {
    while (player.hand.length < 6 && deck.length > 0) {
      player.hand.push(deck.pop());
    }
  });
};

module.exports = { createDeck, dealCards };
