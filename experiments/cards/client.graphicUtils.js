/**
 * @file 
 * Provides functions that help with Phaser graphics for use in client.graphics.js
 *
 */

/**
 * Takes in an array of numbers (that represent cards) and returns a Phaser group 
 * with the sprites for each card, placed at the correct location for each player
 * 
 * @param {Array<Number>} cards the hand to create sprites from
 * @param {boolean} forMe true if cards are for me, false if for other player
 */
function makeHandGroup(cards, forMe) {
  const handGroup = makeCardGroup(cards);
  // put the group in the right place
  let yOffset = graphics.HAND_OFFSET_FROM_CENTER; // the offset to place the cards
  if (!forMe) yOffset *= -1; // place on the opposite side if other player
  handGroup.forEach(c => {
    c.y = phaser.world.centerY + yOffset
    c.snapPosition = c.position.clone();
    c.parentGroup = handGroup;
  });

  if (!forMe) handGroup.forEach(disableCard);
  return handGroup;
}

/**
 * Creates the Phaser group of sprites to be dealt on the table
 * @param {Array<Number>} cards the array to create sprites from
 */
function makeOnTableGroup(cards) {
  const onTableGroup = makeCardGroup(cards);
  // put the group in the right place
  onTableGroup.centerX = phaser.world.centerX;
  onTableGroup.forEach(c => {
    c.y = phaser.world.centerY
    c.snapPosition = c.position.clone();
    c.parentGroup = onTableGroup;
  });
  return onTableGroup
}

/**
 * Helper function that creates a Phaser group of card Sprites. The group is placed 
 * at the default location.
 * @param {Array<Number>} cards the array to create sprites from
 */
const makeCardGroup = function (cards) {
  /* Note: This function is defined as a variable as it's not meant to be hoisted */
  /* Placement */
  // if (cards === undefined) return []; // case that no cards are available yet, prevent undefined errors
  // console.log('Making card group of length: ' + cards.length);
  const cardGroup = new Array(cards.length);

  const groupWidth = cards.length * graphics.CARD_CELL_WIDTH;
  const startX = phaser.world.centerX - groupWidth / 2;
  for (let i = 0; i < cardGroup.length; ++i) {
    // add a sprite off the game screen
    const cardSprite = phaser.add.sprite(-10, -10, 'cards', cards[i]);
    // set the anchor and scale
    cardSprite.anchor.set(0.5);
    cardSprite.scale.set(graphics.CARD_SCALE);
    // put the card in the correct location
    const cardX = startX + i * graphics.CARD_CELL_WIDTH;
    cardSprite.x = cardX + graphics.CARD_CELL_WIDTH / 2;
    cardGroup[i] = cardSprite;
  }

  /* Effects */
  cardGroup.forEach(card => {
    // Fade in when created
    fadeIn(card, graphics.FADE_IN_TIME);
    // Enable dragging
    card.inputEnabled = true;
    card.input.enableDrag(true, true); // center on mouse = true, bring to top = true 
    card.events.onDragStart.add(startDrag);
    card.events.onDragStop.add(stopDrag);
  });
  return cardGroup;
}
/**
 * Returns a 4-card array and adds it to the game in the table position
 * @deprecated: keeping around for animations code 
 *
 * @param {Number} startIndex the index to begin the table in the deck
 * @param {Number} numCards number of cards to draw (should be 4)
 */
function drawCards(startIndex, numCards, phaser, obj) {
  console.log(`startIndex = ${startIndex}`);
  let table = [];
  [0, 1, 2, 3].forEach(function (i) {
    let x = phaser.world.centerX + (i - 1.5) * graphics.cardGap;
    let y = phaser.world.centerY;

    let b = phaser.add.sprite(140, phaser.world.centerY, 'cardback');
    b.scale.set(graphics.cardScale);
    b.anchor = new Phaser.Point(0.5, 0.5);

    moveTo(b, x, y, 1000 / 2, 1100 / 2, phaser, true, false);
    setTimeout(function () {
      table.push(makeCard(startIndex + i, x, y, phaser, obj));
    }, 1800 / 2);
  });
  return table;
}

/**
 * Destroys an array of card sprites
 * @param {Array<Sprite>} sprites 
 */
function destroyAll(sprites) {
  if (!(sprites === undefined))
    sprites.forEach(s => s.destroy());
}
/**
 * Set input enable on card and set no tint
 * @param {Sprite} card 
 */
function enableCard(card) {
  card.inputEnabled = true;
  card.tint = 0xFFFFFF;
}

/**
 * Set input disabled on card and set a gray tint
 * @param {Sprite} card 
 */
function disableCard(card) {
  card.inputEnabled = false;
  card.tint = graphics.DISABLED_TINT;
}

/**
 * The callback for what to do on the start of dragging a card.
 * Increases the cards scale to simulate picking it up.
 * @param {Sprite} card the card being operated on
 * @param {Cursor} pointer 
 */
let startDrag = function (card, pointer) {
  // make the card bigger for the illusion of picking it up
  card.scale.set(graphics.CARD_SCALE * 1.1);
  // for debugging
  const loc = myHandGroup.indexOf(card) != -1 ? 'hand' : 'table';
  console.log(loc);
}

/**
 * The callback for what to do at the stop of dragging a card.
 * Swaps cards if there was an overlap, else snaps it back to its original position.
 * Reset the card scale to simulate placing it back on the table.
 * @param {Sprite} card the card being operated on
 * @param {Cursor} pointer 
 */
let stopDrag = function (card, pointer) {
  // Reset the card's scale for the illusion of putting it back down
  card.scale.set(graphics.CARD_SCALE);

  // See if an overlap event and its resulting action occurred
  const swappableCards = myHandGroup.concat(onTableGroup);
  // console.log("This card: " + card.frame);
  // console.log("Swappable cards: " + JSON.stringify(swappableCards.map(a => a.frame)));
  let didOverlap = false;
  swappableCards.some(o => {
    if (!(card === o) && card.overlap(o) && shouldSwap(card, o)) {
      // console.log(`Found overlap for ${o.frame}`);
      swapPosition(card, o);
      sendSwapUpdate(card.frame, o.frame);
      didOverlap = true;
    }
  })
  // console.log("didOverlap: " + didOverlap);

  // Snap the card back if there was no overlap
  if (!didOverlap) {
    snapTo(card, card.snapPosition);
  }
}

/**
 * Function to determine if two cards should swap
 * @param {Sprite} card1 
 * @param {Sprite} card2 
 */
function shouldSwap(card1, card2) {
  let shouldSwap;
  if (!card1.inputEnabled || !card2.inputEnabled) {
    console.log(`Inputs on ${card1.frame} and ${card2.frame} disabled`);
    shouldSwap = false // one of the cards is disabled
  }
  else if (myHandGroup.includes(card1) && myHandGroup.includes(card2)) {// case both in my hand
    console.log(`${card1.frame} and ${card2.frame} both in hand`);
    shouldSwap = true;
  }
  else if (onTableGroup.includes(card1) && onTableGroup.includes(card2)) {// case both on table
    console.log(`${card1.frame} and ${card2.frame} both on table`);
    shouldSwap = true;
  } else if ( // case one in hand one on table and my turn
    isMyTurn &&
    (myHandGroup.includes(card1) && onTableGroup.includes(card2)
      || myHandGroup.includes(card2) && onTableGroup.includes(card1))
  ) {
    console.log(`One on hand, one on table`);
    shouldSwap = true;
  }
  // there should be no other cases. if shouldSwap = undefined, check for logic error
  console.log("shouldSwap: " + shouldSwap);
  return shouldSwap;
}

/**
 * Swaps the positions of two card sprites
 * @param {Sprite} card1
 * @param {Sprite} card2
 */

function swapPosition(card1, card2) {
  console.log("Swapping cards...");
  // Animations
  [card1, card2].forEach(c => c.tint = graphics.DISABLED_TINT);
  snapTo(card1, card2.snapPosition);
  snapTo(card2, card1.snapPosition);
  setTimeout(function () {
    // reenable the cards
    [card1, card2].forEach(c => {
      if (c.inputEnabled)
        c.tint = graphics.ENABLED_TINT
    });
  }, 700);

  // switch the snap positions
  const temp = card1.snapPosition;
  card1.snapPosition = card2.snapPosition;
  card2.snapPosition = temp;

  // Logistics
  // switch which group the cards belong to
  if (card1.parentGroup === card2.parentGroup) {
    const parentGroup = card1.parentGroup;
    const index1 = parentGroup.indexOf(card1);
    const index2 = parentGroup.indexOf(card2);
    parentGroup.swap(index1, index2);
  } else {
    const c1Group = card1.parentGroup;
    const c1Index = c1Group.indexOf(card1);

    const c2Group = card2.parentGroup;
    const c2Index = c2Group.indexOf(card2);

    // put card2 where card1 was
    c1Group.splice(c1Index, 1, card2);
    // put card1 where card2 was
    c2Group.splice(c2Index, 1, card1);

    // update membership
    card1.parentGroup = c2Group;
    card2.parentGroup = c1Group;
  }

  // Update the cards in the array representations
  theirHand = theirHandGroup.map(c => c.frame);
  onTable = onTableGroup.map(c => c.frame);
  myHand = myHandGroup.map(c => c.frame);

  logState();
}

/**
 * Creates/destroys the sprites that represent the deck based on the current value of deck.length
 */
function makeDeckSprites() {
  const dx = deckSprites.dx;
  const dy = deckSprites.dy;
  if (deckSprites.cards.length > deck.length) {
    // destroy extra card sprites if present
    for (let i = deckSprites.cards.length; i > deck.length; i--) {
      deckSprites.cards.pop().destroy();
      deckSprites.x_offset -= dx;
      deckSprites.y_offset -= dy;
    }
  }
  else if (deckSprites.cards.length < deck.length) {
    // add extra card sprites if needed
    for (let i = deckSprites.cards.length; i < deck.length; i++) {
      const cardSprite = phaser.add.sprite(deckSprites.x - deckSprites.x_offset, phaser.world.centerY - deckSprites.y_offset, 'cardback');
      cardSprite.anchor.set(0.5);
      cardSprite.scale.set(graphics.CARD_SCALE);
      deckSprites.cards.push(cardSprite);
      deckSprites.x_offset += dx;
      deckSprites.y_offset += dy;
    }
  }
}

/**
 * Animates the reshuffling/discarding of the cards on the table (onTableGroup)
 * @param {Number} numReshuffle the number of cards to reshuffle
 */
function reshuffleAnimation(numReshuffle) {
  let backs = [];
  // create back sprites
  onTableGroup.forEach(c => {
    console.log('x: ' + c.x + ', y: ' + c.y);
    let back = phaser.add.sprite(c.x, c.y, 'cardback');
    back.scale.set(graphics.CARD_SCALE);
    back.anchor.set(0.5);
    fadeOut(c, 500);
    c.destroy();
    fadeIn(back, 500);
    backs.push(back);
  });
  // collect the backs in the center
  setTimeout(function () {
    backs.forEach(function (b) {
      moveTo(b, phaser.world.centerX, phaser.world.centerY, 600 / 2, 600 / 2, false, false);
    })
  }, 1000 / 2);
  setTimeout(function () {
    for (let i = 0; i < backs.length; i++) {
      let b = backs[i];
      let x = (i < numReshuffle) ? 140 : 1500;
      moveTo(b, x, phaser.world.centerY, 600 * (1 + i) / 2, 600 * (1 + i) / 2, false, true);
    }
  }, 3000 / 2);
}
/**
 * Move a sprite to a location, with the option of fading or destroying it in the process.
 * @param {Phaser.Sprite} sprite the sprite
 * @param {Number} x x pos to move to
 * @param {Number} y y pos t omove to
 * @param {Number} moveTime time to move there
 * @param {Number} waitTime time before moving
 * @param {Boolean} fadeBool whether to fade out
 * @param {Boolean} destroyBool whether to destroy sprite on finish
 */
function moveTo(sprite, x, y, moveTime, waitTime, fadeBool, destroyBool) {
  phaser.physics.arcade.enable(sprite);
  phaser.physics.arcade.moveToXY(sprite, x, y, 0, moveTime);
  phaser.time.events.add(waitTime, function () {
    sprite.position.setTo(x, y);
    sprite.body.reset();
    if (fadeBool) {
      fadeOut(sprite, 800);
    }
    if (destroyBool) {
      sprite.destroy();
    }
  });
}

/**
 * Gives easing to movement of card sprite
 */
function snapTo(card, pos) {
  phaser.add.tween(card).to(pos, 400, Phaser.Easing.Back.Out, true);
}

/**
 * Fades in card sprite
 */
function fadeIn(card, time) {
  card.alpha = 0;
  phaser.add.tween(card).to({ alpha: 1 }, time, Phaser.Easing.Linear.Out, true, 0, 0, false);
}

/**
 * Fades out card sprite
 */
function fadeOut(card, time) {
  card.alpha = 1;
  phaser.add.tween(card).to({ alpha: 0 }, time, Phaser.Easing.Linear.Out, true, 0, 0, false);
}

/**
 * Random number between min and max
 * @param {Number} min
 * @param {Number} max
 */
function randBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Get the string describing the turn.
 */
function getTurnString() {
  // TODO: make this dependent on a different variable than isMyTurn. using isMyTurn seems like bad practice
  if (isMyTurn === null) return 'Game has not started yet'; // case game not initialized yet. 
  const isPartner = isMyTurn ? '' : 'partner\'s '
  return 'It\'s your ' + isPartner + 'turn.'
}

/**
 * Get the string describing information about the cards.
 * @param {Number} num number of cards
 * @param {String} counterType either 'left' for 'left in deck' or 'reshuffled'
 */
function getCounterString(num, counterType) {
  const plural = (num == 1) ? '' : 's';
  const descrip = (counterType == 'left') ? 'left in deck' : 'reshuffled';
  return `${num} card${plural} ${descrip}`;
}

/**
 * Logs the state of the cards game on the client side.
 */
function logState() {
  console.log('isMyTurn: ' + isMyTurn);
  console.log('Deck: ' + deck);
  console.log('Their Hand: ' + theirHand);
  console.log('On Table: ' + onTable);
  console.log('My Hand: ' + myHand);
}

/**
 * Set the turn button to be enabled or disabled.
 * @param {Boolean} isEnabled 
 */
function turnButtonSetEnabled(isEnabled) {
  if (isEnabled) {
    // Enable the end-turn button
    turnButton.setFrames(0, 1, 2);
    turnButton.inputEnabled = true;
  } else {
    // Disable the end-turn button
    turnButton.setFrames(3, 3, 3);
    turnButton.inputEnabled = false;
  }
}
/**
 * Swaps the elements at two indices of an array
 * @param {Number} index1 
 * @param {Number} index2
 */
Array.prototype.swap = function (x, y) {
  var b = this[x];
  this[x] = this[y];
  this[y] = b;
  return this;
}

if (typeof module !== 'undefined')
  module.exports = {
    makeCard: makeCard,
    makeHand: makeHand,
    drawCards: drawCards,
    cardGroupOverlap: cardGroupOverlap,
    swapPos: swapPosition,
    randBetween: randBetween
  }
