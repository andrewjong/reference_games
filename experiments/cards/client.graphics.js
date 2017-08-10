/**
 * @file The file in which the graphics (Phaser game instance) is initialized, loaded, and created.
 */

// Graphic options for sprites and placement
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

let phaser; // the phaser game instance. 'phaser' is used instead of the conventional 'game' to prevent confusion with the existing game
let isMyTurn = false; // turn boolean
let deck, myHand, theirHand, onTable; // numerical arrays to represent each hand
let deckSprites = {
    x: 140, // x location
    x_offset: 0, // the total current x offset of the top card
    y_offset: 0, // the total current y offset of the top card
    dx: 0.1, // how much to offset x per card
    dy: 0.15, // how much to offset y per card
    cards: [] // contain card sprites
}
let myHandGroup, theirHandGroup, onTableGroup; // phaser groups for sprites
let turnText; // text that displays whose turn it is
let turnButton; // button to end the turn
let remainingText, reshuffledText; // cards remaining in deck and reshuffled last round

let loaded = false; // state for whether the phaser game is fully loaded (true after create is called)
let pendingUpdate = null; // a var for storing the state before the phaser instance is created

/** 
 * This function handles the initial update when game.client.js is notified in client_onserverupdate_received by 
 * starting Phaser. Data sent into Phaser should be prepackaged into an object with "myHand", "theirHand", "onTable", 
 * "deck" Number arrays and "isMyTurn" boolean.
 * @param cards an object representing the starting state
 */
function startPhaser(cards) {
    console.log("startPhaser called")
    deck = theirHand = onTable = myHand = [];
    if (loaded === false) {
        console.log(`Phaser not yet loaded. Creating a new phaser game instance before handling update`);
        pendingUpdate = cards;
        phaser = new Phaser.Game(graphics.GAME_WIDTH, graphics.GAME_HEIGHT, Phaser.AUTO, 'viewport');
        phaser.state.add('Play', playState);
        phaser.state.start('Play');
    } else {
        console.log("Skipping load-first because loaded is true");
        updatePhaser(cards);
    }
}

/**
 * Update Phaser to match the given card state
 * @param {Array<Number>} cards 
 */
function updatePhaser(cards) {
    console.log('unparsed cards in updatePhaser function of client.graphics.js: ' + JSON.stringify(cards));
    // If out of sync, update the local copy
    // player turn
    if (cards.isMyTurn !== undefined && isMyTurn != cards.isMyTurn) {
        isMyTurn = cards.isMyTurn;
        turnText.setText(getTurnString());
    }
    // deck
    deck = cards.deck;
    makeDeckSprites();
    remainingText.setText(getCounterString(deck.length, 'in deck'));
    // The below card groups are in graphical ordering. ie theirHand is on top, onTable in middle, myHand on bottom
    // their hand
    if (cards.theirHand !== undefined && !_.isEqual(theirHand, cards.theirHand)) {
        destroyAll(theirHandGroup);
        theirHand = cards.theirHand;
        theirHandGroup = makeHandGroup(theirHand, false);
    }
    // on table
    if (cards.onTable !== undefined && !_.isEqual(onTable, cards.onTable)) {
        destroyAll(onTableGroup)
        onTable = cards.onTable;
        onTableGroup = makeOnTableGroup(onTable);
        // TODO: these should be animated
    }
    // my hand
    if (cards.myHand !== undefined && !_.isEqual(myHand, cards.myHand)) {
        destroyAll(myHandGroup);
        myHand = cards.myHand;
        myHandGroup = makeHandGroup(myHand, true);
    }
    // set appropriate enable and disables on sprites
    turnButtonSetEnabled(isMyTurn);
    onTableGroup.forEach(isMyTurn ? enableCard : disableCard);

    console.log('Cards after updatePhaser: ');
    logState();
}

/**
 * Phaser states: init, preload, create
 * @param {Phaser} phaser the phaer game instance
 */
function playState(phaser) { }
playState.prototype = {
    init: function () {
        phaser.stage.disableVisibilityChange = true; // make updates regardless of window focus
        phaser.physics.startSystem(Phaser.Physics.ARCADE);
    },
    preload: function () {
        console.log('Phaser preload called');
        phaser.load.image('table', 'sprites/felt-background.png');
        phaser.load.spritesheet('cards', 'sprites/cards.png', graphics.CARD_WIDTH, graphics.CARD_HEIGHT);
        phaser.load.image('cardback', 'sprites/cardback.png', graphics.CARD_WIDTH, graphics.CARD_HEIGHT);
        phaser.load.spritesheet('end-turn', 'sprites/end-turn-button.png', graphics.TURN_BUTTON_WIDTH, graphics.TURN_BUTTON_HEIGHT);
        phaser.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
        phaser.scale.pageAlignHorizontally = true;
        phaser.scale.pageAlignVertically = true;
    },
    create: function () {
        console.log('Phaser create called');
        // Enable physics for overlap detection later
        phaser.physics.startSystem(Phaser.Physics.ARCADE);

        // Table top background
        let tableBackground = phaser.add.sprite(0, 0, 'table');
        tableBackground.width = graphics.GAME_WIDTH;
        tableBackground.height = graphics.GAME_HEIGHT;

        // text stating how many cards are left in the deck and how many were reshuffled in the previous round
        const counterStyle = { font: '20px Arial', fill: '#FFF', align: 'center' };
        remainingText = phaser.add.text(140, phaser.world.centerY + graphics.DECK_PADDING, '', counterStyle);
        reshuffledText = phaser.add.text(140, phaser.world.centerY - graphics.DECK_PADDING, '', counterStyle);
        [remainingText, reshuffledText].forEach(text => {
            text.setShadow(3, 3, 'rgba(0,0,0,0.5)', 2);
            text.anchor = new Phaser.Point(0.5, 0.5);
        });

        // Text stating whose turn it is
        const bar = phaser.add.graphics();
        const barWidth = phaser.world.width;
        const barHeight = graphics.TURN_BAR_HEIGHT;
        const barYOffset = phaser.world.height - barHeight;
        bar.beginFill('#000', 0.2);
        bar.drawRect(0, barYOffset, barWidth, barHeight);

        const turnTextStyle = { font: 'bold 32px Arial', fill: '#FFF', boundsAlignH: 'center', boundsAlignV: 'middle' };
        turnText = phaser.add.text(0, 0, getTurnString(), turnTextStyle);
        turnText.setShadow(3, 3, 'rgba(0,0,0,0.5)', 2);
        turnText.setTextBounds(0, barYOffset, barWidth, barHeight);

        // End turn button
        const centerInBar = (barHeight - graphics.TURN_BUTTON_HEIGHT) / 2;
        const horizontalPad = centerInBar;
        turnButton = phaser.add.button(phaser.world.width - graphics.TURN_BUTTON_WIDTH - horizontalPad,
            phaser.world.height - graphics.TURN_BUTTON_HEIGHT - centerInBar,
            'end-turn', sendEndTurn, this, 0, 1, 2);

        loaded = true;
        console.log('Phaser client instance loaded');
        if (pendingUpdate != null) {
            console.log('Updating with the pending update');
            updatePhaser(pendingUpdate);
        }
    }
}
