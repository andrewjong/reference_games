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
    console.log("Emitting endTurn...");
    globalGame.socket.send('endTurn');
    //TODO: maybe combine 'endTurn' and 'newTurn' into 'nextTurn'. Easier that way so don't have to back & forth with server so much
}

/**
 * Handle transitioning to the next turn, specifically the reshuffle animation.
 * @param {Object{newDeck, n}} reshuffled 
 */
function handleNextTurn(reshuffled) {
    reshuffleAnimation(reshuffled.n);
    isMyTurn = !isMyTurn;
    turnButtonSetEnabled(isMyTurn);
    // // reshuffle cards
    // [this.cardsLeft, this.cardsAdded] = reshuffle(0.5, this.onTableSprites, deck.slice(this.nextCardIndex, 52));
    // this.nextCardIndex += 4;
    // reshuffleAnimation(this.onTableSprites, this.cardsAdded, game, this);
    // obj = this;
    // setTimeout(function () {
    //     obj.table = drawCards(obj.nextCardIndex, 4, game, obj);
    // }, 5000 / 2);
    // this.updateEachTurn();
}

/**
 * Sends an update to the server of the current state of the cards
 * TODO: Currently not used. possibly delete
 */
function sendCardsUpdate() {
    let p1Hand, p2Hand;
    if (globalGame.my_role == 'player1') {
        p1Hand = myHand;
        p2Hand = theirHand;
    } else if (globalGame.my_role == 'player2') {
        p1Hand = theirHand;
        p2Hand = myHand;
    }
    // send a packet, with each array separated by comma
    const sep = '|';
    const packet = ["cardsUpdate", deck.join(sep), onTable.join(sep), p1Hand.join(sep), p2Hand.join(sep)];
    console.log('cardsUpdate packet: ' + JSON.stringify(packet));
    console.log("Emitting cards update with cardsUpdate packet...");
    globalGame.socket.send(packet.join('.'));
}