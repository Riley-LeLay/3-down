// 3 Down Card Game

// Card value hierarchy for comparison
const CARD_VALUES = {
    '3': 3,
    '4': 4,
    '5': 5,
    '6': 6,
    '7': 7,
    '8': 8,
    '9': 9,
    'J': 11,
    'Q': 12,
    'K': 13,
    'A': 14,
    '2': 15,  // Reset cards - can be played on anything
    '10': 100, // Outside power structure
    'JOKER': 101
};

const SUITS = ['spades', 'clubs', 'hearts', 'diamonds'];
const VALUES = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];

const SUIT_SYMBOLS = {
    'spades': '♠',
    'clubs': '♣',
    'hearts': '♥',
    'diamonds': '♦'
};

// Check if suit is black (spades or clubs)
function isBlackSuit(suit) {
    return suit === 'spades' || suit === 'clubs';
}

// Check if suit is red (hearts or diamonds)
function isRedSuit(suit) {
    return suit === 'hearts' || suit === 'diamonds';
}

// Card class
class Card {
    constructor(value, suit = null) {
        this.value = value;
        this.suit = suit;
        this.isJoker = value === 'JOKER';
    }

    get numericValue() {
        return CARD_VALUES[this.value];
    }

    get isBlack() {
        return isBlackSuit(this.suit);
    }

    get isRed() {
        return isRedSuit(this.suit);
    }

    // Check if this is a glass card (red 3s)
    get isGlassCard() {
        return this.value === '3' && this.isRed;
    }

    // Check if this is the thumb card (4 of clubs)
    get isThumbCard() {
        return this.value === '4' && this.suit === 'clubs';
    }

    // Check if this is a reset card (any 2)
    get isResetCard() {
        return this.value === '2';
    }

    // Check if this is a skip card (any 8)
    get isSkipCard() {
        return this.value === '8';
    }

    // Check if this is a reverse card (any Jack)
    get isReverseCard() {
        return this.value === 'J';
    }

    // Check if this is a play-under-7 card (any 7)
    get isSevenCard() {
        return this.value === '7';
    }

    // Check if this is a discard/bomb card (any 10)
    get isTenCard() {
        return this.value === '10';
    }

    // Check if this is the Ace of Spades (can block Joker)
    get isAceOfSpades() {
        return this.value === 'A' && this.suit === 'spades';
    }

    get displayValue() {
        if (this.isJoker) return 'JOKER';
        return this.value;
    }

    get displaySuit() {
        if (this.isJoker) return '🃏';
        return SUIT_SYMBOLS[this.suit];
    }

    toString() {
        if (this.isJoker) return 'Joker';
        return `${this.value}${SUIT_SYMBOLS[this.suit]}`;
    }

    // Check if cards match for playing multiples
    matches(other) {
        return this.value === other.value;
    }
}

// Deck class
class Deck {
    constructor() {
        this.cards = [];
        this.init();
    }

    init() {
        this.cards = [];
        // Add all standard cards
        for (const suit of SUITS) {
            for (const value of VALUES) {
                this.cards.push(new Card(value, suit));
            }
        }
        // Add one Joker
        this.cards.push(new Card('JOKER'));
    }

    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    draw() {
        return this.cards.pop();
    }

    get isEmpty() {
        return this.cards.length === 0;
    }

    get count() {
        return this.cards.length;
    }
}

// Player class
class Player {
    constructor(name, index) {
        this.name = name;
        this.index = index;
        this.hand = [];
        this.faceUp = [];
        this.faceDown = [];
        this.hasFinished = false;
        this.finishPosition = null;
    }

    get totalCards() {
        return this.hand.length + this.faceUp.length + this.faceDown.length;
    }

    get isOut() {
        return this.totalCards === 0;
    }

    // Get cards available to play
    getPlayableCards() {
        if (this.hand.length > 0) {
            return { cards: this.hand, source: 'hand' };
        } else if (this.faceUp.length > 0) {
            return { cards: this.faceUp, source: 'faceUp' };
        } else if (this.faceDown.length > 0) {
            // Can only flip one face-down card at a time
            return { cards: this.faceDown, source: 'faceDown' };
        }
        return { cards: [], source: null };
    }

    hasThumbCard() {
        return this.hand.some(card => card.isThumbCard);
    }

    hasAceOfSpades() {
        return this.hand.some(card => card.isAceOfSpades) ||
               this.faceUp.some(card => card.isAceOfSpades);
    }

    removeCards(cards, source) {
        const cardSet = new Set(cards);
        if (source === 'hand') {
            this.hand = this.hand.filter(c => !cardSet.has(c));
        } else if (source === 'faceUp') {
            this.faceUp = this.faceUp.filter(c => !cardSet.has(c));
        } else if (source === 'faceDown') {
            this.faceDown = this.faceDown.filter(c => !cardSet.has(c));
        }
    }

    addToHand(cards) {
        if (Array.isArray(cards)) {
            this.hand.push(...cards);
        } else {
            this.hand.push(cards);
        }
    }
}

// Main Game class
class Game {
    constructor() {
        this.players = [];
        this.deck = null;
        this.playPile = [];
        this.discardPile = [];
        this.currentPlayerIndex = 0;
        this.direction = 1; // 1 = clockwise, -1 = counter-clockwise
        this.mustPlayUnder7 = false;
        this.skipCount = 0;
        this.finishOrder = [];
        this.gamePhase = 'setup'; // setup, swap, play, gameover
        this.swapPlayerIndex = 0;
        this.selectedSwapHandCard = null;
        this.selectedCards = [];
        this.thumbActive = false;
        this.thumbReactions = {};
        this.jokerPending = false;
        this.jokerTargetIndex = null;

        this.initEventListeners();
    }

    initEventListeners() {
        document.getElementById('player-count').addEventListener('change', (e) => {
            this.updatePlayerNameInputs(parseInt(e.target.value));
        });

        document.getElementById('start-game-btn').addEventListener('click', () => {
            this.startGame();
        });

        document.getElementById('done-swap-btn').addEventListener('click', () => {
            this.finishSwapPhase();
        });

        document.getElementById('play-selected-btn').addEventListener('click', () => {
            this.playSelectedCards();
        });

        document.getElementById('pickup-pile-btn').addEventListener('click', () => {
            this.pickupPile();
        });

        document.getElementById('thumb-btn').addEventListener('click', () => {
            this.activateThumb();
        });

        document.getElementById('thumb-react-btn').addEventListener('click', () => {
            this.reactToThumb();
        });

        document.getElementById('joker-defend-btn').addEventListener('click', () => {
            this.defendAgainstJoker();
        });

        document.getElementById('joker-pickup-btn').addEventListener('click', () => {
            this.pickupFromJoker();
        });

        document.getElementById('play-again-btn').addEventListener('click', () => {
            location.reload();
        });
    }

    updatePlayerNameInputs(count) {
        const container = document.getElementById('player-names');
        container.innerHTML = '';
        for (let i = 0; i < count; i++) {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'player-name';
            input.placeholder = `Player ${i + 1} Name`;
            input.dataset.player = i;
            container.appendChild(input);
        }
    }

    startGame() {
        const playerCount = parseInt(document.getElementById('player-count').value);
        const nameInputs = document.querySelectorAll('.player-name');

        this.players = [];
        nameInputs.forEach((input, index) => {
            const name = input.value.trim() || `Player ${index + 1}`;
            this.players.push(new Player(name, index));
        });

        this.deck = new Deck();
        this.deck.shuffle();
        this.dealCards();

        this.showScreen('swap-screen');
        this.gamePhase = 'swap';
        this.swapPlayerIndex = 0;
        this.showSwapPhase();
    }

    dealCards() {
        // Deal 3 face-down cards to each player (one at a time)
        for (let round = 0; round < 3; round++) {
            for (const player of this.players) {
                player.faceDown.push(this.deck.draw());
            }
        }

        // Deal 3 face-up cards to each player (one at a time)
        for (let round = 0; round < 3; round++) {
            for (const player of this.players) {
                player.faceUp.push(this.deck.draw());
            }
        }

        // Deal 5 hand cards to each player
        for (let round = 0; round < 5; round++) {
            for (const player of this.players) {
                player.hand.push(this.deck.draw());
            }
        }
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        document.getElementById(screenId).classList.remove('hidden');
    }

    showSwapPhase() {
        const player = this.players[this.swapPlayerIndex];
        document.getElementById('swap-player-name').textContent = player.name;

        this.renderSwapCards();
    }

    renderSwapCards() {
        const player = this.players[this.swapPlayerIndex];

        // Render hand cards
        const handContainer = document.getElementById('swap-hand-cards');
        handContainer.innerHTML = '';
        player.hand.forEach((card, index) => {
            const cardEl = this.createCardElement(card);
            cardEl.dataset.index = index;
            cardEl.dataset.source = 'hand';
            cardEl.addEventListener('click', () => this.selectSwapCard(cardEl, card, 'hand', index));
            handContainer.appendChild(cardEl);
        });

        // Render face-up cards
        const faceUpContainer = document.getElementById('swap-faceup-cards');
        faceUpContainer.innerHTML = '';
        player.faceUp.forEach((card, index) => {
            const cardEl = this.createCardElement(card);
            cardEl.dataset.index = index;
            cardEl.dataset.source = 'faceUp';
            cardEl.addEventListener('click', () => this.selectSwapCard(cardEl, card, 'faceUp', index));
            faceUpContainer.appendChild(cardEl);
        });

        // Render face-down cards (just card backs)
        const faceDownContainer = document.getElementById('swap-facedown-cards');
        faceDownContainer.innerHTML = '';
        player.faceDown.forEach((card, index) => {
            const cardEl = document.createElement('div');
            cardEl.className = 'card card-back';
            faceDownContainer.appendChild(cardEl);
        });
    }

    selectSwapCard(cardEl, card, source, index) {
        const player = this.players[this.swapPlayerIndex];

        if (source === 'hand') {
            // Select hand card for swapping
            document.querySelectorAll('#swap-hand-cards .card').forEach(c => c.classList.remove('selected'));
            cardEl.classList.add('selected');
            this.selectedSwapHandCard = { card, index };
        } else if (source === 'faceUp' && this.selectedSwapHandCard) {
            // Swap with face-up card
            const handIndex = this.selectedSwapHandCard.index;
            const faceUpIndex = index;

            // Perform swap
            const temp = player.hand[handIndex];
            player.hand[handIndex] = player.faceUp[faceUpIndex];
            player.faceUp[faceUpIndex] = temp;

            this.selectedSwapHandCard = null;
            this.renderSwapCards();
        }
    }

    finishSwapPhase() {
        this.swapPlayerIndex++;
        this.selectedSwapHandCard = null;

        if (this.swapPlayerIndex >= this.players.length) {
            // All players done swapping
            this.startPlayPhase();
        } else {
            this.showSwapPhase();
        }
    }

    startPlayPhase() {
        this.gamePhase = 'play';
        this.showScreen('game-screen');

        // Find the player with the lowest card to start
        this.currentPlayerIndex = this.findStartingPlayer();

        this.renderGame();
    }

    findStartingPlayer() {
        // Find player with black 3 (lowest), or next lowest card
        let lowestValue = Infinity;
        let startingPlayer = 0;

        for (let i = 0; i < this.players.length; i++) {
            const player = this.players[i];
            for (const card of player.hand) {
                // Black 3s are the lowest
                if (card.value === '3' && card.isBlack) {
                    if (CARD_VALUES['3'] < lowestValue) {
                        lowestValue = CARD_VALUES['3'];
                        startingPlayer = i;
                    }
                }
            }
        }

        // If no black 3 found, find the overall lowest card
        if (lowestValue === Infinity) {
            for (let i = 0; i < this.players.length; i++) {
                const player = this.players[i];
                for (const card of player.hand) {
                    const val = card.numericValue;
                    if (val < lowestValue) {
                        lowestValue = val;
                        startingPlayer = i;
                    }
                }
            }
        }

        return startingPlayer;
    }

    createCardElement(card, faceDown = false) {
        const cardEl = document.createElement('div');

        if (faceDown) {
            cardEl.className = 'card card-back';
            return cardEl;
        }

        if (card.isJoker) {
            cardEl.className = 'card card-front joker';
            cardEl.innerHTML = `
                <span class="card-value">JOKER</span>
                <span class="card-suit">🃏</span>
            `;
        } else {
            const colorClass = card.isRed ? 'red' : 'black';
            let specialClass = '';
            if (card.isGlassCard) specialClass = ' glass-card';
            if (card.isThumbCard) specialClass = ' thumb-card';
            if (card.isResetCard) specialClass = ' reset-card';

            cardEl.className = `card card-front ${colorClass}${specialClass}`;
            cardEl.innerHTML = `
                <span class="card-value">${card.displayValue}</span>
                <span class="card-suit">${card.displaySuit}</span>
            `;
        }

        return cardEl;
    }

    renderGame() {
        this.renderOpponents();
        this.renderCenterArea();
        this.renderCurrentPlayer();
        this.updateGameInfo();
        this.updateActionButtons();
    }

    renderOpponents() {
        const container = document.getElementById('opponents-area');
        container.innerHTML = '';

        for (let i = 0; i < this.players.length; i++) {
            if (i === this.currentPlayerIndex) continue;

            const player = this.players[i];
            const opponentDiv = document.createElement('div');
            opponentDiv.className = 'opponent' + (player.hasFinished ? ' finished' : '');

            if (i === this.getNextPlayerIndex()) {
                opponentDiv.classList.add('active');
            }

            let statusText = '';
            if (player.hasFinished) {
                statusText = ` (#${player.finishPosition})`;
            }

            opponentDiv.innerHTML = `
                <h4>${player.name}${statusText}</h4>
                <div class="opponent-cards">
                    <div>
                        <div style="display:flex;gap:2px;justify-content:center;">
                            ${player.faceDown.map(() => '<div class="card card-back"></div>').join('')}
                        </div>
                        <div class="mini-card-count">Face-down: ${player.faceDown.length}</div>
                    </div>
                </div>
                <div class="opponent-cards">
                    <div>
                        <div style="display:flex;gap:2px;justify-content:center;flex-wrap:wrap;">
                            ${player.faceUp.map(card => this.createCardElement(card).outerHTML).join('')}
                        </div>
                        <div class="mini-card-count">Face-up: ${player.faceUp.length}</div>
                    </div>
                </div>
                <div class="mini-card-count">Hand: ${player.hand.length} cards</div>
            `;

            container.appendChild(opponentDiv);
        }
    }

    renderCenterArea() {
        // Pickup pile
        document.getElementById('pickup-count').textContent = this.deck.count;

        // Play pile - show top cards
        const playPileCards = document.getElementById('play-pile-cards');
        playPileCards.innerHTML = '';

        // Show top few cards of play pile
        const topCards = this.playPile.slice(-4);
        topCards.forEach(card => {
            const cardEl = this.createCardElement(card);
            playPileCards.appendChild(cardEl);
        });

        document.getElementById('play-pile-count').textContent = `${this.playPile.length} cards`;

        // Discard pile
        document.getElementById('discard-count').textContent = this.discardPile.length;
    }

    renderCurrentPlayer() {
        const player = this.players[this.currentPlayerIndex];
        const { cards: playableCards, source } = player.getPlayableCards();

        // Face-down cards
        const faceDownContainer = document.getElementById('player-facedown');
        faceDownContainer.innerHTML = '';
        player.faceDown.forEach((card, index) => {
            const cardEl = document.createElement('div');
            cardEl.className = 'card card-back';
            if (source === 'faceDown') {
                cardEl.style.cursor = 'pointer';
                cardEl.addEventListener('click', () => this.selectFaceDownCard(index));
            }
            faceDownContainer.appendChild(cardEl);
        });

        // Face-up cards
        const faceUpContainer = document.getElementById('player-faceup');
        faceUpContainer.innerHTML = '';
        player.faceUp.forEach((card, index) => {
            const cardEl = this.createCardElement(card);
            if (source === 'faceUp') {
                cardEl.addEventListener('click', () => this.toggleCardSelection(card, 'faceUp'));
                if (this.selectedCards.includes(card)) {
                    cardEl.classList.add('selected');
                }
            } else {
                cardEl.classList.add('disabled');
            }
            faceUpContainer.appendChild(cardEl);
        });

        // Hand cards
        const handContainer = document.getElementById('player-hand');
        handContainer.innerHTML = '';
        player.hand.forEach((card, index) => {
            const cardEl = this.createCardElement(card);
            if (source === 'hand') {
                cardEl.addEventListener('click', () => this.toggleCardSelection(card, 'hand'));
                if (this.selectedCards.includes(card)) {
                    cardEl.classList.add('selected');
                }
            } else {
                cardEl.classList.add('disabled');
            }
            handContainer.appendChild(cardEl);
        });
    }

    toggleCardSelection(card, source) {
        const index = this.selectedCards.indexOf(card);

        if (index === -1) {
            // Check if this card can be added to selection
            if (this.selectedCards.length === 0) {
                this.selectedCards.push(card);
            } else {
                // Must match the value of already selected cards
                if (card.matches(this.selectedCards[0])) {
                    this.selectedCards.push(card);
                } else {
                    // Deselect all and select this one
                    this.selectedCards = [card];
                }
            }
        } else {
            this.selectedCards.splice(index, 1);
        }

        this.renderCurrentPlayer();
        this.updateActionButtons();
    }

    selectFaceDownCard(index) {
        const player = this.players[this.currentPlayerIndex];
        if (player.hand.length > 0 || player.faceUp.length > 0) return;

        const card = player.faceDown[index];
        this.selectedCards = [card];

        // Flip and attempt to play
        this.playSelectedCards();
    }

    updateGameInfo() {
        const player = this.players[this.currentPlayerIndex];
        document.getElementById('current-player-name').textContent = player.name;
        document.getElementById('play-direction').textContent =
            this.direction === 1 ? 'Clockwise ↻' : 'Counter-clockwise ↺';

        let status = '';
        if (this.mustPlayUnder7) {
            status = 'Must play under 7!';
        }
        document.getElementById('special-status').textContent = status;
    }

    updateActionButtons() {
        const playBtn = document.getElementById('play-selected-btn');
        const thumbBtn = document.getElementById('thumb-btn');
        const player = this.players[this.currentPlayerIndex];

        // Enable play button if cards are selected and valid
        playBtn.disabled = this.selectedCards.length === 0 || !this.isValidPlay(this.selectedCards);

        // Show thumb button if player has the thumb card
        if (player.hasThumbCard() && player.hand.length > 0) {
            thumbBtn.classList.remove('hidden');
        } else {
            thumbBtn.classList.add('hidden');
        }
    }

    getTopCard() {
        if (this.playPile.length === 0) return null;
        return this.playPile[this.playPile.length - 1];
    }

    getEffectiveTopCard() {
        // Get the effective top card (accounting for glass cards)
        if (this.playPile.length === 0) return null;

        let effectiveCard = null;
        for (let i = this.playPile.length - 1; i >= 0; i--) {
            const card = this.playPile[i];
            if (!card.isGlassCard) {
                effectiveCard = card;
                break;
            }
        }
        return effectiveCard;
    }

    isValidPlay(cards) {
        if (cards.length === 0) return false;

        // All cards must have the same value
        const firstValue = cards[0].value;
        if (!cards.every(c => c.value === firstValue)) return false;

        const card = cards[0];
        const topCard = this.getEffectiveTopCard();

        // Joker can always be played
        if (card.isJoker) return true;

        // 10s can always be played (outside power structure)
        if (card.isTenCard) return true;

        // 2s (reset cards) can always be played
        if (card.isResetCard) return true;

        // Glass cards (red 3s) can be played on anything except 10 or Joker
        if (card.isGlassCard) {
            if (topCard && (topCard.isTenCard || topCard.isJoker)) {
                return false;
            }
            return true;
        }

        // If pile is empty, any card can be played
        if (!topCard) return true;

        // If must play under 7
        if (this.mustPlayUnder7) {
            return card.numericValue < CARD_VALUES['7'];
        }

        // Normal play - must be equal or higher value
        return card.numericValue >= topCard.numericValue;
    }

    playSelectedCards() {
        if (this.selectedCards.length === 0) return;
        if (!this.isValidPlay(this.selectedCards)) {
            this.showMessage('Invalid play!');
            return;
        }

        const player = this.players[this.currentPlayerIndex];
        const { source } = player.getPlayableCards();
        const cards = [...this.selectedCards];
        const card = cards[0];

        // For face-down cards, check if play is valid after reveal
        if (source === 'faceDown') {
            if (!this.isValidPlay(cards)) {
                // Must pick up pile plus the revealed card
                this.showMessage(`${player.name} flipped ${card.toString()} - must pick up the pile!`);
                player.removeCards(cards, source);
                player.addToHand(cards);
                player.addToHand(this.playPile);
                this.playPile = [];
                this.selectedCards = [];
                this.mustPlayUnder7 = false;
                this.advanceTurn();
                return;
            }
        }

        // Remove cards from player
        player.removeCards(cards, source);

        // Add cards to play pile
        this.playPile.push(...cards);

        // Clear selection
        this.selectedCards = [];

        // Reset must play under 7 flag
        this.mustPlayUnder7 = false;

        // Check for four of a kind (bomb)
        if (this.checkForFourOfAKind()) {
            this.discardPlayPile();
            this.showMessage('Four of a kind! Pile discarded!');
            this.drawToMinimum(player);
            this.checkPlayerFinished(player);
            this.renderGame();
            return;
        }

        // Handle card abilities
        this.handleCardAbility(cards, player);
    }

    handleCardAbility(cards, player) {
        const card = cards[0];
        const count = cards.length;

        // Joker
        if (card.isJoker) {
            this.handleJoker(player);
            return;
        }

        // 10s - discard pile, player goes again
        if (card.isTenCard) {
            this.discardPlayPile();
            this.showMessage('10 played! Pile discarded! Play again!');
            this.drawToMinimum(player);
            this.checkPlayerFinished(player);
            this.renderGame();
            return;
        }

        // 8s - skip players
        if (card.isSkipCard) {
            if (count === 4) {
                this.discardPlayPile();
                this.showMessage('Four 8s! Pile discarded!');
            } else {
                this.skipCount = count;
                this.showMessage(`${count} 8(s) played! Skipping ${count} player(s)!`);
            }
            this.drawToMinimum(player);
            this.checkPlayerFinished(player);
            this.advanceTurn();
            return;
        }

        // 7s - next player must play under 7
        if (card.isSevenCard) {
            this.mustPlayUnder7 = true;
            this.showMessage('7 played! Next player must play under 7!');
            this.drawToMinimum(player);
            this.checkPlayerFinished(player);
            this.advanceTurn();
            return;
        }

        // Jacks - reverse
        if (card.isReverseCard) {
            if (count === 4) {
                this.discardPlayPile();
                this.showMessage('Four Jacks! Pile discarded!');
            } else if (count % 2 === 1) {
                this.direction *= -1;
                this.showMessage('Jack played! Direction reversed!');
            } else {
                this.showMessage('Two Jacks! Direction stays the same!');
            }
            this.drawToMinimum(player);
            this.checkPlayerFinished(player);
            this.advanceTurn();
            return;
        }

        // 2s - reset (already on pile, just advance)
        if (card.isResetCard) {
            this.showMessage('2 played! Value reset!');
            this.drawToMinimum(player);
            this.checkPlayerFinished(player);
            this.advanceTurn();
            return;
        }

        // Glass cards - copy the card below
        if (card.isGlassCard) {
            this.showMessage('Glass card played! Copies the card below.');
            this.drawToMinimum(player);
            this.checkPlayerFinished(player);
            this.advanceTurn();
            return;
        }

        // Normal cards
        this.drawToMinimum(player);
        this.checkPlayerFinished(player);
        this.advanceTurn();
    }

    handleJoker(player) {
        const nextIndex = this.getNextPlayerIndex();
        const nextPlayer = this.players[nextIndex];

        this.jokerPending = true;
        this.jokerTargetIndex = nextIndex;

        document.getElementById('joker-target-name').textContent = nextPlayer.name;

        // Check if target has Ace of Spades
        if (nextPlayer.hasAceOfSpades()) {
            document.getElementById('joker-defend-btn').classList.remove('hidden');
        } else {
            document.getElementById('joker-defend-btn').classList.add('hidden');
        }

        document.getElementById('joker-modal').classList.remove('hidden');
        this.drawToMinimum(player);
    }

    defendAgainstJoker() {
        const targetPlayer = this.players[this.jokerTargetIndex];
        const jokerPlayer = this.players[this.currentPlayerIndex];

        // Remove Ace of Spades from target player
        let aceCard = targetPlayer.hand.find(c => c.isAceOfSpades);
        let source = 'hand';
        if (!aceCard) {
            aceCard = targetPlayer.faceUp.find(c => c.isAceOfSpades);
            source = 'faceUp';
        }

        targetPlayer.removeCards([aceCard], source);
        this.discardPile.push(aceCard);

        // Joker player picks up pile (excluding the Joker which goes to discard)
        const joker = this.playPile.pop();
        this.discardPile.push(joker);
        jokerPlayer.addToHand(this.playPile);
        this.playPile = [];

        this.showMessage(`${targetPlayer.name} defended with Ace of Spades! ${jokerPlayer.name} picks up the pile!`);

        document.getElementById('joker-modal').classList.add('hidden');
        this.jokerPending = false;

        // Target player gets to play on empty pile
        this.currentPlayerIndex = this.jokerTargetIndex;
        this.jokerTargetIndex = null;
        this.checkPlayerFinished(targetPlayer);
        this.renderGame();
    }

    pickupFromJoker() {
        const targetPlayer = this.players[this.jokerTargetIndex];

        // Move joker to discard
        const joker = this.playPile.pop();
        this.discardPile.push(joker);

        // Target picks up remaining pile
        targetPlayer.addToHand(this.playPile);
        this.playPile = [];

        this.showMessage(`${targetPlayer.name} picks up the pile!`);

        document.getElementById('joker-modal').classList.add('hidden');
        this.jokerPending = false;

        // Next player after target gets to play
        this.currentPlayerIndex = this.jokerTargetIndex;
        this.jokerTargetIndex = null;
        this.advanceTurn();
    }

    activateThumb() {
        const player = this.players[this.currentPlayerIndex];
        if (!player.hasThumbCard()) return;

        // Remove thumb card from hand and discard it
        const thumbCard = player.hand.find(c => c.isThumbCard);
        player.removeCards([thumbCard], 'hand');
        this.discardPile.push(thumbCard);

        this.thumbActive = true;
        this.thumbReactions = {};

        // Show thumb modal to all other players
        document.getElementById('thumb-modal').classList.remove('hidden');

        // Simulate AI reaction (for non-current players)
        setTimeout(() => {
            // In a real multiplayer game, each player would click
            // For now, simulate with random delays
            this.players.forEach((p, i) => {
                if (i !== this.currentPlayerIndex && !p.hasFinished) {
                    const delay = Math.random() * 2000 + 500;
                    setTimeout(() => {
                        if (this.thumbActive) {
                            this.thumbReactions[i] = Date.now();
                        }
                    }, delay);
                }
            });
        }, 100);
    }

    reactToThumb() {
        // Current player (viewing) reacts
        const viewingPlayerIndex = this.currentPlayerIndex;

        // Record reaction
        this.thumbReactions[viewingPlayerIndex] = Date.now();

        // For demo purposes, end thumb phase after a delay
        setTimeout(() => {
            this.endThumbPhase();
        }, 2000);
    }

    endThumbPhase() {
        if (!this.thumbActive) return;

        document.getElementById('thumb-modal').classList.add('hidden');
        this.thumbActive = false;

        // Find the slowest player (or one who didn't react)
        let slowestIndex = -1;
        let slowestTime = -1;

        for (let i = 0; i < this.players.length; i++) {
            if (i === this.currentPlayerIndex || this.players[i].hasFinished) continue;

            const reactionTime = this.thumbReactions[i];
            if (reactionTime === undefined) {
                // Didn't react at all - they're the loser
                slowestIndex = i;
                break;
            }
            if (reactionTime > slowestTime) {
                slowestTime = reactionTime;
                slowestIndex = i;
            }
        }

        if (slowestIndex !== -1) {
            const loser = this.players[slowestIndex];
            loser.addToHand(this.playPile);
            this.playPile = [];
            this.showMessage(`${loser.name} was slowest and picks up the pile!`);
        }

        this.advanceTurn();
    }

    checkForFourOfAKind() {
        if (this.playPile.length < 4) return false;

        const topFour = this.playPile.slice(-4);
        const firstValue = topFour[0].value;
        return topFour.every(c => c.value === firstValue);
    }

    discardPlayPile() {
        this.discardPile.push(...this.playPile);
        this.playPile = [];
    }

    pickupPile() {
        const player = this.players[this.currentPlayerIndex];
        player.addToHand(this.playPile);
        this.playPile = [];
        this.mustPlayUnder7 = false;
        this.selectedCards = [];
        this.showMessage(`${player.name} picks up the pile!`);
        this.advanceTurn();
    }

    drawToMinimum(player) {
        // Players must have minimum 3 cards in hand while deck has cards
        while (player.hand.length < 3 && !this.deck.isEmpty) {
            player.addToHand(this.deck.draw());
        }
    }

    checkPlayerFinished(player) {
        if (player.isOut && !player.hasFinished) {
            player.hasFinished = true;
            player.finishPosition = this.finishOrder.length + 1;
            this.finishOrder.push(player);
            this.showMessage(`${player.name} finished in position ${player.finishPosition}!`);

            // Check if game is over (only one player left)
            const activePlayers = this.players.filter(p => !p.hasFinished);
            if (activePlayers.length <= 1) {
                if (activePlayers.length === 1) {
                    const lastPlayer = activePlayers[0];
                    lastPlayer.hasFinished = true;
                    lastPlayer.finishPosition = this.finishOrder.length + 1;
                    this.finishOrder.push(lastPlayer);
                }
                this.endGame();
            }
        }
    }

    getNextPlayerIndex() {
        let index = this.currentPlayerIndex;
        let skipsRemaining = Math.max(1, this.skipCount);

        while (skipsRemaining > 0) {
            index = (index + this.direction + this.players.length) % this.players.length;
            if (!this.players[index].hasFinished) {
                skipsRemaining--;
            }
            // Safety check to prevent infinite loop
            if (index === this.currentPlayerIndex) break;
        }

        return index;
    }

    advanceTurn() {
        this.currentPlayerIndex = this.getNextPlayerIndex();
        this.skipCount = 0;
        this.selectedCards = [];

        // Check if current player has finished
        while (this.players[this.currentPlayerIndex].hasFinished) {
            this.currentPlayerIndex = this.getNextPlayerIndex();
        }

        this.renderGame();
    }

    showMessage(text) {
        const messageArea = document.getElementById('message-area');
        messageArea.textContent = text;
        messageArea.classList.add('show');
        setTimeout(() => {
            messageArea.classList.remove('show');
        }, 3000);
    }

    endGame() {
        this.gamePhase = 'gameover';
        this.showScreen('gameover-screen');

        const rankingsDiv = document.getElementById('rankings');
        rankingsDiv.innerHTML = '';

        this.finishOrder.forEach((player, index) => {
            const entry = document.createElement('div');
            entry.className = 'ranking-entry' + (index === 0 ? ' first' : '');
            entry.innerHTML = `
                <span class="ranking-position">#${index + 1}</span>
                <span class="ranking-name">${player.name}</span>
            `;
            rankingsDiv.appendChild(entry);
        });
    }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
});
