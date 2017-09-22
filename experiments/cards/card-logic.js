const _ = require('underscore');

/**
 * Reshuffles an array of card sprites into the deck with probability p for each card
 * Returns [# cards left in deck, # cards added back to deck]
 *
 * @param {Number} p the probability of adding a single card back to the deck
 * @param {Array.<sprite>} cards array of cards to potentially reshuffle
 * @param {Array.<Number>} deck deck of card indices
 */
function reshuffle(p, cards, deck) {
    let n = 0;
    cards.forEach(c => {
        if (Math.random() <= p) {
            n++;
            deck.push(c);
        }
    });
    const newDeck = _.shuffle(deck);
    return { newDeck, n };
}

/**
 * Biases reshuffling the deck to favor a given suit using two methods. This function first calls biasReturnCards(),
 * then calls biasDeckShuffle().
 * @param {Number} biasSuit - the suit that the shuffle will bias towards
 * @param {Number} biasP - the probability of adding the biased suit vs others back to the deck
 * @param {Number} deckBiasP - how much the deck will favor shuffling biasSuit cards to the top of the deck. 
 * @param {Array<Number>} cards - the cards to reshuffle into the deck
 * @param {Array<Number>} deck - the deck of cards to return to
 */
function biasReshuffle(biasSuit, biasP, deckBiasP, cards, deck) {
    const biasRet = biasReturnCards(biasSuit, biasP, deckBiasP);
    const n = biasRet.n;

    const newDeck = biasDeckShuffle(biasRet.deck, biasSuit, deckBiasP);
    return { newDeck, n };
}

/**
 * Biases returning cards of the given bias suit back to the deck. Cards of the bias suit are returned with 
 * probability biasP, whereas cards not of the suit are returned with probability 1 - biasP.
 * Returned cards are simply added to the bottom of the deck with no shuffling.
 * @param {*} biasSuit 
 * @param {*} biasP 
 * @param {*} cards 
 * @param {*} deck 
 */
function biasReturnCards(biasSuit, biasP, cards, deck) {
    let n = 0;
    cards.forEach(c => {
        let returnP = getSuit(c) == biasSuit ? biasP : 1 - biasP; // set the p value to the biasP or the regular p
        if (Math.random() <= returnP) {
            n++;
            deck.push(c);
        }
    });
    return { deck, n }
}

/**
 * Rigs the deck by bringing cards of the bias suit to the top of the deck with strength deckBiasP.
 * Setting deckBiasP to 1 means all cards of the bias suit are brought to the top. 
 * Setting deckBiasP to 0 means all cards of the bias suit are sent to the bottom. 
 * Setting deckBiasP to 0.5 means the deck is shuffled randomly
 * @param {Array<Number>} deck - the deck of cards to rig
 * @param {Number} biasSuit - 
 * @param {*} deckBiasP - 
 */
function biasDeckShuffle(deck, biasSuit, deckBiasP) {
    deck = _.shuffle(deck);
    // console.log(deck)
    let numCards = deck.length;
    for (let i = 0; i < numCards; i++) {
        // strength is the probability the card gets brought to the top
        // console.log(`card[${i}]: ` + deck[i])
        let strength = getSuit(deck[i]) == biasSuit ? deckBiasP : 1 - deckBiasP;
        // console.log('strength: ' + strength)
        if (Math.random() < strength) {
            // console.log('bringing card to front')
            let cards = deck.splice(i, 1); // take the card out
            deck = cards.concat(deck); // put the card at the beginning
        }
        // console.log(deck)
    }
    return deck;
}

/**
 * 'Deals' the first n cards from a deck. Cards are taken from the beginning of the array representing the
 * deck. The deck is modified in this operation.
 * @param {Array<Number>} deck the deck of cards
 * @param {Number} number how many to deal
 */
function dealCards(deck, number) {
    return deck.splice(0, number);
}

const cardsInSuit = 13; // number of cards in a suit
/**
 * Determines if there is a straight among the 2 hands in a standard 52 card deck
 *
 * @param {Number} cardsInSuit the number of cards in each suit
 * @param {Array.<Number>} hand1 values in the first hand
 * @param {Array.<Number>} hand2 values in the second hand
 */
function hasWrappedStraight(hand1, hand2) {
    // let the suit start as the suit of the first card
    const firstSuit = getSuit(hand1[0]);
    const allCards = hand1.concat(hand2);
    const matchingSuits = allCards.every(cardVal => {
        return firstSuit == getSuit(cardVal);
    });
    if (!matchingSuits) return false;

    const simplified = allCards.map(a => a % cardsInSuit).sort((a, b) => a > b);
    let breaks = 0;
    const hasBeg = simplified.includes(0);
    const hasEnd = simplified.includes(cardsInSuit - 1);
    for (let i = 1; i < simplified.length; i++) {
        if (simplified[i] != simplified[i - 1] + 1) {
            breaks++;
        }
        if (breaks > 1) return false;
    }
    if (breaks == 1) return hasBeg && hasEnd;
    else return true;
}

/**
 * Get the suit value of each card in a standard 52 card deck
 * @param cardValue an integer [0-51]
 */
function getSuit(cardValue) {
    return Math.trunc(cardValue / cardsInSuit);
}

/**
 * Returns the numerical representatiom {0..3} of the least appearing suit in an array of cards
 * @param {Array<Number>} cards - the set of cards to evaluate
 */
function getLeastCommonSuit(cards) {
    let suitCount = { 0: 0, 1: 0, 2: 0, 3: 0 }
    cards.forEach(c => {
        suit = getSuit(c);
        ++suitCount[suit];
    })
    let min = 0;
    for (let i = 1; i < Object.keys(suitCount).length; i++) {
        if (suitCount[i] < suitCount[min]) {
            min = i;
        }
    }
    return min;
}

if (typeof module !== 'undefined')
    module.exports = {
        reshuffle,
        biasReshuffle,
        biasReturnCards,
        biasDeckShuffle,
        dealCards,
        hasWrappedStraight,
        getSuit,
        getLeastCommonSuit
    }
