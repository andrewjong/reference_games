const
  fs = require('fs'),
  utils = require(__base + 'sharedUtils/sharedUtils.js');

const cardLogic = require(__base + 'cards/card-logic.js');

// This is the function where the server parses and acts on messages
// sent from 'clients' aka the browsers of people playing the
// game. For example, if someone clicks on the map, they send a packet
// to the server (check the client_on_click function in game.client.js)
// with the coordinates of the click, which this function reads and
// applies.
const onMessage = function (client, data) {

  // The eventType is stored in data.eventType
  const eventType = data.eventType;

  // logging for debug
  if (eventType != 'h') {// skip the inactive window message
    console.log('Server received message:');
    for (let attribute in data) {
      const value = data[attribute];
      console.log(`->[${attribute}]: <${typeof value}> ${value}`);
    }
  }

  //Extract important variables
  const gc = client.game;
  const id = gc.id;
  const all = gc.get_active_players();
  const target = gc.get_player(client.userid);
  const others = gc.get_others(client.userid);
  data.score = 0;

  switch (eventType) {
    // initialization from server
    case 'initialized':
      data.state = 'start';
      gc.startingOnTable = data.onTable; // cards the table at the start of the first turn, to detect if players have swapped or not
      gc.biasSuit = cardLogic.getLeastCommonSuit(data.onTable) // rig the game so that the suit not ont he table
      console.log(`bias suit: ${gc.options.SUITS[gc.biasSuit]}`)
      writeData(data, false);
      break;

    // a player swapped two cards
    case 'swapUpdate':
      // only allow to end turn if the table is not the same as before
      let isSameAsOriginal = gc.startingOnTable.every(number => data.onTable.includes(number));
      if (isSameAsOriginal) {
        console.log('endTurnAllowed false')
        target.instance.emit('endTurnAllowed', false);
      } else {
        console.log('endTurnAllowed true')
        target.instance.emit('endTurnAllowed', true);
      }
      // tell everyone else about the swap
      others.forEach(p => {
        console.log("Emitting swapUpdate to player: " + p.id);
        p.player.instance.emit('swapUpdate', { c1: data.c1, c2: data.c2 });
      })
      writeData(data);
      break;

    // a player ended their turn
    case 'endTurn':
      // Determien if end game
      const hasStraight = cardLogic.hasWrappedStraight(data.theirHand, data.myHand);
      const noMoreCards = data.deck.length < gc.options.CARDS_ON_TABLE;
      if (hasStraight) {
        data.score = 100; // won goal, full points
        data.state = 'won'
        console.log('Game won!')
        all.forEach(p => {
          p.player.instance.emit('gameEnd', true);
        });
        target.instance.disconnect();
      } else if (noMoreCards) {
        data.score = 50; // some points for finishing the game
        data.state = 'lost';
        console.log('Game lost.');
        all.forEach(p => {
          p.player.instance.emit('gameEnd', false);
        });
        target.instance.disconnect();
      }
      // game not done yet
      else {
        // reshuffling logic here
        // const reshuffle = cardLogic.reshuffle(gc.reshuffleP, data.onTable, data.deck);
        // bias shuffle with 0.75 return rate and 0.75 bring forward rate
        const reshuffle = cardLogic.biasShuffle(gc.biasSuit, 0.95, 0.75, data.onTable, data.deck);
        data.deck = reshuffle.newDeck;
        data.numReshuffled = reshuffle.n;
        data.state = 'end';
        // give everyone the reshuffle data
        all.forEach(p => {
          console.log("Emitting endTurn to player: " + p.id);
          p.player.instance.emit('endTurn', reshuffle);
        });

      }
      writeData(data);
      gc.turnNum++; // update the server's copy of the turn number

      break;

    // a player is requesting new turn data
    case 'nextTurnRequest':
      /* FIXME:bad coding practice 
      This way of doing things means that each client sends its deck to the server for the server to draw from.
      This isn't very secure in the case that one of the clients' data gets corrupted. It would be better to have
      a single copy of the data sent from the server. Technically the data sent from both clients should be the same,
      but this seems to be bad practice.
      */
      const newOnTable = cardLogic.dealCards(data.deck, gc.options.CARDS_ON_TABLE);
      const newTurn = { deck: data.deck, onTable: newOnTable };
      // only write data for one player, not both
      if (data.isMyTurn) {
        gc.startingOnTable = newOnTable;
        data.state = 'start';
        writeData(Object.assign(data, newTurn));
      }

      console.log("Emitting newTurn to player: " + target.id);
      target.instance.emit('newTurn', newTurn);
      break;

    // a player is typing
    case 'playerTyping':
      _.map(others, function (p) {
        p.player.instance.emit('playerTyping',
          { typing: data.isTyping });
      });
      break;

    // a message was sent
    case 'chatMessage':
      if (client.game.player_count == 2 && !gc.paused) {
        // Update others
        writeData(data);
        _.map(all, function (p) {
          p.player.instance.emit('chatMessage', { user: client.userid, msg: data.message });
        });
      }
      break;
  }

  /**
   * Combines data about the game and the game state, converts the data to generic perspective unless specified otherwise,
   * then writes the data to mongo.
   * @param {Object} data - the data to write
   * @param {boolean} changePerspective - whether data needs to be converted to generic perspective. default true
   */
  function writeData(data, changePerspective = true) {
    // assign common output
    Object.assign(data, {
      assignmentid: client.assignmentid || 'none',
      userid: client.userid || 'none',
      gameid: gc.id,
      epochTime: Date.now(),
      humanTime: Date(),
      turnNum: gc.turnNum + 1, // TODO: add turn number to game state
      reshuffleP: gc.reshuffleP,
      role: client.role
    })
    // convert the data to generic perspective rather than "my" and "their"
    if (changePerspective) setServerPerspective(data);
    // convert cards to human readable format
    data.p1Hand = setHumanReadable(data.p1Hand);
    data.p2Hand = setHumanReadable(data.p2Hand);
    data.onTable = setHumanReadable(data.onTable);
    data.deck = setHumanReadable(data.deck);

    Object.assign(data, { deckSize: data.deck.length });  // deck size is useful

    utils.writeDataToMongo(data);
  }

  /**
   * Converts data with cards state to generic perspective. E.g. myHand, theirHand, isMyTurn becomes p1Hand, p2Hand, p1Turn
   * based on the client's role property.
   * @param {Object} data - the data with cards state
   */
  function setServerPerspective(data) {
    if (data.p1Hand === undefined && data.p2Hand === undefined && data.whoseTurn === undefined) {
      data.whoseTurn = data.isMyTurn ? data.role : (data.role == 'player1' ? 'player2' : 'player1');
      delete data.isMyTurn;

      if (data.role == 'player1') {
        data.p1Hand = data.myHand;
        data.p2Hand = data.theirHand;
      } else if (data.role == 'player2') {
        data.p2Hand = data.myHand;
        data.p1Hand = data.theirHand;
      }
      delete data.myHand;
      delete data.theirHand;
    }
  }
  /**
   * Converts the cards in data to human readable format.
   * @param {Array<Number} cards 
   */
  function setHumanReadable(cards) {
    return cards.map(c => {
      // console.log('c: ' + c)
      let denomination = c % 13;
      // console.log('denomination: ' + denomination);
      const suitVal = Math.trunc(c / 13);
      // console.log('suitVal: ' + suitVal);
      // set royal representation if needed
      denomination = gc.options.ROYALS[denomination] || ++denomination; // ++ to set the correct value, because 1 is 2
      // console.log('denomination: ' + denomination);

      const suit = gc.options.SUITS[suitVal]
      // console.log('suit: ' + suit);
      const cardStr = denomination + suit;
      return cardStr;
    });
  }
};

const setCustomEvents = function (socket) { /*empty. can't delete because compatibility*/ };

module.exports = {
  onMessage: onMessage,
  setCustomEvents: setCustomEvents,
};
