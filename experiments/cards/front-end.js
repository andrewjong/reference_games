// *G*raphic options for sprites and placement
const graphics = {
    GAME_WIDTH: 1000,
    GAME_HEIGHT: 700,
    CARD_WIDTH: 334,
    CARD_HEIGHT: 440,
    CARD_SCALE: 0.3,
    CARD_CELL_WIDTH: 120, // size of a card cell
    FADE_IN_TIME: 800,
    DECK_PADDING: 100, // vertical padding between deck and description text
    HAND_OFFSET_FROM_CENTER: 200,
    TURN_BUTTON_WIDTH: 188,
    TURN_BUTTON_HEIGHT: 46
}

const gameOptions = {
    CARDS_PER_HAND: 3,
    CARDS_ON_TABLE: 4
}

let game; // the phaser game instance
let isMyTurn = true; // turn boolean
let deck, myHand, theirHand, onTable; // numerical arrays to represent each hand
let deckSprites = {
    x_offset: 0, // the total current x offset of the top card
    y_offset: 0, // the total current y offset of the top card
    dx: 0.1, // how much to offset x per card
    dy: 0.15, // how much to offset y per card
    cards: [] // contain card sprites
}
let myHandGroup, theirHandGroup, onTableGroup; // phaser groups for sprites

window.onload = function () {
    game = new Phaser.Game(graphics.GAME_WIDTH, graphics.GAME_HEIGHT, Phaser.AUTO, 'viewport');
    game.state.add("PlayGame", playGame)
    game.state.start("PlayGame");
}

function playGame(game) { }
playGame.prototype = {
    preload: function () {
        game.load.image('table', 'sprites/felt-background.png');
        game.load.spritesheet('cards', 'sprites/cards.png', graphics.CARD_WIDTH, graphics.CARD_HEIGHT);
        game.load.image('cardback', 'sprites/cardback.png', graphics.CARD_WIDTH, graphics.CARD_HEIGHT);
        game.load.spritesheet('end-turn', 'sprites/end-turn-button.png', graphics.TURN_BUTTON_WIDTH, graphics.TURN_BUTTON_HEIGHT);
        game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
        game.scale.pageAlignHorizontally = true;
        game.scale.pageAlignVertically = true;
    },
    create: function () {
        /* LOGISTICS */

        // TODO: move this initialization stuff to game.core.js
        // Initialize deck of cards as number array
        deck = Phaser.ArrayUtils.numberArray(0, 51);
        Phaser.ArrayUtils.shuffle(deck); // shuffle the deck
        console.log(deck); // print to console for debugging

        myHand = deck.splice(0, gameOptions.CARDS_PER_HAND); // take the top cards
        console.log("My hand: " + myHand);
        theirHand = deck.splice(0, gameOptions.CARDS_PER_HAND);
        console.log("Their hand: " + theirHand);
        onTable = deck.splice(0, gameOptions.CARDS_ON_TABLE);
        console.log("On table: " + onTable);

        /* GRAPHICS */
        // Enable physics for overlap detection later
        game.physics.startSystem(Phaser.Physics.ARCADE);

        // Table top background
        let tableBackground = game.add.sprite(0, 0, 'table');
        tableBackground.width = graphics.GAME_WIDTH;
        tableBackground.height = graphics.GAME_HEIGHT;

        // Group of sprites that will represent the deck of cards
        deckSprites = {
            x_offset: 0, // the total current x offset of the top card
            y_offset: 0, // the total current y offset of the top card
            dx: 0.1, // how much to offset x per card
            dy: 0.15, // how much to offset y per card
            cards: [] // contain card sprites
        }

        // Draw hands for this player and that player
        myHandGroup = makeHandGroup(myHand, true);
        console.log("My hand: " + myHandGroup.children);
        theirHandGroup = makeHandGroup(theirHand, false);
        console.log("Their hand: " + theirHandGroup.children);
        // this.onTableSprites = dealCards(onTable);
        // console.log("On table: " + this.onTableSprites);

        // // text stating how many cards are left in the deck and how many were reshuffled in the previous round
        // const counterStyle = { font: '20px Arial', fill: '#FFF', align: 'center' };
        // this.cardsLeftText = game.add.text(140, game.world.centerY + graphics.DECK_PADDING, getCounterText(this.cardsLeft, 'left'), counterStyle);
        // this.cardsAddedText = game.add.text(140, game.world.centerY - graphics.DECK_PADDING, getCounterText(this.cardsAdded, 'added'), counterStyle);
        // const counterTexts = [this.cardsLeftText, this.cardsAddedText];
        // counterTexts.forEach(function (text) {
        //     text.setShadow(3, 3, 'rgba(0,0,0,0.5)', 2);
        //     text.anchor = new Phaser.Point(0.5, 0.5);
        // });

        // // text stating whose turn it is
        // const bar = game.add.graphics();
        // const barWidth = game.world.width;
        // const barHeight = 75;
        // const barYOffset = game.world.height - barHeight;
        // bar.beginFill('#000', 0.2);
        // bar.drawRect(0, barYOffset, barWidth, barHeight);

        // const turnTextStyle = { font: 'bold 32px Arial', fill: '#FFF', boundsAlignH: 'center', boundsAlignV: 'middle' };
        // this.turnText = game.add.text(0, 0, getTurnText(), turnTextStyle);
        // this.turnText.setShadow(3, 3, 'rgba(0,0,0,0.5)', 2);
        // this.turnText.setTextBounds(0, barYOffset, barWidth, barHeight);

        // // end turn button
        // const centerInBar = (barHeight - graphics.TURN_BUTTON_HEIGHT) / 2;
        // const horizontalPad = centerInBar;
        // this.button = game.add.button(game.world.width - graphics.TURN_BUTTON_WIDTH - horizontalPad,
        //     game.world.height - graphics.TURN_BUTTON_HEIGHT - centerInBar,
        //     'end-turn', this.nextTurn, this, 0, 1, 2);
        // this.updateEachTurn();
    },
    // update: function () {
    //     if (!isMyTurn) {
    //         // set the button to disabled
    //         this.button.setFrames(3, 3, 3);
    //         this.button.inputEnabled = false;
    //         this.onTableSprites.forEach(card => card.inputEnabled = false);
    //         addTint(this.onTableSprites);
    //     } else {
    //         this.button.setFrames(0, 1, 2);
    //         this.button.inputEnabled = true;
    //         this.onTableSprites.forEach(card => card.inputEnabled = true);
    //     }
    // },
    // updateEachTurn: function () {
    //     // update card counters
    //     this.cardsLeft = 52 - this.nextCardIndex + this.cardsAdded;
    //     this.cardsLeftText.setText(getCounterText(this.cardsLeft, 'left'));
    //     this.cardsAddedText.setText(getCounterText(this.cardsAdded, 'added'));

    //     // update deck to show correct number of cards
    //     let dx = this.deckSprites.dx;
    //     let dy = this.deckSprites.dy;
    //     if (this.deckSprites.cards.length > this.cardsLeft) {
    //         // destroy extra card sprites if present
    //         for (let i = this.deckSprites.cards.length; i > this.cardsLeft; i--) {
    //             this.deckSprites.cards.pop().destroy();
    //             this.deckSprites.x_offset -= dx;
    //             this.deckSprites.y_offset -= dy;
    //         }
    //     }
    //     else if (this.deckSprites.cards.length < this.cardsLeft) {
    //         // add extra card sprites if needed
    //         for (let i = this.deckSprites.cards.length; i < this.cardsLeft; i++) {
    //             const cardSprite = game.add.sprite(140 - this.deckSprites.x_offset, game.world.centerY - this.deckSprites.y_offset, 'cardback');
    //             cardSprite.anchor.set(0.5);
    //             cardSprite.scale.set(graphics.CARD_SCALE);
    //             this.deckSprites.cards.push(cardSprite);
    //             this.deckSprites.x_offset += dx;
    //             this.deckSprites.y_offset += dy;
    //         }
    //     }
    //     // toggle turn settings
    //     this.turnText.setText(getTurnText());
    // },
    // startDrag: function (card, pointer) {
    //     game.world.bringToTop(card);
    //     card.scale.set(graphics.CARD_SCALE * 1.1);
    //     // for debugging
    //     loc = this.myHandSprites.indexOf(card) != -1 ? 'hand' : 'table';
    //     console.log(loc);
    // },
    // stopDrag: function (card, pointer) {
    //     card.scale.set(graphics.CARD_SCALE);
    //     let shouldSwap = false;
    //     if (isMyTurn) {
    //         shouldSwap = cardGroupOverlap(card, this.myHandSprites, this.onTableSprites, game) ||
    //             cardGroupOverlap(card, this.onTableSprites, this.myHandSprites, game);
    //     }
    //     else {
    //         for (let i = 0; i < this.myHandSprites.length; i++) {
    //             shouldSwap = shouldSwap || game.physics.arcade.overlap(this.myHandSprites[i], card, swapPos);
    //         }
    //     }
    //     if (!shouldSwap) {
    //         easeIn(card, card.origPos);
    //     }
    // },
    // nextTurn: function () {
    //     isMyTurn = !isMyTurn;
    //     // reshuffle cards
    //     [this.cardsLeft, this.cardsAdded] = reshuffle(0.5, this.onTableSprites, deck.slice(this.nextCardIndex, 52));
    //     this.nextCardIndex += 4;
    //     reshuffleAnimation(this.onTableSprites, this.cardsAdded, game, this);
    //     obj = this;
    //     setTimeout(function () {
    //         obj.table = drawCards(obj.nextCardIndex, 4, game, obj);
    //     }, 5000 / 2);
    //     this.updateEachTurn();
    // }
}

function getTurnText() {
    let isPartner = isMyTurn ? '' : 'partner\'s '
    return 'It\'s your ' + isPartner + 'turn.'
}

function getCounterText(num, counterType) {
    let plural = (num == 1) ? '' : 's';
    let descrip = (counterType == 'left') ? 'left in deck' : 'reshuffled';
    return `${num} card${plural} ${descrip}`;
}
