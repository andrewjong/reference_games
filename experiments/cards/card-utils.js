/**
 * Returns a 3-card array and adds it to the game
 *
 * @param {Array} cards the hand to create sprites from
 * @param {boolean} forMe true if cards are for me, false if for other player
 */
function makeHandGroup(cards, forMe) {
  let yOffset = graphics.HAND_OFFSET_FROM_CENTER; // the offset to place the cards
  if (!forMe) yOffset *= -1; // place on the opposite side if other player

  let handGroup = game.add.group();

  /* Placement */
  // create 1 of each frame in array cards
  handGroup.createMultiple(1, 'cards', cards, true);
  handGroup.children.forEach(card => {
    card.anchor.set(0.5);
    card.scale.set(graphics.CARD_SCALE);
  }); 
  // align this many cards, along 1 row, of width of the card and the card gap
  handGroup.align(cards.length, 1, graphics.CARD_CELL_WIDTH, graphics.CARD_HEIGHT);

  // put the group in the right place
  handGroup.centerX = game.world.centerX;
  handGroup.centerY = game.world.centerY + yOffset;

  /* Effects */
  handGroup.children.forEach(card => {
    // Fade in when created
    fadeIn(card, graphics.FADE_IN_TIME); 
    // Enable dragging
    game.physics.enable(card);
    card.inputEnabled = true;
    card.input.enableDrag();
    card.snapPosition = card.position.clone();
    // card.events.onDragStart.add(/* DRAG FUNCTION */);
    // card.events.onDragStop.add(/* DRAG FUNCTION */);
  });

  return handGroup;
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

/**
 * Returns true if a card belonging to some group overlaps with a card from another group
 *
 * @param {sprite} card the card sprite
 * @param {Array<sprite>} newGroup group to check overlap
 * @param {Array<sprite>} oldGroup group currently containing card
 */
function cardGroupOverlap(card, newGroup, oldGroup, game) {
  let oldIndex = oldGroup.indexOf(card);
  for (let i = 0; i < newGroup.length; i++) {
    if (game.physics.arcade.overlap(newGroup[i], card, swapPos) && oldIndex != -1) {
      let temp = newGroup[i];
      oldGroup[oldIndex] = temp;
      newGroup[i] = card;
      return true;
    }
  }
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
 * Swaps the positions of two card sprites
 */
function swapPos(card1, card2) {
  // animations
  addTint([card1, card2]);
  easeIn(card1, card2.origPos);
  easeIn(card2, card1.origPos);
  setTimeout(function () { removeTint([card1, card2]) }, 700);

  let temp = card1.origPos;
  card1.origPos = card2.origPos;
  card2.origPos = temp;
}

/**
 * Adds tint to a list of card sprites
 */
function addTint(cards) {
  cards.forEach(c => c.tint = 0xBEBEBE);
}

/**
 * Removes tint from a list of card sprites
 */
function removeTint(cards) {
  cards.forEach(c => c.tint = 0xFFFFFF);
}

/**
 * Gives easing to movement of card sprite
 */
function easeIn(card, pos) {
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
  swapPos: swapPos,
  randBetween: randBetween
}
