// *G*raphic options for sprites and placement
const gOptions = {
    gameWidth: 1000,
    gameHeight: 700,
    cardSheetWidth: 334,
    cardSheetHeight: 440,
    cardScale: 0.3,
    cardGap: 120, // horizontal spacing between cards
    deckPadding: 100, // vertical padding between deck and description text
    turnButtonWidth: 188,
    turnButtonHeight: 46
}

let game; // the phaser game instance
let isMyTurn = true; // turn boolean
let myHand, theirHand, deck; // arrays to represent each hand

let playGame = function (game) { }

window.onload = function () {
    game = new Phaser.Game(gOptions.gameWidth, gOptions.gameHeight, Phaser.AUTO, 'viewport');
    game.state.add("PlayGame", playGame)
    game.state.start("PlayGame");
}


playGame.prototype = {
    preload: function () {
        game.load.image('table', 'sprites/felt-background.png');
        game.load.spritesheet('cards', 'sprites/cards.png', gOptions.cardSheetWidth, gOptions.cardSheetHeight);
        game.load.image('cardback', 'sprites/cardback.png', gOptions.cardSheetWidth, gOptions.cardSheetHeight);
        game.load.spritesheet('end-turn', 'sprites/end-turn-button.png', gOptions.turnButtonWidth, gOptions.turnButtonHeight);
        game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
        game.scale.pageAlignHorizontally = true;
        game.scale.pageAlignVertically = true;
    },
    create: function () {
        /* LOGISTICS */

        // Initialize deck of cards as number array
        this.deck = Phaser.ArrayUtils.numberArray(0, 51);
        Phaser.ArrayUtils.shuffle(this.deck); // shuffle the deck
        console.log(this.deck); // print to console for debugging

        /* GRAPHICS */
        // Enable physics for overlap detection later
        game.physics.startSystem(Phaser.Physics.ARCADE); 

        // Table top background
        let tableBackground = game.add.sprite(0, 0, 'table');
        tableBackground.width = gOptions.gameWidth;
        tableBackground.height = gOptions.gameHeight;

        // Group of sprites that will represent the deck of cards
        this.deckSprites = {
            x_offset: 0, // the total current x offset of the top card
            y_offset: 0, // the total current y offset of the top card
            dx: 0.1, // how much to offset x per card
            dy: 0.15, // how much to offset y per card
            cards: [] // contain card sprites
        }

        // Draw hands for this player and that player
        this.myHandSprites = makeHand(0, true, game, this);
        this.theirHandSprites = makeHand(3, false, game, this);
        this.onTableSprites = drawCards(6, 4, game, this);
        this.nextCardIndex = 10;
        this.cardsAdded = 0;
        // log for debug
        console.log(this.myHandSprites);
        console.log(this.theirHandSprites);
        console.log(this.onTableSprites);
        console.log("Next index " + this.nextCardIndex);

        // text stating how many cards are left in the deck and how many were reshuffled in the previous round
        const counterStyle = { font: '20px Arial', fill: '#FFF', align: 'center' };
        this.cardsLeftText = game.add.text(140, game.world.centerY + gOptions.deckPadding, getCounterText(this.cardsLeft, 'left'), counterStyle);
        this.cardsAddedText = game.add.text(140, game.world.centerY - gOptions.deckPadding, getCounterText(this.cardsAdded, 'added'), counterStyle);
        const counterTexts = [this.cardsLeftText, this.cardsAddedText];
        counterTexts.forEach(function (text) {
            text.setShadow(3, 3, 'rgba(0,0,0,0.5)', 2);
            text.anchor = new Phaser.Point(0.5, 0.5);
        });

        // text stating whose turn it is
        const bar = game.add.graphics();
        const barWidth = game.world.width;
        const barHeight = 75;
        const barYOffset = game.world.height - barHeight;
        bar.beginFill('#000', 0.2);
        bar.drawRect(0, barYOffset, barWidth, barHeight);

        const turnTextStyle = { font: 'bold 32px Arial', fill: '#FFF', boundsAlignH: 'center', boundsAlignV: 'middle' };
        this.turnText = game.add.text(0, 0, getTurnText(), turnTextStyle);
        this.turnText.setShadow(3, 3, 'rgba(0,0,0,0.5)', 2);
        this.turnText.setTextBounds(0, barYOffset, barWidth, barHeight);

        // end turn button
        const centerInBar = (barHeight - gOptions.turnButtonHeight) / 2;
        const horizontalPad = centerInBar;
        this.button = game.add.button(game.world.width - gOptions.turnButtonWidth - horizontalPad,
            game.world.height - gOptions.turnButtonHeight - centerInBar,
            'end-turn', this.nextTurn, this, 0, 1, 2);
        this.updateEachTurn();
    },
    update: function () {
        if (!isMyTurn) {
            // set the button to disabled
            this.button.setFrames(3, 3, 3);
            this.button.inputEnabled = false;
            this.onTableSprites.forEach(card => card.inputEnabled = false);
            addTint(this.onTableSprites);
        } else {
            this.button.setFrames(0, 1, 2);
            this.button.inputEnabled = true;
            this.onTableSprites.forEach(card => card.inputEnabled = true);
        }
    },
    updateEachTurn: function () {
        // update card counters
        this.cardsLeft = 52 - this.nextCardIndex + this.cardsAdded;
        this.cardsLeftText.setText(getCounterText(this.cardsLeft, 'left'));
        this.cardsAddedText.setText(getCounterText(this.cardsAdded, 'added'));

        // update deck to show correct number of cards
        let dx = this.deckSprites.dx;
        let dy = this.deckSprites.dy;
        if (this.deckSprites.cards.length > this.cardsLeft) {
            // destroy extra card sprites if present
            for (let i = this.deckSprites.cards.length; i > this.cardsLeft; i--) {
                this.deckSprites.cards.pop().destroy();
                this.deckSprites.x_offset -= dx;
                this.deckSprites.y_offset -= dy;
            }
        }
        else if (this.deckSprites.cards.length < this.cardsLeft) {
            // add extra card sprites if needed
            for (let i = this.deckSprites.cards.length; i < this.cardsLeft; i++) {
                const cardSprite = game.add.sprite(140 - this.deckSprites.x_offset, game.world.centerY - this.deckSprites.y_offset, 'cardback');
                cardSprite.anchor.set(0.5);
                cardSprite.scale.set(gOptions.cardScale);
                this.deckSprites.cards.push(cardSprite);
                this.deckSprites.x_offset += dx;
                this.deckSprites.y_offset += dy;
            }
        }
        // toggle turn settings
        this.turnText.setText(getTurnText());
    },
    startDrag: function (card, pointer) {
        game.world.bringToTop(card);
        card.scale.set(gOptions.cardScale * 1.1);
        // for debugging
        loc = this.myHandSprites.indexOf(card) != -1 ? 'hand' : 'table';
        console.log(loc);
    },
    stopDrag: function (card, pointer) {
        card.scale.set(gOptions.cardScale);
        let shouldSwap = false;
        if (isMyTurn) {
            shouldSwap = cardGroupOverlap(card, this.myHandSprites, this.onTableSprites, game) ||
                cardGroupOverlap(card, this.onTableSprites, this.myHandSprites, game);
        }
        else {
            for (let i = 0; i < this.myHandSprites.length; i++) {
                shouldSwap = shouldSwap || game.physics.arcade.overlap(this.myHandSprites[i], card, swapPos);
            }
        }
        if (!shouldSwap) {
            easeIn(card, card.origPos);
        }
    },
    nextTurn: function () {
        isMyTurn = !isMyTurn;
        // reshuffle cards
        [this.cardsLeft, this.cardsAdded] = reshuffle(0.5, this.onTableSprites, this.deck.slice(this.nextCardIndex, 52));
        this.nextCardIndex += 4;
        reshuffleAnimation(this.onTableSprites, this.cardsAdded, game, this);
        obj = this;
        setTimeout(function () {
            obj.table = drawCards(obj.nextCardIndex, 4, game, obj);
        }, 5000 / 2);
        this.updateEachTurn();
    }
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
