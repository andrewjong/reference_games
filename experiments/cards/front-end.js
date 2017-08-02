// *G*raphic options for sprites and placement
const graphics = {
    GAME_WIDTH: 1000,
    GAME_HEIGHT: 700,
    CARD_WIDTH: 334,
    CARD_HEIGHT: 440,
    CARD_SCALE: 0.3,
    CARD_CELL_WIDTH: 120, // size of a card cell
    ENABLED_TINT: 0xFFFFFF, // color when a card is enabled
    DISABLED_TINT: 0xBEBEBE,
    FADE_IN_TIME: 800,
    DECK_X: 140, // X location of the deck
    DECK_PADDING: 100, // vertical padding between deck and description text
    HAND_OFFSET_FROM_CENTER: 200, // in the y direction, for each player's hand
    TURN_BAR_HEIGHT: 75,
    TURN_BUTTON_WIDTH: 188,
    TURN_BUTTON_HEIGHT: 46
}

const gg = globalGame;

let pgame; // the phaser game instance
let isMyTurn; // turn boolean
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
let turnText;


// This is essentially a state setup function
// It exists due to name compatibility stuff within clientBase.js, because 'drawScreen()' is called in onconnect
// else 
/**
 * Initilaizes Phaser client-side
 * @param data state of the game
 */
function drawScreen(data/*, player*/) { // we don't need the player variable anymore
    console.log('drawScreen called');
    // console.log(`player.my_role: ${player.my_role}`); // this is probably undefined, use the globalGame option instead
    // console.log(`globalGame.my_role: ${globalGame.my_role}`); // we know this is undefined here because roles are only assigned once both connect

    const cards = data.cards;
    console.log('cards in startGame function of front-end.js: ' + JSON.stringify(cards));
    // initialize some temporary empty card representations (these get updated later with onServerUpdate below)
    deck = cards.deck;
    onTable = cards.onTable;
    isMyTurn = null;
    myHand = [];
    theirHand = [];

    startGame();
}

/**
 * Create the phaser game instance
 */
function startGame() {
    console.log('PHASER SIDE');
    console.log('isMyTurn: ' + isMyTurn);
    console.log('myHand: ' + isMyTurn);
    console.log('theirHand: ' + theirHand)

    pgame = new Phaser.Game(graphics.GAME_WIDTH, graphics.GAME_HEIGHT, Phaser.AUTO, 'viewport');
    pgame.state.add("Play", play)
    pgame.state.start("Play");
}

/** 
 * This function handles graphical updates when game.client.js is notified in client_onserverupdate_received .
 * Data sent into Phaser should be prepackaged into 
 * @param cards an object with "myHand", "theirHand", "onTable", "deck" Number arrays and "isMyTurn" boolean.
 */
function updatePhaser(cards) {
    console.log('unparsed cards in updatePhaser function of front-end.js: ' + JSON.stringify(cards));
    // If out of sync, update the local copy
    // // player turn
    // if (isMyTurn != cards.isMyTurn) {
    //     isMyTurn = cards.isMyTurn;
    //     turnText.setText(getTurnText());
    // }
    // // deck
    // if (!_.isEqual(deck, cards.deck)) {
    //     deck = cards.deck.slice();
    //     makeDeckSprites();
    // }
    // The below card groups are in graphical ordering. ie theirHand is on top, onTable in middle, myHand on bottom
    // their hand
    if (!_.isEqual(theirHand, cards.theirHand)) {
        theirHand = cards.theirHand.slice();
        destroyAll(theirHandGroup);
        theirHandGroup = makeHandGroup(theirHand, false);
    }
    // on table
    if (!_.isEqual(onTable, cards.onTable)) {
        onTable = cards.onTable.slice();
        destroyAll(onTableGroup)
        onTableGroup = makeOnTableGroup(onTable);
    }
    // my hand
    if (!_.isEqual(myHand, cards.myHand)) {
        myHand = cards.myHand.slice();
        destroyAll(myHandGroup);
        myHandGroup = makeHandGroup(myHand, true);
    }
    console.log('--Cards after updatePhaser--');
    logCardState();
}

function play(game) { }
play.prototype = {
    preload: function () {
        pgame.load.image('table', 'sprites/felt-background.png');
        pgame.load.spritesheet('cards', 'sprites/cards.png', graphics.CARD_WIDTH, graphics.CARD_HEIGHT);
        pgame.load.image('cardback', 'sprites/cardback.png', graphics.CARD_WIDTH, graphics.CARD_HEIGHT);
        pgame.load.spritesheet('end-turn', 'sprites/end-turn-button.png', graphics.TURN_BUTTON_WIDTH, graphics.TURN_BUTTON_HEIGHT);
        pgame.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
        pgame.scale.pageAlignHorizontally = true;
        pgame.scale.pageAlignVertically = true;
    },
    create: function () {
        console.log('Phaser client instance started');
        /* LOGISTICS */
        // Logistics initialized in game.core.js! 

        /* GRAPHICS */
        // Enable physics for overlap detection later
        pgame.physics.startSystem(Phaser.Physics.ARCADE);

        // Table top background
        let tableBackground = pgame.add.sprite(0, 0, 'table');
        tableBackground.width = graphics.GAME_WIDTH;
        tableBackground.height = graphics.GAME_HEIGHT;

        // Draw hands for this player and that player
        // Note: these groups are NOT Phaser groups. They're js arrays with sprites
        theirHandGroup = makeHandGroup(theirHand, false);
        onTableGroup = makeOnTableGroup(onTable);
        myHandGroup = makeHandGroup(myHand, true);

        // text stating how many cards are left in the deck and how many were reshuffled in the previous round
        const counterStyle = { font: '20px Arial', fill: '#FFF', align: 'center' };
        this.cardsLeftText = pgame.add.text(140, pgame.world.centerY + graphics.DECK_PADDING, getCounterText(deck.length, 'left'), counterStyle);
        this.cardsAddedText = pgame.add.text(140, pgame.world.centerY - graphics.DECK_PADDING, getCounterText(0, 'reshuffled'), counterStyle);
        const counterTexts = [this.cardsLeftText, this.cardsAddedText];
        counterTexts.forEach(function (text) {
            text.setShadow(3, 3, 'rgba(0,0,0,0.5)', 2);
            text.anchor = new Phaser.Point(0.5, 0.5);
        });

        // Text stating whose turn it is
        const bar = pgame.add.graphics();
        const barWidth = pgame.world.width;
        const barHeight = graphics.TURN_BAR_HEIGHT;
        const barYOffset = pgame.world.height - barHeight;
        bar.beginFill('#000', 0.2);
        bar.drawRect(0, barYOffset, barWidth, barHeight);

        const turnTextStyle = { font: 'bold 32px Arial', fill: '#FFF', boundsAlignH: 'center', boundsAlignV: 'middle' };
        turnText = pgame.add.text(0, 0, getTurnText(), turnTextStyle);
        turnText.setShadow(3, 3, 'rgba(0,0,0,0.5)', 2);
        turnText.setTextBounds(0, barYOffset, barWidth, barHeight);

        // End turn button
        const centerInBar = (barHeight - graphics.TURN_BUTTON_HEIGHT) / 2;
        const horizontalPad = centerInBar;
        this.button = pgame.add.button(pgame.world.width - graphics.TURN_BUTTON_WIDTH - horizontalPad,
            pgame.world.height - graphics.TURN_BUTTON_HEIGHT - centerInBar,
            'end-turn', this.endTurn, this, 0, 1, 2);

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
            onTableGroup.forEach(enableCard);
            // onTableGroup.forEach(c => c.inputEnabled = false);
        } else {
            // Disable the end-turn button
            this.button.setFrames(3, 3, 3);
            this.button.inputEnabled = false;
            // Disable input on the table group
            onTableGroup.forEach(disableCard);
        }
        // // update card counters
        // this.cardsLeft = 52 - this.nextCardIndex + this.cardsAdded;
        // this.cardsLeftText.setText(getCounterText(this.cardsLeft, 'left'));
        // this.cardsAddedText.setText(getCounterText(this.cardsAdded, 'added'));

        // update deck to show correct number of cards
        makeDeckSprites();
        // toggle turn settings
        turnText.setText(getTurnText());
    },
    endTurn: function () {
        console.log('TODO: Implement end turn');
        // isMyTurn = !isMyTurn;
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
}
