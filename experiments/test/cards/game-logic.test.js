const gameLogic = require('../../cards/phaser_test/game-logic.js');

// reshuffle function
test.skip('reshuffling with p=1 returns all cards to the deck', () => {
    const p = 1;
    // TODO
});

// hasWrappedStraight function
test('6 consecutive cards in the same suit is a straight flush', () => {
    const hand1 = [0, 1, 2];
    const hand2 = [3, 4, 5];
    expect(gameLogic.hasWrappedStraight(hand1, hand2)).toBe(true);
});
test('6 shuffled consecutive cards in the same suit is a straight flush', () => {
    const hand1 = [5, 1, 2];
    const hand2 = [3, 0, 4];
    expect(gameLogic.hasWrappedStraight(hand1, hand2)).toBe(true);
});
test('5 consecutive cards and one overlap is not a straight flush', () => {
    const hand1 = [0, 1, 2];
    const hand2 = [2, 3, 4];
    expect(gameLogic.hasWrappedStraight(hand1, hand2)).not.toBe(true);
});
test('6 consecutive cards that wrap is a straight flush', () => {
    const hand1 = [8, 9, 10];
    const hand2 = [11, 0, 1];
    expect(gameLogic.hasWrappedStraight(hand1, hand2)).toBe(true);
});
test('6 shuffled consecutive cards that wrap is a straight flush', () => {
    const hand1 = [10, 0, 8];
    const hand2 = [9, 1, 11];
    expect(gameLogic.hasWrappedStraight(hand1, hand2)).toBe(true);
});
test('6 consecutive cards of different suits is not a straight flush', () => {
    const hand1 = [0, 1, 2];
    const hand2 = [15, 16, 17]; //12=0;13=1;14=2;
    expect(gameLogic.hasWrappedStraight(hand1, hand2)).not.toBe(true);
});
