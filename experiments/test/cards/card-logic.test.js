const cardLogic = require('../../cards/card-logic.js');

// reshuffle function
test('reshuffling with p=1 returns all cards to the deck', () => {
    const p = 1;
    let onTable = [0, 1, 2, 3]
    let deck = [];
    // TODO
    const reshuffle = cardLogic.reshuffle(p, onTable, deck);
    expect(reshuffle.deck).toEqual(expect.arrayContaining([0, 1, 2, 3]));
    expect(reshuffle.deck).toHaveLength(4);
});

// hasWrappedStraight function
test('6 consecutive cards in the same suit returns true', () => {
    const hand1 = [0, 1, 2];
    const hand2 = [3, 4, 5];
    expect(cardLogic.hasWrappedStraight(hand1, hand2)).toBe(true);
});

test('6 shuffled consecutive cards in the same suit returns true', () => {
    const hand1 = [5, 1, 2];
    const hand2 = [3, 0, 4];
    expect(cardLogic.hasWrappedStraight(hand1, hand2)).toBe(true);
});

test('5 consecutive cards and one overlap returns false', () => {
    const hand1 = [0, 1, 2];
    const hand2 = [2, 3, 4];
    expect(cardLogic.hasWrappedStraight(hand1, hand2)).not.toBe(true);
});

test('6 consecutive cards that wrap returns true', () => {
    const hand1 = [8, 9, 10];
    const hand2 = [11, 12, 0];
    expect(cardLogic.hasWrappedStraight(hand1, hand2)).toBe(true);
});

test('6 shuffled consecutive cards that wrap returns true', () => {
    const hand1 = [10, 12, 8];
    const hand2 = [9, 0, 11];
    expect(cardLogic.hasWrappedStraight(hand1, hand2)).toBe(true);
});

test('6 consecutive cards of a higher suit that wrap returns true', () => {
    const hand1 = [13, 14, 25];
    const hand2 = [23, 24, 15];
    expect(cardLogic.hasWrappedStraight(hand1, hand2)).toBe(true);
});

test('6 consecutive cards of different suits returns false', () => {
    const hand1 = [0, 1, 2];
    const hand2 = [15, 16, 17]; //12=0;13=1;14=2;
    expect(cardLogic.hasWrappedStraight(hand1, hand2)).not.toBe(true);
});

test('Returning the least common suit for a card not present', () => {
    const cards = [0, 13, 27]
    expect(cardLogic.getLeastCommonSuit(cards)).toBe(3);
});

test('Returning the least common suit for a card not present', () => {
    const cards = [0, 1, 13, 14, 27, 28, 42]
    expect(cardLogic.getLeastCommonSuit(cards)).toBe(3);
});

test('Calling biasDeckShuffle with deckBiasP=1 brings all the cards of the bias suit to the top', () => {
    const deck =
        [0, 1,   // suit 0
         13, 14, // suit 1
         27, 28, // suit 2
         42, 43]; // suit 3
    const biasSuit = 2;
    const deckBiasP = 1;
    const firstTwo = cardLogic.biasDeckShuffle(biasSuit, deckBiasP, deck).splice(0,2)
    const expected = [27, 28]
    expect(firstTwo).toEqual(expect.arrayContaining(expected));
})

test('Calling biasDeckShuffle with deckBiasP=1 on the first suit in front brings all the cards of the bias suit to the top', () => {
    const deck =
        [0, 1,   // suit 0
         13, 14, // suit 1
         27, 28, // suit 2
         42, 43]; // suit 3
    const biasSuit = 0;
    const deckBiasP = 1;
    const firstTwo = cardLogic.biasDeckShuffle(biasSuit, deckBiasP, deck).splice(0,2)
    const expected = [0, 1]
    expect(firstTwo).toEqual(expect.arrayContaining(expected));
})

test('Calling biasDeckShuffle with deckBiasP=0 sends all the cards of the bias suit to the bottom', () => {
    const deck =
        [0, 1,   // suit 0
         13, 14, // suit 1
         27, 28, // suit 2
         42, 43]; // suit 3
    const biasSuit = 2;
    const deckBiasP = 0;
    const lastTwo = cardLogic.biasDeckShuffle(biasSuit, deckBiasP, deck).splice(6,2);
    const expected = [27, 28]
    expect(lastTwo).toEqual(expect.arrayContaining(expected));
})

test('Calling biasDeckShuffle with deckBiasP=0 on the last suit sends all the cards of the bias suit to the bottom', () => {
    const deck =
        [0, 1,   // suit 0
         13, 14, // suit 1
         27, 28, // suit 2
         42, 43]; // suit 3
    const biasSuit = 3;
    const deckBiasP = 0;
    const lastTwo = cardLogic.biasDeckShuffle(biasSuit, deckBiasP, deck).splice(6,2);
    const expected = [42, 43]
    expect(lastTwo).toEqual(expect.arrayContaining(expected));
})

test('Calling biasDeckShuffle with deckBiasP=0.5 randomly shuffles the deck', () => {
    const deck =
        [0, 1,   // suit 0
         13, 14, // suit 1
         27, 28, // suit 2
         42, 43]; // suit 3
    const biasSuit = 3;
    const deckBiasP = 0.5;
    const newDeck = cardLogic.biasDeckShuffle(biasSuit, deckBiasP, deck);
    const hr = cardLogic.getHumanReadable;
    console.log('bias: ' + cardLogic.SUITS[biasSuit]);
    console.log(hr(deck))
    console.log(hr(newDeck))
})