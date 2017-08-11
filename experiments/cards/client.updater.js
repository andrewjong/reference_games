/**
 * @file Contains functions for the client to interface with the server, i.e. handling and sending updates.
 */

/**
 * Sends an update to the server of which cards were swapped as a numerical representation of the card.
 * @param {Number} c1 the first card to swap
 * @param {Number} c2 the second card to swap
 */
function sendSwapUpdate(c1, c2) {
    const packet = ["swapUpdate", c1, c2];
    console.log('swapUpdate packet: ' + packet)
    console.log("Emitting swapUpdate with packet...");
    globalGame.socket.send(packet.join('.'));
}

/**
 * Handles an update to swap two cards, both in the numerical representations and the graphics.
 * @param {Number} c1 a number 0-51 representing a card
 * @param {Number} c2 a number 0-51 representing a card
 */
function handleSwapUpdate(c1, c2) {
    // should only be receiving swap updates from the other player. other player can't swap ours
    const swappableCards = theirHandGroup.concat(onTableGroup);
    console.log(`Handling swap update: ${c1}, ${c2}`);
    // get the sprites corresponding to the numbers
    const spritesToSwap = swappableCards.filter(c => {
        console.log(c.frame);
        return c.frame == c1 || c.frame == c2; // make sure this is '==' and not '==='! breaks on '==='
    });
    // there should only be two cards
    console.assert(spritesToSwap.length === 2, c1, c2, spritesToSwap);
    swapPosition(spritesToSwap[0], spritesToSwap[1]);
}

/**
 * Lets the server know the turn has ended.
 */
function sendEndTurn() {
    const packet = ['endTurn', deck, onTable];
    console.log('endTurn packet: ' + packet);
    console.log("Emitting endTurn with packet...");
    globalGame.socket.send(packet.join('.'));
}

/**
 * Handle ending the turn, specifically the reshuffle animation, disabling input, and letting the server know ready for the next turn
 * @param {Object{newDeck, n}} reshuffled 
 */
function handleEndTurn(reshuffled) {
    deck = reshuffled.newDeck;

    reshuffleAnimation(reshuffled.n);
    turnButtonSetEnabled(false);
    reshuffledText.setText(getCounterString(reshuffled.n, 'reshuffled'));
    //TODO: disable card swaps while transitioning turns

    const packet = ['nextTurnRequest', deck];
    console.log('nextTurnRequest packet: ' + packet);
    console.log("Emitting nextTurnRequest with packet...");
    globalGame.socket.send(packet.join('.'));
}

/**
 * Handle the update for the new turn
 * @param {Object} newTurn object containing the new turn info: Array<Number> deck, Array<Number> onTable
 */
function handleNewTurn(newTurn){
    console.log('New turn received!');
    const iMT = !isMyTurn;
    //TODO: animations for dealing the new turn cards
    updatePhaser({isMyTurn: iMT, deck: newTurn.deck, onTable: newTurn.onTable});
}