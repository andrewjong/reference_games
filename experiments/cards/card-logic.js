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
    cards.forEach(function (c) {
        if (Math.random() <= p) {
            n++;
            deck.push(c.frame);
        }
    });
    const newDeck = _.shuffle(deck);
    return {newDeck, n};
}

const cardsInSuit = 12;
/**
 * Determines if there is a straight among the 2 hands in a standard 52 card deck
 *
 * @param {Number} cardsInSuit the number of cards in each suit
 * @param {Array.<Number>} hand1 values in the first hand
 * @param {Array.<Number>} hand2 values in the second hand
 */
function hasWrappedStraight(hand1, hand2) {
    // let the suit start as the suit of the first card
    let firstSuit = getSuit(hand1[0]);
    let allCards = hand1.concat(hand2);
    let matchingSuits = allCards.every(cardVal => {
        return firstSuit == getSuit(cardVal);
    });
    if (!matchingSuits) return false;

    simplified = allCards.map(a => a % cardsInSuit).sort((a, b) => a > b);
    let breaks = 0;
    let hasBeg = simplified.includes(0);
    let hasEnd = simplified.includes(cardsInSuit - 1);
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

if (typeof module !== 'undefined')
    module.exports = {
        reshuffle: reshuffle,
        hasWrappedStraight: hasWrappedStraight,
        getSuit: getSuit
    }
