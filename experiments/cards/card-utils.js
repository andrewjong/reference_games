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
  handGroup.forEach(c => {
    c.y = game.world.centerY + yOffset
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
  let onTableGroup = makeCardGroup(cards);
  // put the group in the right place
  onTableGroup.centerX = game.world.centerX;
  onTableGroup.forEach(c => {
    c.y = game.world.centerY
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
let makeCardGroup = function (cards) {
  /* Note: This function is defined as a variable as it's not meant to be hoisted */
  /* Placement */
  // if (cards === undefined) return []; // case that no cards are available yet, prevent undefined errors
  console.log('cards.length: ' + cards.length);
  let cardGroup = new Array(cards.length);

  let groupWidth = cards.length * graphics.CARD_CELL_WIDTH;
  let startX = game.world.centerX - groupWidth / 2;
  for (let i = 0; i < cardGroup.length; ++i) {
    // add a sprite off the game screen
    let cardSprite = game.add.sprite(-10, -10, 'cards', cards[i]);
    // set the anchor and scale
    cardSprite.anchor.set(0.5);
    cardSprite.scale.set(graphics.CARD_SCALE);
    // put the card in the correct location
    let cardX = startX + i * graphics.CARD_CELL_WIDTH;
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
  card.tint = graphics.DISABLED_TINT;
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
  loc = myHandGroup.indexOf(card) != -1 ? 'hand' : 'table';
  console.log(loc);
}

let stopDrag = function (card, pointer) {
  // Reset the card's scale for the illusion of putting it back down
  card.scale.set(graphics.CARD_SCALE);

  // See if an overlap event and its resulting action occurred
  swappableCards = myHandGroup.concat(onTableGroup);
  console.log("This card: " + card.frame);
  console.log("Swappable cards: " + JSON.stringify(swappableCards.map(a => a.frame)));
  let didOverlap = false;
  swappableCards.some(o => {
    if (!(card === o) && card.overlap(o) && shouldSwap(card, o)) {
      console.log(`Found overlap for ${o.frame}`);
      swapPosition(card, o);
      didOverlap = true;
    }
  })

  console.log("didOverlap: " + didOverlap);
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
    [card1, card2].forEach(c => c.tint = graphics.ENABLED_TINT);
  }, 700);

  // switch the snap positions
  let temp = card1.snapPosition;
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
  myHand = myHandGroup.map(c => c.frame);
  onTable = onTableGroup.map(c => c.frame);
  console.log('Their Hand: ' + theirHand);
  console.log('On Table: ' + onTable);
  console.log('My Hand: ' + myHand);
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

function getTurnText() {
  // TODO: make this dependent on a different variable than isMyTurn. using isMyTurn seems like bad practice
  if (isMyTurn === null) return 'Game has not started yet'; // case game not initialized yet. 
  const isPartner = isMyTurn ? '' : 'partner\'s '
  return 'It\'s your ' + isPartner + 'turn.'
}

function getCounterText(num, counterType) {
  const plural = (num == 1) ? '' : 's';
  const descrip = (counterType == 'left') ? 'left in deck' : 'reshuffled';
  return `${num} card${plural} ${descrip}`;
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
