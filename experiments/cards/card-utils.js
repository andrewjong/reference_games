/**
 * Takes in an array of numbers (that represent cards) and returns a Phaser group 
 * with the sprites for each card, placed at the correct location for each player
 * 
 * @param {Array<Number>} cards the hand to create sprites from
 * @param {boolean} forMe true if cards are for me, false if for other player
 */
function makeHandGroup(cards, forMe) {
  let handGroup = makeCardGroup(cards);
  // put the group in the right place
  let yOffset = graphics.HAND_OFFSET_FROM_CENTER; // the offset to place the cards
  if (!forMe) yOffset *= -1; // place on the opposite side if other player
  handGroup.centerX = game.world.centerX;
  handGroup.centerY = game.world.centerY + yOffset;

  if (!forMe) handGroup.children.forEach(disableCard);
  return handGroup;
}

/**
 * Creates the Phaser group of sprites to be dealt on the table
 * @param {Array<Number>} cards the array to create sprites from
 */
function makeOnTableGroup(cards) {
  let onTableGroup = makeCardGroup(cards);
  // put the group in the right place
  onTableGroup.centerX = game.world.centerX;
  onTableGroup.centerY = game.world.centerY;

  return onTableGroup
}

/**
 * Helper function that creates a Phaser group of card Sprites. The group is placed 
 * at the default location.
 * @param {Array<Number>} cards the array to create sprites from
 */
let makeCardGroup = function (cards) {
  /* Note: This function is defined as a variable as it's not meant to be hoisted */
  let cardGroup = game.add.group();

  /* Placement */
  // create 1 each, from spritesheet 'cards', for each frame in array cards, and set visible to physics
  cardGroup.createMultiple(1, 'cards', cards, true);
  cardGroup.children.forEach(card => {
    card.anchor.set(0.5);
    card.scale.set(graphics.CARD_SCALE);
  });
  // align this many cards, along 1 row, of width of the card and the card gap
  cardGroup.align(cards.length, 1, graphics.CARD_CELL_WIDTH, graphics.CARD_HEIGHT);

  /* Effects */
  cardGroup.children.forEach(card => {
    // Fade in when created
    fadeIn(card, graphics.FADE_IN_TIME);
    // Enable dragging
    card.inputEnabled = true;
    card.input.enableDrag(true, true); // center on mouse = true, bring to top = true 
    card.snapPosition = card.position.clone();
    card.events.onDragStart.add(startDrag);
    card.events.onDragStop.add(stopDrag);
  });
  return cardGroup;
}
/**
 * Returns a 4-card array and adds it to the game in the table position
 *
 * @param {Number} startIndex the index to begin the table in the deck
 * @param {Number} numCards number of cards to draw (should be 4)
 */
function drawCards(startIndex, numCards, game, obj) {
  console.log(`startIndex = ${startIndex}`);
  let table = [];
  [0, 1, 2, 3].forEach(function (i) {
    let x = game.world.centerX + (i - 1.5) * graphics.cardGap;
    let y = game.world.centerY;

    let b = game.add.sprite(140, game.world.centerY, 'cardback');
    b.scale.set(graphics.cardScale);
    b.anchor = new Phaser.Point(0.5, 0.5);

    moveTo(b, x, y, 1000 / 2, 1100 / 2, game, true, false);
    setTimeout(function () {
      table.push(makeCard(startIndex + i, x, y, game, obj));
    }, 1800 / 2);
  });
  return table;
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
  card.tint = 0xBEBEBE;
}

/**
 * Helper function for cards on the start of their drag
 * @param {Sprite} card 
 * @param {Mouse?} pointer 
 */
let startDrag = function (card, pointer) {
  // make the card bigger for the illusion of picking it up
  card.scale.set(graphics.CARD_SCALE * 1.1);
  // for debugging
  loc = myHandGroup.children.indexOf(card) != -1 ? 'hand' : 'table';
  console.log(loc);
}

let stopDrag = function (card, pointer) {
  // Reset the card's scale for the illusion of putting it back down
  card.scale.set(graphics.CARD_SCALE);

  // See if an overlap event and its resulting action occurred
  swappableCards = myHandGroup.children.concat(onTableGroup.children);
  console.log("This card: " + card.frame);
  console.log("Swappable cards: " + JSON.stringify(swappableCards.map(a => a.frame)));
  let didOverlap = false;
  for (let i = 0; i < swappableCards.length; ++i) {
    console.log(`Checking card ${swappableCards[i].frame}`);
    if (game.physics.arcade.overlap(card, swappableCards[i], swapPosition, shouldSwap, this)) {
      console.log(`Found overlap for ${swappableCards[i].frame}`);
      didOverlap = true;
      break;
    }
  }
  // let didOverlap = swappableCards.some(otherCard => {
  //   return game.physics.arcade.overlap(otherCard, card, swapPosition, shouldSwap, this);
  // });
  console.log("didOverlap: " + didOverlap);

  // Snap the card back if there was no overlap
  if (!didOverlap) {
    snapTo(card, card.snapPosition);
  }
}

/**
 * Swaps the positions of two card sprites
 */
function swapPosition(card1, card2) {
  console.log("Swapping cards...");
  // Animations
  [card1, card2].forEach(disableCard);
  snapTo(card1, card2.snapPosition);
  snapTo(card2, card1.snapPosition);
  setTimeout(function () {
    // reenable the cards
    [card1, card2].forEach(enableCard);
  }, 700);

  // switch the snap positions
  let temp = card1.snapPosition;
  card1.snapPosition = card2.snapPosition;
  card2.snapPosition = temp;

  // Change the indicies in the array representations
}

/**
 * Callback to determine if two cards should swap
 * @param {Sprite} card1 
 * @param {Sprite} card2 
 */
function shouldSwap(card1, card2) {
  let shouldSwap;
  if (!card1.inputEnabled || !card2.inputEnabled){
    console.log(`Inputs on ${card1} and ${card2} disabled`);
    shouldSwap = false // one of the cards is disabled
  }
  else if (myHandGroup.children.includes(card1) && myHand.children.includes(card2)) {// case both in my hand
    console.log(`${card1} and ${card2} both in hand`);
    shouldSwap = true;
  }
  else if (onTableGroup.children.includes(card1) && onTableGroup.children.includes(card2)) {// case both on table
    console.log(`${card1} and ${card2} both on table`);
    shouldSwap = true;
  } else if ( // case one in hand one on table and my turn
    isMyTurn &&
    (myHandGroup.children.includes(card1) && onTableGroup.children.includes(card2)
      || myHandGroup.children.includes(card2) && onTableGroup.children.includes(card1))
  ) {
    console.log(`One on hand, one on table`);
    shouldSwap = true;
  }
  // there should be no other cases. if shouldSwap = undefined, check for logic error
  console.log("shouldSwap: " + shouldSwap);
  return shouldSwap;
}

/**
 * Returns true if a card belonging to some group overlaps with a card from another group
 *
 * @param {sprite} card the card sprite
 * @param {Array<sprite>} newGroup group to check overlap
 * @param {Array<sprite>} oldGroup group currently containing card
 */
function cardGroupOverlap(card, newGroup, oldGroup) {
  let oldIndex = oldGroup.indexOf(card);
  for (let i = 0; i < newGroup.length; i++) {
    if (game.physics.arcade.overlap(newGroup[i], card, swapPosition) && oldIndex != -1) {
      let temp = newGroup[i];
      oldGroup[oldIndex] = temp;
      newGroup[i] = card;
      return true;
    }
  }
}
/**
 * Creates/destroys the sprites that represent the deck based on the current value of deck.length
 */
function makeDeckSprites() {
  let dx = deckSprites.dx;
  let dy = deckSprites.dy;
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
      const cardSprite = game.add.sprite(deckSprites.x - deckSprites.x_offset, game.world.centerY - deckSprites.y_offset, 'cardback');
      cardSprite.anchor.set(0.5);
      cardSprite.scale.set(graphics.CARD_SCALE);
      deckSprites.cards.push(cardSprite);
      deckSprites.x_offset += dx;
      deckSprites.y_offset += dy;
    }
  }
}


function moveTo(sprite, x, y, moveTime, waitTime, game, fadeBool, destroyBool) {
  game.physics.arcade.enable(sprite);
  game.physics.arcade.moveToXY(sprite, x, y, 0, moveTime);
  game.time.events.add(waitTime, function () {
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


function reshuffleAnimation(cards, numToAdd, game, obj) {
  let backs = [];
  cards.forEach(function (c) {
    fadeOut(c, 500);
    let back = game.add.sprite(c.x, c.y, 'cardback');
    back.scale.set(graphics.cardScale);
    back.anchor = new Phaser.Point(0.5, 0.5);
    fadeIn(back, 500);
    backs.push(back);
  });
  setTimeout(function () {
    backs.forEach(function (b) {
      moveTo(b, game.world.centerX, game.world.centerY, 600 / 2, 600 / 2, game, false, false);
    })
  }, 1000 / 2);
  setTimeout(function () {
    for (let i = 0; i < backs.length; i++) {
      let b = backs[i];
      let x = (i < numToAdd) ? 140 : 1500;
      moveTo(b, x, game.world.centerY, 600 * (1 + i) / 2, 600 * (1 + i) / 2, game, false, true);
    }
  }, 3000 / 2);
}


/**
 * Gives easing to movement of card sprite
 */
function snapTo(card, pos) {
  game.add.tween(card).to(pos, 400, Phaser.Easing.Back.Out, true);
}



/**
 * Fades in card sprite
 */
function fadeIn(card, time) {
  card.alpha = 0;
  game.add.tween(card).to({ alpha: 1 }, time, Phaser.Easing.Linear.Out, true, 0, 0, false);
}

/**
 * Fades out card sprite
 */
function fadeOut(card, time) {
  card.alpha = 1;
  game.add.tween(card).to({ alpha: 0 }, time, Phaser.Easing.Linear.Out, true, 0, 0, false);
}

/**
 * Random number between min and max
 * @param {*Number} min
 * @param {*Number} max
 */
function randBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports = {
  makeCard: makeCard,
  makeHand: makeHand,
  drawCards: drawCards,
  cardGroupOverlap: cardGroupOverlap,
  swapPos: swapPosition,
  randBetween: randBetween
}
