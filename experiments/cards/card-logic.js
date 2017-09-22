const _ = require('underscore');

/**
 * Reshuffles an array of card sprits into the deck with probability p for each card
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
 * 
 * @param {Number} biasSuit - the suit that the shuffle will be biased towards
 * @param {Number} biasP - the probability of adding the biased suit vs others back to the deck
 * @param {*} biasP - the bias probability that the biasSuit will get reshuffled. By default has the same value as p 
 * @param {Number} bringForwardBias - how much the deck will favor shuffling biasSuit cards to the top of the deck
 * @param {*} cards 
 * @param {*} deck 
 */
function biasShuffle(biasSuit, biasP, bringForwardBias, cards, deck) {
    let n = 0;
    cards.forEach(c => {
        let returnP = getSuit(c) == biasSuit ? biasP : 1 - biasP; // set the p value to the biasP or the regular p
        if (Math.random() <= returnP) {
            n++;
            deck.push(c);
        }
    });
    const newDeck = rigTheDeck(deck, biasSuit, bringForwardBias);
    return { newDeck, n };
}

/**
 * Rigs the deck by bringing cards forward
 * @param {} deck 
 * @param {*} biasSuit 
 * @param {*} deckBiasP 
 */
function rigTheDeck(deck, biasSuit, deckBiasP) {
    deck = _.shuffle(deck);
    let end = deck.length;
    for (let i = 0; i < end; i++) {
        let bringForwardP = getSuit(deck[i]) == biasSuit ? deckBiasP : 1 - deckBiasP;
        if (Math.random() < bringForwardP) {
            let cards = deck.splice(i, 1);
            deck = cards.concat(deck);
        }
    }
    return deck;
}
/**
 * 'Deals' the first n cards from a deck. The deck is modified.
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
 * Returns the numerical representatiom {0...3} of the least appearing suit in an array of cards
 * @param {Array<Number>} cards 
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
        biasShuffle,
        rigTheDeck,
        dealCards,
        hasWrappedStraight,
        getSuit,
        getLeastCommonSuit
    }
