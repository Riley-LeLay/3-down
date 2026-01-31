// 3 Down Card Game

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
    '2': 15,
    '10': 100,
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

function isBlackSuit(suit) {
    return suit === 'spades' || suit === 'clubs';
}

function isRedSuit(suit) {
    return suit === 'hearts' || suit === 'diamonds';
}

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

    get isGlassCard() {
        return this.value === '3' && this.isRed;
    }

    get isThumbCard() {
        return this.value === '4' && this.suit === 'clubs';
    }

    get isResetCard() {
        return this.value === '2';
    }

    get isSkipCard() {
        return this.value === '8';
    }

    get isReverseCard() {
        return this.value === 'J';
    }

    get isSevenCard() {
        return this.value === '7';
    }

    get isTenCard() {
        return this.value === '10';
    }

    get isAceOfSpades() {
        return this.value === 'A' && this.suit === 'spades';
    }

    get displayValue() {
        if (this.isJoker) return 'JKR';
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

    matches(other) {
        return this.value === other.value;
    }
}

class Deck {
    constructor() {
        this.cards = [];
        this.init();
    }

    init() {
        this.cards = [];
        for (const suit of SUITS) {
            for (const value of VALUES) {
                this.cards.push(new Card(value, suit));
            }
        }
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

    getPlayableCards() {
        if (this.hand.length > 0) {
            return { cards: this.hand, source: 'hand' };
        } else if (this.faceUp.length > 0) {
            return { cards: this.faceUp, source: 'faceUp' };
        } else if (this.faceDown.length > 0) {
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

class Game {
    constructor() {
        this.players = [];
        this.deck = null;
        this.playPile = [];
        this.discardPile = [];
        this.currentPlayerIndex = 0;
        this.viewingPlayerIndex = 0;
        this.direction = 1;
        this.mustPlayUnder7 = false;
        this.skipCount = 0;
        this.finishOrder = [];
        this.gamePhase = 'setup';
        this.swapPlayerIndex = 0;
        this.selectedSwapHandCard = null;
        this.selectedCards = [];
        this.thumbActive = false;
        this.thumbReactions = {};
        this.jokerPending = false;
        this.jokerTargetIndex = null;

        // Position mapping for opponents based on player count
        this.positionMaps = {
            3: ['top', 'left', 'right'],
            4: ['top', 'left', 'right'],
            5: ['top', 'top-left', 'top-right', 'left', 'right']
        };

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

        document.getElementById('play-btn').addEventListener('click', () => {
            this.playSelectedCards();
        });

        document.getElementById('pickup-btn').addEventListener('click', () => {
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
        try {
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
        } catch (error) {
            console.error('Error starting game:', error);
            alert('Error starting game: ' + error.message);
        }
    }

    dealCards() {
        for (let round = 0; round < 3; round++) {
            for (const player of this.players) {
                player.faceDown.push(this.deck.draw());
            }
        }

        for (let round = 0; round < 3; round++) {
            for (const player of this.players) {
                player.faceUp.push(this.deck.draw());
            }
        }

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

        const handContainer = document.getElementById('swap-hand-cards');
        handContainer.innerHTML = '';
        player.hand.forEach((card, index) => {
            const cardEl = this.createCardElement(card);
            cardEl.addEventListener('click', () => this.selectSwapCard(cardEl, card, 'hand', index));
            handContainer.appendChild(cardEl);
        });

        const faceUpContainer = document.getElementById('swap-faceup-cards');
        faceUpContainer.innerHTML = '';
        player.faceUp.forEach((card, index) => {
            const cardEl = this.createCardElement(card);
            cardEl.addEventListener('click', () => this.selectSwapCard(cardEl, card, 'faceUp', index));
            faceUpContainer.appendChild(cardEl);
        });

        const faceDownContainer = document.getElementById('swap-facedown-cards');
        faceDownContainer.innerHTML = '';
        player.faceDown.forEach(() => {
            const cardEl = this.createCardBack();
            faceDownContainer.appendChild(cardEl);
        });
    }

    selectSwapCard(cardEl, card, source, index) {
        const player = this.players[this.swapPlayerIndex];

        if (source === 'hand') {
            document.querySelectorAll('#swap-hand-cards .card').forEach(c => c.classList.remove('selected'));
            cardEl.classList.add('selected');
            this.selectedSwapHandCard = { card, index };
        } else if (source === 'faceUp' && this.selectedSwapHandCard) {
            const handIndex = this.selectedSwapHandCard.index;
            const faceUpIndex = index;

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
            this.startPlayPhase();
        } else {
            this.showSwapPhase();
        }
    }

    startPlayPhase() {
        this.gamePhase = 'play';
        this.showScreen('game-screen');
        this.currentPlayerIndex = this.findStartingPlayer();
        this.viewingPlayerIndex = this.currentPlayerIndex;
        this.setupOpponentPositions();
        this.renderGame();
    }

    findStartingPlayer() {
        let lowestValue = Infinity;
        let startingPlayer = 0;

        for (let i = 0; i < this.players.length; i++) {
            const player = this.players[i];
            for (const card of player.hand) {
                if (card.value === '3' && card.isBlack) {
                    if (CARD_VALUES['3'] < lowestValue) {
                        lowestValue = CARD_VALUES['3'];
                        startingPlayer = i;
                    }
                }
            }
        }

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

    setupOpponentPositions() {
        // Hide all opponent positions first
        ['top', 'left', 'right', 'top-left', 'top-right'].forEach(pos => {
            const el = document.getElementById(`player-${pos}`);
            if (el) el.classList.add('hidden');
        });

        // Show positions based on player count
        const positions = this.getOpponentPositions();
        positions.forEach(pos => {
            const el = document.getElementById(`player-${pos}`);
            if (el) el.classList.remove('hidden');
        });
    }

    getOpponentPositions() {
        const count = this.players.length;
        if (count === 3) return ['top', 'left'];
        if (count === 4) return ['top', 'left', 'right'];
        if (count === 5) return ['top', 'top-left', 'top-right', 'left'];
        return ['top', 'left', 'right'];
    }

    getOpponentPosition(opponentIndex) {
        const positions = this.getOpponentPositions();
        return positions[opponentIndex] || 'top';
    }

    createCardElement(card, small = false) {
        const cardEl = document.createElement('div');

        if (card.isJoker) {
            cardEl.className = `card joker${small ? ' small' : ''}`;
            cardEl.innerHTML = `
                <span class="card-value">${card.displayValue}</span>
                <span class="card-suit">${card.displaySuit}</span>
            `;
        } else {
            const colorClass = card.isRed ? 'red' : 'black';
            cardEl.className = `card ${colorClass}${small ? ' small' : ''}`;
            cardEl.innerHTML = `
                <span class="card-value">${card.displayValue}</span>
                <span class="card-suit">${card.displaySuit}</span>
            `;
        }

        return cardEl;
    }

    createCardBack(small = false, clickable = false) {
        const cardEl = document.createElement('div');
        cardEl.className = `card card-back${small ? ' small' : ''}${clickable ? ' clickable' : ''}`;
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
        const positions = this.getOpponentPositions();
        let posIndex = 0;

        for (let i = 0; i < this.players.length; i++) {
            if (i === this.viewingPlayerIndex) continue;

            const player = this.players[i];
            const position = positions[posIndex];
            const container = document.getElementById(`player-${position}`);

            if (!container) {
                posIndex++;
                continue;
            }

            container.classList.remove('hidden');

            // Name
            const nameEl = container.querySelector('.opponent-name');
            nameEl.textContent = player.name + (player.hasFinished ? ` (#${player.finishPosition})` : '');
            nameEl.className = 'opponent-name';
            if (i === this.currentPlayerIndex) nameEl.classList.add('active');
            if (player.hasFinished) nameEl.classList.add('finished');

            // Face-down cards
            const faceDownRow = container.querySelector('.facedown-row');
            faceDownRow.innerHTML = '';
            player.faceDown.forEach(() => {
                faceDownRow.appendChild(this.createCardBack(true));
            });

            // Face-up cards
            const faceUpRow = container.querySelector('.faceup-row');
            faceUpRow.innerHTML = '';
            player.faceUp.forEach(card => {
                faceUpRow.appendChild(this.createCardElement(card, true));
            });

            // Hand cards (as backs)
            const handEl = container.querySelector('.opponent-hand');
            handEl.innerHTML = '';
            player.hand.forEach(() => {
                handEl.appendChild(this.createCardBack(true));
            });

            posIndex++;
        }

        // Hide unused positions
        for (let p = posIndex; p < positions.length; p++) {
            const container = document.getElementById(`player-${positions[p]}`);
            if (container) container.classList.add('hidden');
        }
    }

    renderCenterArea() {
        // Deck count
        document.getElementById('deck-count').textContent = `${this.deck.count} cards`;

        // Draw pile visibility
        const drawPile = document.getElementById('draw-pile');
        if (this.deck.isEmpty) {
            drawPile.classList.add('empty');
            drawPile.innerHTML = '';
        } else {
            drawPile.classList.remove('empty');
            drawPile.innerHTML = '<div class="card card-back"></div>';
        }

        // Play pile
        const playPileEl = document.getElementById('play-pile');
        playPileEl.innerHTML = '';

        const topCards = this.playPile.slice(-4);
        topCards.forEach(card => {
            const cardEl = this.createCardElement(card);
            cardEl.style.cursor = 'default';
            playPileEl.appendChild(cardEl);
        });

        document.getElementById('pile-count-label').textContent = `${this.playPile.length} cards`;

        // Discard count
        document.getElementById('discard-count').textContent = `${this.discardPile.length} cards`;
        const discardPile = document.getElementById('discard-pile');
        if (this.discardPile.length > 0) {
            discardPile.classList.remove('empty');
        } else {
            discardPile.classList.add('empty');
        }
    }

    renderCurrentPlayer() {
        const player = this.players[this.viewingPlayerIndex];
        const { source } = player.getPlayableCards();
        const isMyTurn = this.viewingPlayerIndex === this.currentPlayerIndex;

        // Face-down cards
        const faceDownContainer = document.getElementById('my-facedown');
        faceDownContainer.innerHTML = '';
        player.faceDown.forEach((card, index) => {
            const cardEl = this.createCardBack(false, isMyTurn && source === 'faceDown');
            if (isMyTurn && source === 'faceDown') {
                cardEl.addEventListener('click', () => this.selectFaceDownCard(index));
            }
            faceDownContainer.appendChild(cardEl);
        });

        // Face-up cards
        const faceUpContainer = document.getElementById('my-faceup');
        faceUpContainer.innerHTML = '';
        player.faceUp.forEach((card) => {
            const cardEl = this.createCardElement(card);
            if (isMyTurn && source === 'faceUp') {
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
        const handContainer = document.getElementById('my-hand');
        handContainer.innerHTML = '';
        player.hand.forEach((card) => {
            const cardEl = this.createCardElement(card);
            if (isMyTurn && source === 'hand') {
                cardEl.addEventListener('click', () => this.toggleCardSelection(card, 'hand'));
                if (this.selectedCards.includes(card)) {
                    cardEl.classList.add('selected');
                }
            } else if (!isMyTurn) {
                cardEl.classList.add('disabled');
            }
            handContainer.appendChild(cardEl);
        });
    }

    toggleCardSelection(card, source) {
        const index = this.selectedCards.indexOf(card);

        if (index === -1) {
            if (this.selectedCards.length === 0) {
                this.selectedCards.push(card);
            } else {
                if (card.matches(this.selectedCards[0])) {
                    this.selectedCards.push(card);
                } else {
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
        this.playSelectedCards();
    }

    updateGameInfo() {
        const player = this.players[this.currentPlayerIndex];
        document.getElementById('current-player-name').textContent = player.name;
        document.getElementById('direction-indicator').textContent =
            this.direction === 1 ? '↻' : '↺';

        let status = '';
        if (this.mustPlayUnder7) {
            status = 'Must play under 7!';
        }
        document.getElementById('special-status').textContent = status;
    }

    updateActionButtons() {
        const playBtn = document.getElementById('play-btn');
        const thumbBtn = document.getElementById('thumb-btn');
        const player = this.players[this.currentPlayerIndex];
        const isMyTurn = this.viewingPlayerIndex === this.currentPlayerIndex;

        playBtn.disabled = !isMyTurn || this.selectedCards.length === 0 || !this.isValidPlay(this.selectedCards);

        if (isMyTurn && player.hasThumbCard() && player.hand.length > 0) {
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

        const firstValue = cards[0].value;
        if (!cards.every(c => c.value === firstValue)) return false;

        const card = cards[0];
        const topCard = this.getEffectiveTopCard();

        if (card.isJoker) return true;
        if (card.isTenCard) return true;
        if (card.isResetCard) return true;

        if (card.isGlassCard) {
            if (topCard && (topCard.isTenCard || topCard.isJoker)) {
                return false;
            }
            return true;
        }

        if (!topCard) return true;

        // If top card is a 2 (reset), any card can be played
        if (topCard.isResetCard) return true;

        if (this.mustPlayUnder7) {
            return card.numericValue < CARD_VALUES['7'];
        }

        return card.numericValue >= topCard.numericValue;
    }

    playSelectedCards() {
        if (this.selectedCards.length === 0) return;

        const player = this.players[this.currentPlayerIndex];
        const { source } = player.getPlayableCards();
        const cards = [...this.selectedCards];
        const card = cards[0];

        // For face-down cards, check validity after reveal
        if (source === 'faceDown') {
            if (!this.isValidPlay(cards)) {
                this.showMessage(`${player.name} flipped ${card.toString()} - must pick up!`);
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

        if (!this.isValidPlay(this.selectedCards)) {
            this.showMessage('Invalid play!');
            return;
        }

        player.removeCards(cards, source);
        this.playPile.push(...cards);
        this.selectedCards = [];
        this.mustPlayUnder7 = false;

        if (this.checkForFourOfAKind()) {
            this.discardPlayPile();
            this.showMessage('Four of a kind! Pile discarded!');
            this.drawToMinimum(player);
            this.checkPlayerFinished(player);
            this.renderGame();
            return;
        }

        this.handleCardAbility(cards, player);
    }

    handleCardAbility(cards, player) {
        const card = cards[0];
        const count = cards.length;

        if (card.isJoker) {
            this.handleJoker(player);
            return;
        }

        if (card.isTenCard) {
            this.discardPlayPile();
            this.showMessage('10 played! Pile discarded!');
            this.drawToMinimum(player);
            this.checkPlayerFinished(player);
            this.renderGame();
            return;
        }

        if (card.isSkipCard) {
            if (count === 4) {
                this.discardPlayPile();
                this.showMessage('Four 8s! Pile discarded!');
            } else {
                this.skipCount = count;
                this.showMessage(`Skipping ${count} player(s)!`);
            }
            this.drawToMinimum(player);
            this.checkPlayerFinished(player);
            this.advanceTurn();
            return;
        }

        if (card.isSevenCard) {
            this.mustPlayUnder7 = true;
            this.showMessage('7 played! Next must play under 7!');
            this.drawToMinimum(player);
            this.checkPlayerFinished(player);
            this.advanceTurn();
            return;
        }

        if (card.isReverseCard) {
            if (count === 4) {
                this.discardPlayPile();
                this.showMessage('Four Jacks! Pile discarded!');
            } else if (count % 2 === 1) {
                this.direction *= -1;
                this.showMessage('Direction reversed!');
            }
            this.drawToMinimum(player);
            this.checkPlayerFinished(player);
            this.advanceTurn();
            return;
        }

        if (card.isResetCard) {
            this.showMessage('2 played! Value reset!');
            this.drawToMinimum(player);
            this.checkPlayerFinished(player);
            this.advanceTurn();
            return;
        }

        if (card.isGlassCard) {
            this.showMessage('Glass card! Copies card below.');
            this.drawToMinimum(player);
            this.checkPlayerFinished(player);
            this.advanceTurn();
            return;
        }

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

        let aceCard = targetPlayer.hand.find(c => c.isAceOfSpades);
        let source = 'hand';
        if (!aceCard) {
            aceCard = targetPlayer.faceUp.find(c => c.isAceOfSpades);
            source = 'faceUp';
        }

        targetPlayer.removeCards([aceCard], source);
        this.discardPile.push(aceCard);

        const joker = this.playPile.pop();
        this.discardPile.push(joker);
        jokerPlayer.addToHand(this.playPile);
        this.playPile = [];

        this.showMessage(`${targetPlayer.name} defended! ${jokerPlayer.name} picks up!`);

        document.getElementById('joker-modal').classList.add('hidden');
        this.jokerPending = false;

        this.currentPlayerIndex = this.jokerTargetIndex;
        this.viewingPlayerIndex = this.currentPlayerIndex;
        this.jokerTargetIndex = null;
        this.checkPlayerFinished(targetPlayer);
        this.renderGame();
    }

    pickupFromJoker() {
        const targetPlayer = this.players[this.jokerTargetIndex];

        const joker = this.playPile.pop();
        this.discardPile.push(joker);

        targetPlayer.addToHand(this.playPile);
        this.playPile = [];

        this.showMessage(`${targetPlayer.name} picks up the pile!`);

        document.getElementById('joker-modal').classList.add('hidden');
        this.jokerPending = false;

        this.currentPlayerIndex = this.jokerTargetIndex;
        this.jokerTargetIndex = null;
        this.advanceTurn();
    }

    activateThumb() {
        const player = this.players[this.currentPlayerIndex];
        if (!player.hasThumbCard()) return;

        const thumbCard = player.hand.find(c => c.isThumbCard);
        player.removeCards([thumbCard], 'hand');
        this.discardPile.push(thumbCard);

        this.thumbActive = true;
        this.thumbReactions = {};

        document.getElementById('thumb-modal').classList.remove('hidden');

        setTimeout(() => {
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
        this.thumbReactions[this.viewingPlayerIndex] = Date.now();
        setTimeout(() => {
            this.endThumbPhase();
        }, 2000);
    }

    endThumbPhase() {
        if (!this.thumbActive) return;

        document.getElementById('thumb-modal').classList.add('hidden');
        this.thumbActive = false;

        let slowestIndex = -1;
        let slowestTime = -1;

        for (let i = 0; i < this.players.length; i++) {
            if (i === this.currentPlayerIndex || this.players[i].hasFinished) continue;

            const reactionTime = this.thumbReactions[i];
            if (reactionTime === undefined) {
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
            this.showMessage(`${loser.name} was slowest!`);
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
        this.showMessage(`${player.name} picks up!`);
        this.advanceTurn();
    }

    drawToMinimum(player) {
        while (player.hand.length < 3 && !this.deck.isEmpty) {
            player.addToHand(this.deck.draw());
        }
    }

    checkPlayerFinished(player) {
        if (player.isOut && !player.hasFinished) {
            player.hasFinished = true;
            player.finishPosition = this.finishOrder.length + 1;
            this.finishOrder.push(player);
            this.showMessage(`${player.name} finished #${player.finishPosition}!`);

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
            if (index === this.currentPlayerIndex) break;
        }

        return index;
    }

    advanceTurn() {
        this.currentPlayerIndex = this.getNextPlayerIndex();
        this.viewingPlayerIndex = this.currentPlayerIndex;
        this.skipCount = 0;
        this.selectedCards = [];

        while (this.players[this.currentPlayerIndex].hasFinished) {
            this.currentPlayerIndex = this.getNextPlayerIndex();
            this.viewingPlayerIndex = this.currentPlayerIndex;
        }

        this.renderGame();
    }

    showMessage(text) {
        const toast = document.getElementById('message-toast');
        toast.textContent = text;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
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

document.addEventListener('DOMContentLoaded', () => {
    console.log('3 Down initializing...');
    try {
        window.game = new Game();
        console.log('Game ready!');
    } catch (error) {
        console.error('Error:', error);
    }
});
