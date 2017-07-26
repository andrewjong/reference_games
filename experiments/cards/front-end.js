// *G*raphic options for sprites and placement
const graphics = {
    GAME_WIDTH: 1000,
    GAME_HEIGHT: 700,
    CARD_WIDTH: 334,
    CARD_HEIGHT: 440,
    CARD_SCALE: 0.3,
    CARD_CELL_WIDTH: 120, // size of a card cell
    ENABLED_TINT: 0xFFFFFF,
    DISABLED_TINT: 0xBEBEBE,
    FADE_IN_TIME: 800,
    DECK_X: 140,
    DECK_PADDING: 100, // vertical padding between deck and description text
    HAND_OFFSET_FROM_CENTER: 200,
    TURN_BAR_HEIGHT: 75,
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
    x: 140,
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

        // Draw hands for this player and that player
        myHandGroup = makeHandGroup(myHand, true);
        console.log("My hand: " + myHandGroup.children);
        theirHandGroup = makeHandGroup(theirHand, false);
        console.log("Their hand: " + theirHandGroup.children);
        onTableGroup = makeOnTableGroup(onTable);
        console.log("On table: " + onTableGroup);

        // text stating how many cards are left in the deck and how many were reshuffled in the previous round
        const counterStyle = { font: '20px Arial', fill: '#FFF', align: 'center' };
        this.cardsLeftText = game.add.text(140, game.world.centerY + graphics.DECK_PADDING, getCounterText(deck.length, 'left'), counterStyle);
        this.cardsAddedText = game.add.text(140, game.world.centerY - graphics.DECK_PADDING, getCounterText(0, 'reshuffled'), counterStyle);
        const counterTexts = [this.cardsLeftText, this.cardsAddedText];
        counterTexts.forEach(function (text) {
            text.setShadow(3, 3, 'rgba(0,0,0,0.5)', 2);
            text.anchor = new Phaser.Point(0.5, 0.5);
        });

        // Text stating whose turn it is
        const bar = game.add.graphics();
        const barWidth = game.world.width;
        const barHeight = graphics.TURN_BAR_HEIGHT;
        const barYOffset = game.world.height - barHeight;
        bar.beginFill('#000', 0.2);
        bar.drawRect(0, barYOffset, barWidth, barHeight);

        const turnTextStyle = { font: 'bold 32px Arial', fill: '#FFF', boundsAlignH: 'center', boundsAlignV: 'middle' };
        this.turnText = game.add.text(0, 0, getTurnText(), turnTextStyle);
        this.turnText.setShadow(3, 3, 'rgba(0,0,0,0.5)', 2);
        this.turnText.setTextBounds(0, barYOffset, barWidth, barHeight);

        // End turn button
        const centerInBar = (barHeight - graphics.TURN_BUTTON_HEIGHT) / 2;
        const horizontalPad = centerInBar;
        this.button = game.add.button(game.world.width - graphics.TURN_BUTTON_WIDTH - horizontalPad,
            game.world.height - graphics.TURN_BUTTON_HEIGHT - centerInBar,
            'end-turn', this.nextTurn, this, 0, 1, 2);

        this.updateEachTurn();
    },
    update: function () {
        /* Stuff in here about sending server information */

    },
    updateEachTurn: function () {
        if (isMyTurn) {
            // Enable the end-turn button
            this.button.setFrames(0, 1, 2);
            this.button.inputEnabled = true;
            // Enable input on the table group
            onTableGroup.children.forEach(enableCard);
            // onTableGroup.children.forEach(c => c.inputEnabled = false);
        } else {
            // Disable the end-turn button
            this.button.setFrames(3, 3, 3);
            this.button.inputEnabled = false;
            // Disable input on the table group
            onTableGroup.children.forEach(disableCard);
        }
        // // update card counters
        // this.cardsLeft = 52 - this.nextCardIndex + this.cardsAdded;
        // this.cardsLeftText.setText(getCounterText(this.cardsLeft, 'left'));
        // this.cardsAddedText.setText(getCounterText(this.cardsAdded, 'added'));

        // update deck to show correct number of cards
        makeDeckSprites();
        // toggle turn settings
        this.turnText.setText(getTurnText());
    },
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
