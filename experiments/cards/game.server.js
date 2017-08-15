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

  switch (eventType) {
    // initialization from server
    case 'initialized':
      data.state = 'start';
      writeData(data, false);
      break;

    // player swapped two cards
    case 'swapUpdate':
      others.forEach(p => {
        console.log("Emitting swapUpdate to player: " + p.id);
        p.player.instance.emit('swapUpdate', { c1: data.c1, c2: data.c2 });
      })
      writeData(data);
      break;

    // the player ended their turn
    case 'endTurn':
      // reshuffling logic here
      const reshuffle = cardLogic.reshuffle(gc.reshuffleP, data.onTable, data.deck);
      data.deck = reshuffle.newDeck;
      data.numReshuffled = reshuffle.n;
      data.state = 'end';
      writeData(data);
      // TODO: SOMETHING HERE ABOUT WRITING THE END STATE DATA
      all.forEach(p => {
        console.log("Emitting endTurn to player: " + p.id);
        p.player.instance.emit('endTurn', reshuffle);
      });
      gc.turnNum++;
      break;

    // client is requesting information to start the next turn
    case 'nextTurnRequest':
      // FIXME: I feel uncomfortable about the new draw being done per each client, instead of synced with the server. Technically data should be the same, but seems bad practice
      const newOnTable = cardLogic.dealCards(data.deck, gc.options.CARDS_ON_TABLE);
      const newTurn = { deck: data.deck, onTable: newOnTable };
      // only write for one player, not both
      if (data.isMyTurn) {
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

    // we shouldn't need this below anymore
    // // the client replied with the current game state to write. now we can explicitly call the write function
    // case 'dataToWrite':
    //   // because eventType got replaced with 'dataToWrite', replace eventType with the originating event type
    //   data.eventType = data.origEvent;
    //   delete data.origEvent;
    //   writeData();
  }
  // /**
  //  * Request the client's current state to add to the eventData before writing. This is because the server does
  //  * not store a copy of the client's state - it must ask the client for it. Call this function to write data.
  //  * @param {Object} eventData - an object containing the event data
  //  */
  // function sendWriteRequest(eventData){
  //   // ask the client to attach its current game state to the eventData
  //   const packet = Object.assign({ origEvent: eventType }, eventData);
  //   packet.eventType = 'dataToWrite'; // technically this assignment is optional. but needed if called as sendWriteRequest(data)
  //   target.instance.emit('stateRequest', packet);
  // }

  /**
   * 
   * @param {Object} data 
   * @param {boolean} convertData - whether data needs to be converted to generic perspective. default true
   */
  function writeData(data, convertData=true) {
    // assign common output
    Object.assign(data, {
      assignmentid: gc.assignmentid || 'none',
      workerid: gc.workerid || 'none',
      gameid: gc.id,
      epochTime: Date.now(),
      humanTime: Date(),
      turnNum: gc.turnNum + 1, // TODO: add turn number to game state
      reshuffleP: gc.reshuffleP,
      role: client.role
    })
    // convert the data to generic perspective rather than "my" and "their"
    if (convertData)
      convertCardData(data);
    Object.assign(data, { deckSize: data.deck.length });  // deck size is useful

    utils.writeDataToMongo(data);
  }

  function convertCardData(data) {
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
};

const setCustomEvents = function (socket) { /*empty. can't delete because compatibility*/ };

module.exports = {
  onMessage: onMessage,
  setCustomEvents: setCustomEvents,
  // dataOutput: dataOutput
};
